import { validateAadhaarVerhoeff, validatePAN } from './verhoeff';

/**
 * Pull an Aadhaar or PAN number out of OCR text.
 *
 * The point of this is convenience, never verification. OCR misreads digits
 * routinely — 5 for 6, 0 for O, 1 for 7 — and an Aadhaar number carries a
 * Verhoeff check digit precisely because transcription errors are common.
 *
 * So a candidate is only ever returned if it passes the same validation a typed
 * number would. A read that fails the checksum is discarded rather than shown:
 * a wrong number sitting in a field the client assumes was verified is worse
 * than an empty field they know they must fill.
 *
 * The value always lands in an editable input. Nothing here submits anything.
 */

export interface ExtractionResult {
  /** Digits only for Aadhaar, uppercase for PAN. Null when nothing passed validation. */
  value: string | null;
  /** Why a read was rejected, for the client-facing hint. */
  reason?: 'none-found' | 'failed-checksum' | 'ambiguous';
}

/**
 * Aadhaar is 12 digits, usually printed in 4-4-4 groups. OCR often collapses or
 * doubles the spacing, so grouping is normalised away before matching.
 */
export function extractAadhaar(ocrText: string): ExtractionResult {
  if (!ocrText) return { value: null, reason: 'none-found' };

  // Join digits split across whitespace, then find every 12-digit run.
  const flattened = ocrText.replace(/[^\dA-Za-z\n]/g, ' ');
  const candidates = new Set<string>();

  for (const m of flattened.matchAll(/\b(\d[\d\s]{10,20}\d)\b/g)) {
    const digits = m[1].replace(/\D/g, '');
    if (digits.length === 12) candidates.add(digits);
  }
  for (const m of flattened.matchAll(/\b(\d{12})\b/g)) candidates.add(m[1]);

  if (candidates.size === 0) return { value: null, reason: 'none-found' };

  // The checksum is what separates a real Aadhaar from a phone number, a
  // pincode run, or a misread. An Aadhaar also never starts 0 or 1.
  const valid = [...candidates].filter(
    (c) => !/^[01]/.test(c) && validateAadhaarVerhoeff(c),
  );

  if (valid.length === 0) return { value: null, reason: 'failed-checksum' };

  // More than one valid 12-digit number on the same card is not something we
  // should guess at — the client picks.
  if (valid.length > 1) return { value: null, reason: 'ambiguous' };

  return { value: valid[0] };
}

/**
 * PAN is five letters, four digits, one letter. The fourth character encodes
 * holder type and the fifth is the surname initial, which is what makes the
 * pattern specific enough to find reliably in noisy text.
 */
export function extractPan(ocrText: string): ExtractionResult {
  if (!ocrText) return { value: null, reason: 'none-found' };

  const upper = ocrText.toUpperCase().replace(/[^A-Z0-9\n ]/g, ' ');
  const candidates = new Set<string>();

  for (const m of upper.matchAll(/\b([A-Z]{5}\s?\d{4}\s?[A-Z])\b/g)) {
    candidates.add(m[1].replace(/\s/g, ''));
  }

  if (candidates.size === 0) return { value: null, reason: 'none-found' };

  const valid = [...candidates].filter((c) => validatePAN(c));
  if (valid.length === 0) return { value: null, reason: 'failed-checksum' };
  if (valid.length > 1) return { value: null, reason: 'ambiguous' };

  return { value: valid[0] };
}

/** Client-facing explanation. Deliberately never blames the user. */
export function extractionHint(kind: 'Aadhaar' | 'PAN', reason?: string): string {
  switch (reason) {
    case 'failed-checksum':
      return `We could not read the ${kind} number clearly. Please type it below.`;
    case 'ambiguous':
      return `We found more than one number on this image. Please type your ${kind} number below.`;
    default:
      return `Please type your ${kind} number below.`;
  }
}
