import { UserRole } from './permissions';
import { bytesToBase64Url, base64UrlToBytes, hmacSign, hmacVerify, randomToken, sha256 } from './crypto';

/**
 * Two-layer session model.
 *
 *  Layer 1 (stateless): a signed cookie carrying {sid, uid, role, exp}. Edge
 *  middleware verifies the HMAC and expiry with no database round-trip, so
 *  route guards stay fast.
 *
 *  Layer 2 (stateful): a `sessions` row keyed by sha256(sid). Route handlers
 *  that touch money, KYC or admin powers call `loadSession()`, which also
 *  confirms the row exists and is not revoked. That is what makes logout,
 *  forced sign-out and revocation actually work — a signature alone cannot be
 *  withdrawn before it expires.
 *
 * Always re-read `role` from the database before authorising an admin action.
 * The role in the cookie is a hint for routing, never an authorisation source.
 */

/**
 * Cookie name is per-deployment. Combined with host-only cookies (no Domain
 * attribute below), a session issued by the client app is neither sent to nor
 * readable by the admin console, and vice versa.
 */
export const SESSION_COOKIE = process.env.APP_ROLE === 'admin' ? 'apex_admin_session' : 'apex_session';
// 30 days. At 12h a client using the platform daily was signed out overnight
// and had to wait for an email code every morning, which pushes people toward
// keeping codes lying around. The compensating control is that sessions are
// revocable server-side: the sessions row is checked on every protected route,
// so an operator (or the client, via revoke-all) can kill one immediately.
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
export const SESSION_ABSOLUTE_TTL_SECONDS = 60 * 60 * 24 * 7; // 7d hard cap

export interface SessionPayload {
  sid: string;
  uid: string;
  role: UserRole;
  iat: number;
  exp: number;
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    // Fail loudly rather than silently signing with a weak/absent key.
    throw new Error('SESSION_SECRET is missing or too short. Generate one with: openssl rand -base64 32');
  }
  return secret;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function encodePayload(payload: SessionPayload): string {
  return bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
}

function decodePayload(encoded: string): SessionPayload | null {
  try {
    const parsed = JSON.parse(decoder.decode(base64UrlToBytes(encoded)));
    if (!parsed?.sid || !parsed?.uid || !parsed?.exp) return null;
    return parsed as SessionPayload;
  } catch {
    return null;
  }
}

/** Mint a new session id + signed cookie value. Persist `sidHash` server-side. */
export async function createSessionCookieValue(
  uid: string,
  role: UserRole
): Promise<{ cookieValue: string; sid: string; sidHash: string; expiresAt: Date }> {
  const sid = randomToken(32);
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = { sid, uid, role, iat: now, exp: now + SESSION_TTL_SECONDS };

  const encoded = encodePayload(payload);
  const signature = await hmacSign(encoded, getSecret());

  return {
    cookieValue: `${encoded}.${signature}`,
    sid,
    sidHash: await sha256(sid),
    expiresAt: new Date(payload.exp * 1000),
  };
}

/**
 * Verify signature + expiry only. Safe for Edge middleware.
 * Does NOT prove the session is un-revoked — use loadSession() for that.
 */
export async function verifySessionCookieValue(cookieValue: string | undefined): Promise<SessionPayload | null> {
  if (!cookieValue) return null;

  const separator = cookieValue.lastIndexOf('.');
  if (separator <= 0) return null;

  const encoded = cookieValue.slice(0, separator);
  const signature = cookieValue.slice(separator + 1);

  let secret: string;
  try {
    secret = getSecret();
  } catch {
    return null;
  }

  if (!(await hmacVerify(encoded, signature, secret))) return null;

  const payload = decodePayload(encoded);
  if (!payload) return null;
  if (payload.exp <= Math.floor(Date.now() / 1000)) return null;

  return payload;
}

export async function hashSid(sid: string): Promise<string> {
  return sha256(sid);
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_TTL_SECONDS,
  // Deliberately NO `domain`. Omitting it makes the cookie host-only, so it is
  // scoped to exactly app.yourdomain.com or admin.yourdomain.com and never
  // shared between them. Setting `domain: '.yourdomain.com'` here would undo
  // the whole point of separating the two deployments.
};
