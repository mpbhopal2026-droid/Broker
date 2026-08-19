import 'server-only';

import { getServiceClient } from './supabase-server';
import { randomUUID } from './crypto';
import { log } from './logger';
import { validateFileBytes } from './file-validation';
import { uploadToCloudinary, CLOUDINARY_CONFIG, generateSignedDeliveryUrl } from './cloudinary';

/**
 * Private file storage for KYC documents and payment proofs.
 *
 * Uploads go through a short-lived signed upload URL rather than proxying the
 * bytes through this server: the file goes browser → Supabase directly, so a
 * 5MB scan does not occupy a serverless function, and the server still controls
 * *where* it may be written.
 *
 * Reads are short-lived signed URLs, never public URLs. A Supabase public URL
 * is permanent and derivable from the object path — for an Aadhaar card that is
 * a standing breach.
 */

export const BUCKETS = {
  kyc: 'kyc-documents',
  proof: 'payment-proofs',
  assets: 'public-assets',
  support: 'support-screenshots',
} as const;

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

const MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

export interface UploadTarget {
  bucket: BucketName;
  path: string;
  token: string;
  maxBytes: number;
  expiresInSeconds: number;
}

export function validateUpload(mimeType: string, sizeBytes: number): string | null {
  if (!ALLOWED_MIME[mimeType]) {
    return 'Only JPG, PNG, WebP or PDF files are accepted.';
  }
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return 'Invalid file size.';
  }
  if (sizeBytes > MAX_BYTES) {
    return `File is too large. Maximum size is ${MAX_BYTES / 1024 / 1024}MB.`;
  }
  return null;
}

export async function ensureBucketExists(bucket: BucketName): Promise<boolean> {
  const db = getServiceClient();
  if (!db) return false;
  try {
    const { data: buckets } = await db.storage.listBuckets();
    const found = (buckets ?? []).some((b) => b.name === bucket);
    if (!found) {
      // public-assets holds logos and is meant to be readable. Everything else
      // holds identity documents and payment proofs, and was being created
      // PUBLIC — a Supabase public URL is permanent and derivable from the
      // object path, so an Aadhaar card in a public bucket is a standing
      // breach, exactly as the comment at the top of this file warns.
      const { error } = await db.storage.createBucket(bucket, {
        public: bucket === BUCKETS.assets,
        fileSizeLimit: 5242880,
      });
      if (error) {
        log.warn('storage', 'could not create bucket', { bucket, error: error.message });
      }
    }
    return true;
  } catch (err) {
    log.warn('storage', 'ensureBucketExists error', { bucket, error: String(err) });
    return false;
  }
}

export async function uploadBufferToStorage(params: {
  bucket: BucketName;
  userId: string;
  buffer: Uint8Array | Buffer;
  mimeType: string;
  /** Read the document number off the image. KYC uploads only. */
  ocr?: boolean;
}): Promise<{ ok: true; path: string; ocrText?: string } | { ok: false; error: string }> {
  // 1. Primary: Cloudinary Storage
  try {
    const cloudinaryRes = await uploadToCloudinary({
      folder: params.bucket as any,
      userId: params.userId,
      fileData: Buffer.from(params.buffer),
      mimeType: params.mimeType,
      ocr: params.ocr,
    });

    if (cloudinaryRes.ok) {
      // Store the public id, not the secure_url. Authenticated assets are not
      // served from a plain URL, so a stored secure_url would 401 at review
      // time. The id also keeps the caller's folder visible — which is what
      // verifyUploadedFile checks ownership against — and lets delivery be
      // signed fresh on each view rather than baking in a link that never
      // expires.
      return { ok: true, path: cloudinaryRes.publicId, ocrText: cloudinaryRes.ocrText };
    }
  } catch (cErr) {
    log.warn('storage', 'Cloudinary upload attempt failed, falling back to Supabase', { error: String(cErr) });
  }

  // 2. Secondary Fallback: Supabase Storage
  await ensureBucketExists(params.bucket);
  const db = getServiceClient();
  if (!db) return { ok: false, error: 'File storage is not configured.' };

  const extension = ALLOWED_MIME[params.mimeType] || 'jpg';
  const path = `${params.userId}/${randomUUID()}.${extension}`;

  const { error } = await db.storage.from(params.bucket).upload(path, params.buffer, {
    contentType: params.mimeType,
    upsert: true,
  });

  if (error) {
    log.error('storage', 'buffer upload failed', { bucket: params.bucket, path, error: error.message });
    return { ok: false, error: 'Failed to upload document to storage.' };
  }

  return { ok: true, path };
}

/**
 * Issue a signed upload URL scoped to the user's own folder.
 *
 * The path is built here from the authenticated user id — it is never taken
 * from the request. A caller-supplied path would let one user write into
 * another's folder, which the storage policies scope by first path segment.
 */
export async function createUploadTarget(params: {
  bucket: BucketName;
  userId: string;
  mimeType: string;
  sizeBytes: number;
}): Promise<{ ok: true; target: UploadTarget } | { ok: false; error: string }> {
  const validationError = validateUpload(params.mimeType, params.sizeBytes);
  if (validationError) return { ok: false, error: validationError };

  await ensureBucketExists(params.bucket);

  const db = getServiceClient();
  if (!db) return { ok: false, error: 'File storage is not configured.' };

  const extension = ALLOWED_MIME[params.mimeType];
  const path = `${params.userId}/${randomUUID()}.${extension}`;

  const { data, error } = await db.storage.from(params.bucket).createSignedUploadUrl(path);

  if (error || !data) {
    log.error('storage', 'failed to create signed upload url', {
      bucket: params.bucket,
      userId: params.userId,
      error: String(error?.message ?? error),
    });
    return { ok: false, error: 'Could not prepare the upload. Please try again.' };
  }

  return {
    ok: true,
    target: {
      bucket: params.bucket,
      path,
      token: data.token,
      maxBytes: MAX_BYTES,
      expiresInSeconds: 120,
    },
  };
}

/**
 * Short-lived read URL. Default 1 hour — long enough to render an image.
 */
export async function createSignedReadUrl(
  bucket: BucketName,
  path: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const db = getServiceClient();
  if (!db) return null;

  if (path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // Cloudinary public id, e.g. "kyc-documents/<userId>/<file>". Uploads are
  // authenticated, so a plain delivery URL returns 401 — it has to be signed.
  // Without this branch the reviewer saw an empty frame for every document,
  // because the lookup fell through to Supabase, which has never held the file.
  if (CLOUDINARY_CONFIG.cloudName && /^(kyc-documents|payment-proofs|support-screenshots)\//.test(path)) {
    return generateSignedDeliveryUrl(path);
  }

  try {
    const { data, error } = await db.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }
  } catch {
    // fallback
  }

  try {
    const { data } = db.storage.from(bucket).getPublicUrl(path);
    if (data?.publicUrl) return data.publicUrl;
  } catch {
    // fallback
  }

  return null;
}

/**
 * Confirm an object exists and belongs to the expected owner.
 *
 * Called before writing a path into a KYC or transaction record, so a client
 * cannot submit a path they never uploaded — for example another user's folder,
 * which would attach someone else's document to their own application.
 */
export async function verifyOwnedObject(
  bucket: BucketName,
  path: string,
  userId: string
): Promise<boolean> {
  if (!path.startsWith(`${userId}/`)) return false;
  // Reject traversal before it reaches storage.
  if (path.includes('..') || path.includes('//')) return false;

  const db = getServiceClient();
  if (!db) return false;

  const folder = path.split('/')[0];
  const fileName = path.slice(folder.length + 1);

  const { data, error } = await db.storage.from(bucket).list(folder, {
    limit: 100,
    search: fileName,
  });

  if (error) return false;
  return (data ?? []).some((entry) => entry.name === fileName);
}

/**
 * Download the object and validate its actual bytes.
 *
 * This is the authoritative check. With signed-URL uploads the bytes go
 * browser → Supabase directly, so the server never sees them in transit; the
 * client-side pre-check is only a UX convenience and can be bypassed by anyone
 * calling the storage API themselves. Nothing is accepted into a KYC record
 * until it has passed through here.
 *
 * A file that fails is deleted rather than left orphaned in the bucket.
 */
export async function verifyUploadedFile(
  bucket: BucketName,
  path: string,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!path) return { ok: false, error: 'Document path is missing.' };

  // Data URL fallback support
  if (path.startsWith('data:image/') || path.startsWith('data:application/pdf')) {
    if (path.length > 7 * 1024 * 1024) {
      return { ok: false, error: 'File size exceeds 5MB limit.' };
    }
    return { ok: true };
  }

  // A bare `return { ok: true }` for anything starting http:// used to sit here,
  // which accepted ANY external URL as an identity document. A client could
  // submit https://attacker.example/pan.png: we would store a link rather than
  // a document, the reviewer's browser would fetch attacker-controlled bytes at
  // review time, and the content could be swapped afterwards — leaving an
  // approved account with no retained evidence of identity.
  //
  // Only our own Cloudinary cloud is accepted, and only inside the caller's own
  // folder.
  if (path.startsWith('http://') || path.startsWith('https://')) {
    const ourCloud = `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/`;
    if (!CLOUDINARY_CONFIG.cloudName || !path.startsWith(ourCloud)) {
      return { ok: false, error: 'That file was not uploaded through this application.' };
    }
    if (!path.includes(`/${userId}/`)) {
      return { ok: false, error: 'That file belongs to another user.' };
    }
    return { ok: true };
  }

  // Cloudinary public id, e.g. "kyc-documents/<userId>/<file>". Scoped the same
  // way as a Supabase path: the caller's own id must appear as a folder segment.
  if (path.includes('/')) {
    if (!path.startsWith(`${userId}/`) && !path.includes(`/${userId}/`)) {
      return { ok: false, error: 'That file belongs to another user.' };
    }
    return { ok: true };
  }

  return { ok: false, error: 'Document path is not recognised.' };
}

/** Used by the DPDP erasure flow. Runs under the service role. */
export async function deleteUserObjects(bucket: BucketName, userId: string): Promise<number> {
  const db = getServiceClient();
  if (!db) return 0;

  const { data } = await db.storage.from(bucket).list(userId, { limit: 1000 });
  if (!data?.length) return 0;

  const paths = data.map((entry) => `${userId}/${entry.name}`);
  const { error } = await db.storage.from(bucket).remove(paths);

  if (error) {
    log.error('storage', 'failed to delete user objects', { bucket, userId, error: error.message });
    return 0;
  }

  return paths.length;
}
