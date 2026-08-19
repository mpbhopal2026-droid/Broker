import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase-server';
import { requireUser, auditServer } from '@/lib/auth-server';
import { rateLimit } from '@/lib/rate-limit';
import { ok, fail, tooManyRequests, cleanString, handleRouteError } from '@/lib/api';
import { operatorAlerts } from '@/lib/notify';
import { encryptField, maskIdentifier } from '@/lib/field-crypto';
import { verifyUploadedFile, BUCKETS } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DOC_TYPES = ['aadhaar', 'pan', 'passport', 'voter_id', 'driving_license'] as const;
type DocType = (typeof DOC_TYPES)[number];

const DOC_PATTERNS: Record<DocType, RegExp> = {
  pan: /^[A-Z]{5}\d{4}[A-Z]$/,
  aadhaar: /^\d{12}$/,
  passport: /^[A-Z]\d{7}$/,
  voter_id: /^[A-Z]{3}\d{7}$/,
  driving_license: /^[A-Z]{2}\d{2}\s?\d{11}$/,
};

/**
 * Submit KYC for review.
 *
 * kyc_status moves to 'pending' here and can only reach 'approved' through the
 * admin review route — a client cannot self-approve, which was possible before
 * when status lived in localStorage.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const limit = rateLimit(`kyc:${user.id}`, 5, 24 * 60 * 60);
    if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);

    const body = await req.json().catch(() => ({}));
    const documentType = body?.documentType as DocType;
    const documentNumber = cleanString(body?.documentNumber, 40)?.toUpperCase().replace(/\s+/g, '');
    const files: unknown = body?.filePaths;

    if (!DOC_TYPES.includes(documentType)) return fail(400, 'Select a valid document type.');
    if (!documentNumber) return fail(400, 'Enter your document number.');
    if (!DOC_PATTERNS[documentType].test(documentNumber)) {
      return fail(400, `That does not look like a valid ${documentType.replace('_', ' ')} number.`);
    }
    if (!Array.isArray(files) || files.length === 0 || files.length > 4) {
      return fail(400, 'Upload between one and four document images.');
    }

    const filePaths = files
      .map((f) => cleanString(f, 2000))
      .filter((f): f is string => Boolean(f));

    // Every submitted entry must survive cleaning. Dropping the rejects and
    // carrying on means a client can submit two documents, have one silently
    // discarded, and still be told the submission succeeded.
    if (filePaths.length !== files.length) {
      return fail(400, 'One of the uploaded files is invalid.');
    }

    for (const path of filePaths) {
      // The blanket "no ://" rule lived here. It was right when uploads went to
      // Supabase and returned a bare path, but storage now returns a Cloudinary
      // public id — and while it briefly returned a URL, this rule rejected
      // every submission, which is why KYC stopped working entirely.
      //
      // The check it was standing in for — that a client cannot pass off an
      // arbitrary external URL as their identity document — is enforced inside
      // verifyUploadedFile, which accepts only our own Cloudinary cloud and only
      // inside the caller's own folder. One place, not two that can disagree.

      // Unconditional. This previously ran only for paths that already began
      // with the caller's id, so a path pointing at somebody else's folder
      // skipped verification entirely — precisely the case the check exists to
      // catch. verifyUploadedFile enforces ownership itself, and also confirms
      // the object exists and is a readable, non-password-protected JPG/PNG/PDF.
      const verdict = await verifyUploadedFile(BUCKETS.kyc, path, user.id);
      if (!verdict.ok) return fail(400, verdict.error);
    }

    const db = getServiceClient();
    if (!db) return fail(503, 'Not available.');

    if (user.kycStatus === 'approved') {
      return fail(409, 'Your KYC is already approved.');
    }

    const encrypted = await encryptField(documentNumber);

    const { data: record, error } = await db
      .from('kyc_records')
      .insert({
        user_id: user.id,
        document_type: documentType,
        document_number_masked: maskIdentifier(documentNumber),
        document_number_encrypted: encrypted,
        file_paths: filePaths,
        status: 'pending',
      })
      .select('id, submitted_at')
      .single();

    // Fail closed. The previous fallback marked the profile 'pending' anyway,
    // so a client whose document row failed to insert still appeared in the
    // compliance queue with no documents attached to review — an account that
    // could be approved on the strength of a record that does not exist.
    if (error || !record) {
      console.error('[kyc] submit failed:', error);
      return fail(500, 'Could not save your documents. Please try again.');
    }

    const profileUpdates: Record<string, unknown> = { kyc_status: 'pending' };
    if (body.fullName) profileUpdates.full_name = cleanString(body.fullName, 100);
    if (body.bankAccountName) profileUpdates.bank_account_name = cleanString(body.bankAccountName, 100);
    if (body.bankName) profileUpdates.bank_name = cleanString(body.bankName, 100);
    if (body.bankAccountNumber) profileUpdates.bank_account_number = cleanString(body.bankAccountNumber, 50);
    if (body.bankIfsc) profileUpdates.bank_ifsc = cleanString(body.bankIfsc, 20)?.toUpperCase();
    if (body.upiId) profileUpdates.user_upi_id = cleanString(body.upiId, 100);
    if (body.streetAddress) profileUpdates.address = cleanString(body.streetAddress, 255);
    if (body.city) profileUpdates.city = cleanString(body.city, 100);
    if (body.state) profileUpdates.state = cleanString(body.state, 100);
    if (body.postalCode) profileUpdates.postal_code = cleanString(body.postalCode, 20);

    await db.from('profiles').update(profileUpdates).eq('id', user.id);

    await auditServer(req, 'KYC_SUBMITTED', {
      userId: user.id,
      // Never log the document number itself, encrypted or not.
      metadata: { recordId: record?.id, documentType, encryptedAtRest: Boolean(encrypted) },
    });

    // The applicant is now blocked from everything until someone reviews this,
    // so the queue arriving silently is what turns a two-minute check into a
    // three-day wait.
    operatorAlerts.kycSubmitted(user.fullName || user.email, documentType);

    return ok({
      recordId: record?.id,
      message: 'Documents submitted. Our compliance desk will review them shortly.',
      warning: encrypted ? undefined : 'KYC_ENCRYPTION_KEY is not set — the document number was stored unencrypted.',
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
