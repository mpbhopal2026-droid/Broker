import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase-server';
import { loadSession, requireUser } from '@/lib/auth-server';
import { ok, fail, cleanString, handleRouteError } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** List notifications for the signed-in user, with the unread count. */
export async function GET(req: NextRequest) {
  try {
    const user = await loadSession();
    if (!user) {
      return ok({ notifications: [], unreadCount: 0 });
    }
    const db = getServiceClient();
    if (!db) return fail(503, 'Not available.');

    const unreadOnly = req.nextUrl.searchParams.get('unread') === 'true';
    const requested = Number(req.nextUrl.searchParams.get('limit'));
    const limit = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), 100) : 50;

    let query = db
      .from('notifications')
      .select('id, type, title, body, link, priority, read_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) query = query.is('read_at', null);

    const [{ data, error }, { count }] = await Promise.all([
      query,
      db
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('read_at', null),
    ]);

    if (error) return fail(500, 'Could not load notifications.');

    return ok({
      notifications: (data ?? []).map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        link: n.link,
        priority: n.priority,
        read: Boolean(n.read_at),
        createdAt: n.created_at,
      })),
      unreadCount: count ?? 0,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

/**
 * Mark one notification read, or all of them.
 *
 * Scoped to the caller's own rows — without the user_id filter, any id would
 * be markable by anyone who guessed it.
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const db = getServiceClient();
    if (!db) return fail(503, 'Not available.');

    const body = await req.json().catch(() => ({}));
    const now = new Date().toISOString();

    if (body?.action === 'read_all') {
      const { count } = await db
        .from('notifications')
        .update({ read_at: now }, { count: 'exact' })
        .eq('user_id', user.id)
        .is('read_at', null);

      return ok({ message: 'All notifications marked read.', updated: count ?? 0 });
    }

    const id = cleanString(body?.id, 64);
    if (!id) return fail(400, 'A notification id or action is required.');

    const { data, error } = await db
      .from('notifications')
      .update({ read_at: now })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id')
      .maybeSingle();

    if (error) return fail(500, 'Could not update the notification.');
    if (!data) return fail(404, 'No such notification.');

    return ok({ message: 'Marked read.' });
  } catch (err) {
    return handleRouteError(err);
  }
}
