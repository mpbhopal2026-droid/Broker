import { NextRequest } from 'next/server';
import { requireUser, requireCapability, auditServer } from '@/lib/auth-server';
import { rateLimit } from '@/lib/rate-limit';
import { ok, fail, tooManyRequests, cleanString, handleRouteError } from '@/lib/api';
import { BUCKETS, createUploadTarget, createSignedReadUrl, uploadBufferToStorage } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PURPOSE_TO_BUCKET = {
  kyc: BUCKETS.kyc,
  proof: BUCKETS.proof,
  support: BUCKETS.support,
} as const;

/**
 * Handle document uploads:
 * 1. Direct multipart form-data upload (safest & bypasses browser CORS).
 * 2. Signed upload URL target generation for direct Supabase uploads.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const limit = rateLimit(`upload:${user.id}`, 60, 60 * 60);
    if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);

    const contentType = req.headers.get('content-type') || '';

    // Direct Multipart Form Data Upload
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData().catch(() => null);
      if (!formData) return fail(400, 'Invalid form data.');

      const file = formData.get('file') as File | null;
      const purpose = (formData.get('purpose') as keyof typeof PURPOSE_TO_BUCKET) || 'kyc';

      if (!file) return fail(400, 'No file provided.');
      if (!purpose || !(purpose in PURPOSE_TO_BUCKET)) {
        return fail(400, 'purpose must be "kyc", "proof" or "support".');
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await uploadBufferToStorage({
        bucket: PURPOSE_TO_BUCKET[purpose],
        userId: user.id,
        buffer,
        mimeType: file.type || 'image/jpeg',
      });

      if (!result.ok) {
        return fail(500, result.error);
      }

      await auditServer(req, 'FILE_UPLOADED_DIRECT', {
        userId: user.id,
        metadata: { purpose, path: result.path, sizeBytes: file.size },
      });

      return ok({ path: result.path, ok: true });
    }

    // JSON upload target or direct base64 data URL
    const body = await req.json().catch(() => ({}));
    const purpose = body?.purpose as keyof typeof PURPOSE_TO_BUCKET;
    const mimeType = cleanString(body?.mimeType, 100);
    const sizeBytes = Number(body?.sizeBytes);
    const dataUrl = body?.dataUrl as string | undefined;

    if (!purpose || !(purpose in PURPOSE_TO_BUCKET)) {
      return fail(400, 'purpose must be "kyc", "proof" or "support".');
    }

    if (dataUrl && dataUrl.startsWith('data:')) {
      const base64Data = dataUrl.split(',')[1];
      const detectedMime = dataUrl.split(';')[0].replace('data:', '');
      const buffer = Buffer.from(base64Data, 'base64');

      const result = await uploadBufferToStorage({
        bucket: PURPOSE_TO_BUCKET[purpose],
        userId: user.id,
        buffer,
        mimeType: detectedMime || 'image/jpeg',
      });

      if (!result.ok) {
        return fail(500, result.error);
      }

      return ok({ path: result.path, ok: true });
    }

    if (!mimeType) return fail(400, 'mimeType is required.');

    const result = await createUploadTarget({
      bucket: PURPOSE_TO_BUCKET[purpose],
      userId: user.id,
      mimeType,
      sizeBytes,
    });

    if (!result.ok) return fail(400, result.error);

    await auditServer(req, 'FILE_UPLOAD_AUTHORISED', {
      userId: user.id,
      metadata: { purpose, mimeType, sizeBytes, path: result.target.path },
    });

    return ok({ upload: result.target });
  } catch (err) {
    return handleRouteError(err);
  }
}

/**
 * Exchange a stored path for a short-lived view URL.
 *
 * Owners can view their own files. Reviewers need the 'kyc:review' capability —
 * checked here rather than relying on the storage policy alone, so a staff
 * account cannot enumerate arbitrary buckets through this endpoint.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();

    const purpose = req.nextUrl.searchParams.get('purpose') as keyof typeof PURPOSE_TO_BUCKET;
    const path = req.nextUrl.searchParams.get('path');

    if (!purpose || !(purpose in PURPOSE_TO_BUCKET)) return fail(400, 'Invalid purpose.');
    if (!path || path.includes('..') || path.includes('//')) return fail(400, 'Invalid path.');

    const isOwner = path.startsWith(`${user.id}/`);

    if (!isOwner) {
      // Not your file — you need review rights. requireCapability throws 403.
      await requireCapability('kyc:review');
      await auditServer(req, 'FILE_VIEWED_BY_REVIEWER', {
        userId: user.id,
        metadata: { purpose, path },
      });
    }

    const url = await createSignedReadUrl(PURPOSE_TO_BUCKET[purpose], path, 300);
    if (!url) return fail(404, 'File not found.');

    return ok({ url, expiresInSeconds: 300 });
  } catch (err) {
    return handleRouteError(err);
  }
}
