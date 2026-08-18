/**
 * Content-based file validation.
 *
 * The MIME type the browser reports (`file.type`) comes from the client and is
 * trivially spoofable — renaming `payload.exe` to `.png` sets it to
 * `image/png`. Real validation reads the bytes.
 *
 * Runs in both the browser (fast feedback before upload) and on the server
 * (authoritative, after upload, before a path is accepted into a KYC record).
 */

export interface FileValidationResult {
  ok: boolean;
  error?: string;
  detectedType?: 'pdf' | 'png' | 'jpeg' | 'webp';
}

/** Below this, the file is almost certainly blank, truncated or a placeholder. */
const MIN_BYTES = 1024;
const MAX_BYTES = 5 * 1024 * 1024;

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((byte, i) => bytes[offset + i] === byte);
}

/** Identify by magic bytes, ignoring whatever the client claimed. */
export function detectFileType(bytes: Uint8Array): FileValidationResult['detectedType'] | null {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'pdf';                    // %PDF-
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'jpeg';
  // RIFF....WEBP
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return 'webp';
  return null;
}

/**
 * Is this PDF encrypted / password-protected?
 *
 * An encrypted PDF carries an `/Encrypt` entry in its trailer dictionary. That
 * covers both cases that matter here:
 *
 *   - Open password: the reviewer literally cannot open it.
 *   - Owner password (very common on bank statements and Aadhaar PDFs, which
 *     ship locked to a DOB or the last digits of a number): the file opens but
 *     is restricted, and many viewers refuse to extract or print it.
 *
 * Either way a KYC reviewer cannot reliably read it, so it is rejected at
 * upload with an instruction the user can act on — far better than a rejection
 * days later.
 *
 * Scans the whole buffer rather than just the tail: linearised PDFs and
 * incremental updates move the trailer around.
 */
export function isEncryptedPdf(bytes: Uint8Array): boolean {
  const needle = [0x2f, 0x45, 0x6e, 0x63, 0x72, 0x79, 0x70, 0x74]; // "/Encrypt"

  for (let i = 0; i <= bytes.length - needle.length; i++) {
    if (bytes[i] !== needle[0]) continue;
    let matched = true;
    for (let j = 1; j < needle.length; j++) {
      if (bytes[i + j] !== needle[j]) {
        matched = false;
        break;
      }
    }
    if (matched) return true;
  }
  return false;
}

/**
 * Validate a file's actual content.
 * `claimedType` is only used to report a mismatch — it never gates the result.
 */
export function validateFileBytes(
  bytes: Uint8Array,
  totalSize: number,
  claimedType?: string
): FileValidationResult {
  if (totalSize > MAX_BYTES) {
    return { ok: false, error: `File is too large (${(totalSize / 1024 / 1024).toFixed(1)}MB). Maximum is 5MB.` };
  }
  if (totalSize < MIN_BYTES) {
    return { ok: false, error: 'That file looks empty or damaged. Please upload a clear photo or scan.' };
  }

  const detected = detectFileType(bytes);

  if (!detected) {
    return {
      ok: false,
      error: 'Unsupported file. Please upload a JPG, PNG, WebP or PDF.',
    };
  }

  if (detected === 'pdf' && isEncryptedPdf(bytes)) {
    return {
      ok: false,
      error:
        'This PDF is password-protected, so our team cannot open it. Please remove the password and upload again — ' +
        'open it in your PDF reader, enter the password, then use Print → Save as PDF to create an unlocked copy.',
      detectedType: detected,
    };
  }

  // A mismatch is worth surfacing but not blocking: some phones report
  // image/jpg or an empty type for perfectly valid files.
  if (claimedType) {
    const expected: Record<string, string[]> = {
      pdf: ['application/pdf'],
      png: ['image/png'],
      jpeg: ['image/jpeg', 'image/jpg'],
      webp: ['image/webp'],
    };
    if (claimedType && !expected[detected]?.includes(claimedType)) {
      return {
        ok: false,
        error: `That file is actually a ${detected.toUpperCase()}, not what its name suggests. Please upload the original file.`,
        detectedType: detected,
      };
    }
  }

  return { ok: true, detectedType: detected };
}

/** Bytes needed for a reliable verdict. /Encrypt can sit anywhere, so read it all. */
export const VALIDATION_READ_BYTES = MAX_BYTES;
