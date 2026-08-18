/**
 * Runtime-agnostic crypto helpers.
 *
 * Everything here uses Web Crypto (globalThis.crypto), which is available in
 * BOTH the Next.js Edge runtime (middleware) and the Node runtime (route
 * handlers). Do not swap these for node:crypto — middleware would break.
 */

const encoder = new TextEncoder();

// ---------------------------------------------------------------------------
// base64url (no padding) — used for tokens and signatures
// ---------------------------------------------------------------------------

export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  // Allocate the ArrayBuffer explicitly so the result is typed as
  // Uint8Array<ArrayBuffer>, which is what BufferSource requires.
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ---------------------------------------------------------------------------
// Random
// ---------------------------------------------------------------------------

/** Cryptographically secure random token. Use this for anything security-bearing. */
export function randomToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

/** Cryptographically secure numeric OTP. Rejection-sampled to avoid modulo bias. */
export function randomNumericCode(digits = 6): string {
  const max = 10 ** digits;
  const limit = Math.floor(0xffffffff / max) * max;
  const buf = new Uint32Array(1);
  let value: number;
  do {
    crypto.getRandomValues(buf);
    value = buf[0];
  } while (value >= limit);
  return String(value % max).padStart(digits, '0');
}

export function randomUUID(): string {
  return crypto.randomUUID();
}

// ---------------------------------------------------------------------------
// Hashing & signing
// ---------------------------------------------------------------------------

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return bytesToBase64Url(new Uint8Array(digest));
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function hmacSign(payload: string, secret: string): Promise<string> {
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return bytesToBase64Url(new Uint8Array(sig));
}

export async function hmacVerify(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    const key = await hmacKey(secret);
    return await crypto.subtle.verify('HMAC', key, base64UrlToBytes(signature), encoder.encode(payload));
  } catch {
    return false;
  }
}

/** Length-independent comparison for non-CryptoKey secrets (OTP hashes, tokens). */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ---------------------------------------------------------------------------
// Output encoding
// ---------------------------------------------------------------------------

/**
 * Escape a value for safe interpolation into an HTML email body.
 * Every user- or admin-supplied string in a template MUST pass through this.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
