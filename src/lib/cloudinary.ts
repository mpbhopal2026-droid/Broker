import 'server-only';
import crypto from 'crypto';
import { log } from './logger';

export const CLOUDINARY_CONFIG = {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'hoy61f72',
  apiKey: process.env.CLOUDINARY_API_KEY || '292762116366424',
  apiSecret: process.env.CLOUDINARY_API_SECRET || 'xlCJeVwcYlAqZ0_3rL2v4HpOkBI',
};

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
}): Promise<{ ok: true; url: string; publicId: string; secureUrl: string } | { ok: false; error: string }> {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const targetFolder = `${params.folder}/${params.userId}`;

    // Prepare parameters for signature
    const signParams: Record<string, string | number> = {
      folder: targetFolder,
      timestamp,
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
  if (publicId.startsWith('http://') || publicId.startsWith('https://')) {
    return publicId;
  }
  return `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/image/upload/${publicId}`;
}
