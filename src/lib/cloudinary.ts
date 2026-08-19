import 'server-only';
import crypto from 'crypto';
import { log } from './logger';

/**
 * Credentials come from the environment ONLY.
 *
 * These were hardcoded as fallbacks, and the file is committed to a public
 * repository — so the API secret was published. Anyone holding it can upload
 * to, transform, or delete anything in the account. A fallback that leaks a
 * live secret is worse than no fallback: it turns a missing-config error into
 * a silent compromise.
 *
 * Missing config now fails closed. An upload that cannot happen is a bug the
 * client reports in a minute; an upload to an account strangers control is one
 * nobody notices.
 */
export const CLOUDINARY_CONFIG = {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  apiKey: process.env.CLOUDINARY_API_KEY || '',
  apiSecret: process.env.CLOUDINARY_API_SECRET || '',
};

export const isCloudinaryConfigured = Boolean(
  CLOUDINARY_CONFIG.cloudName && CLOUDINARY_CONFIG.apiKey && CLOUDINARY_CONFIG.apiSecret,
);

export const CLOUDINARY_FOLDERS = {
  kyc: 'kyc-documents',
  proof: 'payment-proofs',
  support: 'support-screenshots',
  assets: 'public-assets',
} as const;

export type CloudinaryFolder = (typeof CLOUDINARY_FOLDERS)[keyof typeof CLOUDINARY_FOLDERS];

/**
 * Generate a cryptographic SHA-1 signature for Cloudinary API requests.
 */
export function generateCloudinarySignature(params: Record<string, string | number>): string {
  const sortedKeys = Object.keys(params).sort();
  const serialized = sortedKeys.map((k) => `${k}=${params[k]}`).join('&');
  const toSign = `${serialized}${CLOUDINARY_CONFIG.apiSecret}`;
  return crypto.createHash('sha1').update(toSign).digest('hex');
}

/**
 * Upload a file buffer or base64 data URL to Cloudinary.
 */
export async function uploadToCloudinary(params: {
  folder: CloudinaryFolder;
  userId: string;
  fileData: string | Buffer; // base64 data URL, remote URL, or Buffer
  mimeType?: string;
  isPrivate?: boolean;
  /** Ask Cloudinary to OCR the image and return the text it found. */
  ocr?: boolean;
}): Promise<{ ok: true; url: string; publicId: string; secureUrl: string; ocrText?: string } | { ok: false; error: string }> {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const targetFolder = `${params.folder}/${params.userId}`;

    // Prepare parameters for signature
    // 'authenticated' means Cloudinary will not serve this asset from a plain
    // URL — delivery requires a signature. Without it every upload is public
    // forever: a PAN card and an Aadhaar sitting at a permanent, unauthenticated
    // URL. Under the DPDP Act that is close to the worst place an identity
    // document can be, and it cannot be undone once the URL has been shared.
    //
    // public-assets stays public deliberately — that folder holds logos.
    const isPrivate = params.isPrivate !== false && params.folder !== 'public-assets';

    const signParams: Record<string, string | number> = {
      folder: targetFolder,
      timestamp,
      ...(isPrivate ? { type: 'authenticated' } : {}),
    };

    const signature = generateCloudinarySignature(signParams);

    // Convert Buffer to data URI if necessary
    let filePayload: string;
    if (Buffer.isBuffer(params.fileData)) {
      const mime = params.mimeType || 'image/jpeg';
      filePayload = `data:${mime};base64,${params.fileData.toString('base64')}`;
    } else {
      filePayload = params.fileData;
    }

    const formData = new URLSearchParams();
    formData.append('file', filePayload);
    formData.append('api_key', CLOUDINARY_CONFIG.apiKey);
    formData.append('timestamp', String(timestamp));
    formData.append('folder', targetFolder);
    if (isPrivate) formData.append('type', 'authenticated');
    // adv_ocr is a paid Cloudinary add-on. Requested unsigned so that an
    // account without it still uploads successfully — the document is what
    // matters; reading the number off it is a convenience.
    if (params.ocr) formData.append('ocr', 'adv_ocr');
    formData.append('signature', signature);

    const uploadEndpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/auto/upload`;

    const res = await fetch(uploadEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || data?.error) {
      log.error('cloudinary', 'upload failed', { error: data?.error });
      return { ok: false, error: data?.error?.message || 'Cloudinary upload failed.' };
    }

    return {
      ok: true,
      url: data.url,
      secureUrl: data.secure_url,
      publicId: data.public_id,
      // Present only when the adv_ocr add-on is enabled on the account. Absent
      // is normal and not an error — the document uploaded either way.
      ocrText: data?.info?.ocr?.adv_ocr?.data?.[0]?.textAnnotations?.[0]?.description,
    };
  } catch (err: any) {
    log.error('cloudinary', 'upload exception', { error: String(err) });
    return { ok: false, error: err?.message || 'Failed to upload document to Cloudinary.' };
  }
}

/**
 * Generate a signed delivery URL for private documents.
 */
export function generateSignedDeliveryUrl(publicId: string): string {
  // Already a full URL — a legacy public upload from before assets were made
  // authenticated. Returned as-is so old records still render, but see the
  // migration note in supabase/ROTATE-CLOUDINARY.txt: these remain public and
  // should be re-uploaded.
  if (publicId.startsWith('http://') || publicId.startsWith('https://')) {
    return publicId;
  }

  if (!isCloudinaryConfigured) return '';

  // This function did not sign anything. It built a plain /image/upload/ URL,
  // which for an authenticated asset returns 401 and for a public one hands the
  // document to anyone with the link. Both are wrong, and the name said
  // otherwise — which is how it survived review.
  //
  // Cloudinary signed delivery: sha1(public_id + api_secret), base64url, first
  // 8 characters, inserted as s--SIG--.
  const toSign = `${publicId}${CLOUDINARY_CONFIG.apiSecret}`;
  const signature = crypto
    .createHash('sha1')
    .update(toSign)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .slice(0, 8);

  return `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/image/authenticated/s--${signature}--/${publicId}`;
}
