import 'server-only';

import { bytesToBase64Url, base64UrlToBytes } from './crypto';

/**
 * Application-level encryption for identity numbers (PAN, Aadhaar).
 *
 * Database-level encryption at rest does not help here: anyone with read
 * access to the table sees plaintext. Encrypting the field means a leaked
 * dump, a mis-scoped RLS policy or a curious operator yields ciphertext.
 *
 * Aadhaar in particular is regulated beyond DPDP — storing full numbers should
 * be avoided entirely where a masked/last-4 form or an Aadhaar Vault reference
 * will do. This exists so that when a full number must be held, it is not held
 * in the clear.
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function getKey(): Promise<CryptoKey | null> {
  const raw = process.env.KYC_ENCRYPTION_KEY;
  if (!raw) return null;

  const keyBytes = base64UrlToBytes(raw);
  if (keyBytes.length !== 32) {
    console.error('[field-crypto] KYC_ENCRYPTION_KEY must decode to 32 bytes (AES-256).');
    return null;
  }

  return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

/** Returns base64url(iv || ciphertext), or null if no key is configured. */
export async function encryptField(plaintext: string): Promise<string | null> {
  const key = await getKey();
  if (!key) return null;

  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(plaintext))
  );

  const combined = new Uint8Array(iv.length + ciphertext.length);
  combined.set(iv, 0);
  combined.set(ciphertext, iv.length);

  return bytesToBase64Url(combined);
}

export async function decryptField(encoded: string): Promise<string | null> {
  const key = await getKey();
  if (!key) return null;

  try {
    const combined = base64UrlToBytes(encoded);
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return decoder.decode(plaintext);
  } catch (err) {
    console.error('[field-crypto] decrypt failed:', err);
    return null;
  }
}

/** 'ABCPS1234F' -> 'XXXXXX1234'. Safe to store and display. */
export function maskIdentifier(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 4) return 'X'.repeat(trimmed.length);
  return 'X'.repeat(trimmed.length - 4) + trimmed.slice(-4);
}
