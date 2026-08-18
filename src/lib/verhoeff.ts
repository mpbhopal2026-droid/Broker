/**
 * Verhoeff Algorithm for Aadhaar Number Validation & Checksum Calculation.
 *
 * UIDAI uses the Verhoeff mathematical algorithm (base-10 check digit scheme)
 * to detect all single-digit errors and all transposition errors between
 * adjacent digits in 12-digit Aadhaar numbers.
 */

// Multiplication table (d)
const d: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

// Permutation table (p)
const p: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

// Inverse table (inv)
const inv: number[] = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

/**
 * Validates whether a 12-digit string satisfies UIDAI's Verhoeff checksum.
 */
export function validateAadhaarVerhoeff(aadhaar: string): boolean {
  if (!aadhaar) return false;
  const cleaned = aadhaar.replace(/\s+/g, '').trim();

  // Must be exactly 12 digits
  if (!/^\d{12}$/.test(cleaned)) return false;

  // Cannot start with 0 or 1 (UIDAI specifications)
  if (cleaned[0] === '0' || cleaned[0] === '1') return false;

  // Reject obvious repeated dummy patterns (e.g., 222222222222, 123456789012)
  if (/^(\d)\1{11}$/.test(cleaned)) return false;

  let c = 0;
  const reversed = cleaned.split('').reverse().map(Number);

  for (let i = 0; i < reversed.length; i++) {
    c = d[c][p[i % 8][reversed[i]]];
  }

  return c === 0;
}

/**
 * Formats a raw 12-digit string into 4-digit grouped Aadhaar format: XXXX XXXX XXXX
 */
export function formatAadhaar(aadhaar: string): string {
  const digits = aadhaar.replace(/\D/g, '').slice(0, 12);
  const parts = [];
  for (let i = 0; i < digits.length; i += 4) {
    parts.push(digits.slice(i, i + 4));
  }
  return parts.join(' ');
}

/**
 * Validates Indian Bank IFSC Code format: ^[A-Z]{4}0[A-Z0-9]{6}$
 */
export function validateIFSC(ifsc: string): boolean {
  if (!ifsc) return false;
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.trim().toUpperCase());
}

/**
 * Known major Indian bank codes mapping for real-time branch preview.
 */
export const MAJOR_BANKS: Record<string, string> = {
  HDFC: 'HDFC Bank Ltd',
  SBIN: 'State Bank of India',
  ICIC: 'ICICI Bank Ltd',
  UTIB: 'Axis Bank Ltd',
  KKBK: 'Kotak Mahindra Bank',
  PUNB: 'Punjab National Bank',
  BARB: 'Bank of Baroda',
  CNRB: 'Canara Bank',
  UBIN: 'Union Bank of India',
  INDB: 'IndusInd Bank',
  YESB: 'Yes Bank Ltd',
  IDFB: 'IDFC FIRST Bank',
};

/**
 * Validates Indian Income Tax PAN Card format: ^[A-Z]{5}[0-9]{4}[A-Z]{1}$
 */
export function validatePAN(pan: string): boolean {
  if (!pan) return false;
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.trim().toUpperCase());
}

/**
 * Returns estimated bank name from the first 4 characters of an IFSC code.
 */
export function getBankNameFromIFSC(ifsc: string): string | null {
  if (!ifsc || ifsc.length < 4) return null;
  const prefix = ifsc.slice(0, 4).toUpperCase();
  return MAJOR_BANKS[prefix] || null;
}
