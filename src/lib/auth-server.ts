import 'server-only';

import { cookies } from 'next/headers';
import { getServiceClient } from './supabase-server';
import { SESSION_COOKIE, verifySessionCookieValue, hashSid } from './session';
import { clientIp } from './rate-limit';
import { UserRole, Capability, can, isOperationsRole } from './permissions';

export interface AuthedUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  kycStatus: string;
  isActive: boolean;
  emailVerified: boolean;
  walletBalance: number;
  sid: string;
}

const KNOWN_ROLES: UserRole[] = ['client', 'staff', 'admin', 'developer'];

/** Anything unrecognised degrades to the least-privileged role. */
function normaliseRole(value: unknown): UserRole {
  return KNOWN_ROLES.includes(value as UserRole) ? (value as UserRole) : 'client';
}

/**
 * Full session resolution: verifies the cookie signature, confirms the session
 * row is live, then re-reads role/status from `profiles`.
 *
 * Role and balance always come from the database, never from the cookie — a
 * cookie is attacker-visible input even when signed, and a signed-but-stale
 * role would survive a demotion until expiry.
 */
export async function loadSession(): Promise<AuthedUser | null> {
  const payload = await verifySessionCookieValue(cookies().get(SESSION_COOKIE)?.value);
  if (!payload) return null;

  const db = getServiceClient();
  if (!db) return null;

  const sidHash = await hashSid(payload.sid);

  const { data: session, error: sessionError } = await db
    .from('sessions')
    .select('id, user_id, revoked_at, expires_at')
    .eq('sid_hash', sidHash)
    .maybeSingle();

  if (sessionError || !session || session.revoked_at || new Date(session.expires_at).getTime() <= Date.now()) {
    try { cookies().delete(SESSION_COOKIE); } catch {}
    return null;
  }

  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('id, email, full_name, role, kyc_status, is_active, email_verified, wallet_balance')
    .eq('id', session.user_id)
    .maybeSingle();

  if (profileError || !profile || profile.is_active === false) {
    try { cookies().delete(SESSION_COOKIE); } catch {}
    return null;
  }

  // Touch last-seen; failure here must not break the request.
  db.from('sessions')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', session.id)
    .then(undefined, () => {});

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role: normaliseRole(profile.role),
    kycStatus: profile.kyc_status,
    isActive: profile.is_active !== false,
    emailVerified: profile.email_verified === true,
    walletBalance: Number(profile.wallet_balance || 0),
    sid: payload.sid,
  };
}

/** Throwing guards for route handlers. */
export class AuthError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function requireUser(): Promise<AuthedUser> {
  const user = await loadSession();
  if (!user) throw new AuthError(401, 'Authentication required');
  return user;
}

export async function requireAdmin(): Promise<AuthedUser> {
  const user = await requireUser();
  if (user.role !== 'admin') throw new AuthError(403, 'Administrator privileges required');
  return user;
}

/**
 * Capability-based guard. Prefer this over role checks at call sites — it keeps
 * the policy in one table instead of scattering `role === 'admin'` comparisons
 * that then have to be found and updated when a role is added.
 */
export async function requireCapability(capability: Capability): Promise<AuthedUser> {
  const user = await requireUser();
  if (!can(user.role, capability)) {
    throw new AuthError(403, 'You do not have permission to do that.');
  }
  return user;
}

/** Any operations role (staff, admin, developer) — used to gate the ops console. */
export async function requireOperations(): Promise<AuthedUser> {
  const user = await requireUser();
  if (!isOperationsRole(user.role) || user.role === 'client') {
    throw new AuthError(403, 'Operations access required');
  }
  return user;
}

// ---------------------------------------------------------------------------
// Server-side audit trail
// ---------------------------------------------------------------------------

/**
 * Append-only audit write. Uses the real request IP, not a hardcoded string,
 * and lands in Postgres where the client cannot edit it.
 * Never throws — an audit failure must not take down the action being audited,
 * but it is logged so the gap is visible.
 */
export async function auditServer(
  req: Request,
  eventType: string,
  opts: { userId?: string | null; metadata?: Record<string, unknown> } = {}
): Promise<void> {
  const db = getServiceClient();
  if (!db) return;

  try {
    await db.from('audit_logs').insert({
      event_type: eventType,
      user_id: opts.userId ?? null,
      ip_address: clientIp(req),
      user_agent: req.headers.get('user-agent') || 'unknown',
      metadata: opts.metadata ?? {},
    });
  } catch (err) {
    console.error(`[audit] failed to record ${eventType}:`, err);
  }
}
