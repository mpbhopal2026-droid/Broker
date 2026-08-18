import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { getServiceClient } from '@/lib/supabase-server';
import { auditServer } from '@/lib/auth-server';
import { SESSION_COOKIE, verifySessionCookieValue, hashSid } from '@/lib/session';
import { ok, handleRouteError } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Revoke the current session server-side, then clear the cookie.
 *
 * Clearing the cookie alone is not logout — the signed value stays valid until
 * expiry, so anyone who captured it could keep using it. Marking `revoked_at`
 * is what actually ends the session.
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await verifySessionCookieValue(cookies().get(SESSION_COOKIE)?.value);
    const db = getServiceClient();

    if (payload && db) {
      await db
        .from('sessions')
        .update({ revoked_at: new Date().toISOString() })
        .eq('sid_hash', await hashSid(payload.sid))
        .is('revoked_at', null);

      await auditServer(req, 'AUTH_LOGOUT', { userId: payload.uid });
    }

    cookies().delete(SESSION_COOKIE);
    return ok({ message: 'Signed out.' });
  } catch (err) {
    return handleRouteError(err);
  }
}
