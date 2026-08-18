import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase-server';
import { requireUser } from '@/lib/auth-server';
import { ok, fail, handleRouteError } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The signed-in user's own sessions, for the security page.
 *
 * Returns no session identifiers — not even hashed. The page needs to show
 * "where am I signed in", which IP, device and timestamps answer; handing the
 * browser anything session-identifying would create a token to steal for no
 * benefit. Revocation works by id-less "revoke all" instead.
 */
export async function GET(_req: NextRequest) {
  try {
    const user = await requireUser();
    const db = getServiceClient();
    if (!db) return fail(503, 'Not available.');

    const { data, error } = await db
      .from('sessions')
      .select('id, ip_address, user_agent, created_at, last_seen_at, expires_at, revoked_at')
      .eq('user_id', user.id)
      .order('last_seen_at', { ascending: false })
      .limit(50);

    if (error) return fail(500, 'Could not load your sessions.');

    const now = Date.now();

    return ok({
      sessions: (data ?? []).map((s) => ({
        id: s.id,
        ipAddress: s.ip_address ?? 'unknown',
        device: describeDevice(s.user_agent ?? ''),
        userAgent: s.user_agent ?? 'unknown',
        createdAt: s.created_at,
        lastSeenAt: s.last_seen_at,
        active: !s.revoked_at && new Date(s.expires_at).getTime() > now,
      })),
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

/** Best-effort, readable device label. Purely cosmetic. */
function describeDevice(ua: string): string {
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /Chrome\//.test(ua)
      ? 'Chrome'
      : /Safari\//.test(ua)
        ? 'Safari'
        : /Firefox\//.test(ua)
          ? 'Firefox'
          : 'Browser';

  const platform = /Android/.test(ua)
    ? 'Android'
    : /iPhone|iPad|iOS/.test(ua)
      ? 'iOS'
      : /Windows/.test(ua)
        ? 'Windows'
        : /Mac OS/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : 'Unknown device';

  return `${browser} on ${platform}`;
}
