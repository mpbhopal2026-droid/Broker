import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { getServiceClient } from '@/lib/supabase-server';
import { requireUser, auditServer } from '@/lib/auth-server';
import { SESSION_COOKIE } from '@/lib/session';
import { ok, fail, handleRouteError } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** "Sign out all devices" — the action offered in the new-login alert email. */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const db = getServiceClient();
    if (!db) return fail(503, 'Not available.');

    const { count } = await db
      .from('sessions')
      .update({ revoked_at: new Date().toISOString() }, { count: 'exact' })
      .eq('user_id', user.id)
      .is('revoked_at', null);

    await auditServer(req, 'AUTH_ALL_SESSIONS_REVOKED', {
      userId: user.id,
      metadata: { revokedCount: count ?? 0 },
    });

    cookies().delete(SESSION_COOKIE);
    return ok({ message: 'All sessions signed out.', revoked: count ?? 0 });
  } catch (err) {
    return handleRouteError(err);
  }
}
