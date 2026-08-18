import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/auth-server';
import { ok, fail, handleRouteError } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Audit trail, admin only. Read-only: the table rejects UPDATE and DELETE. */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const db = getServiceClient();
    if (!db) return fail(503, 'Not available.');

    const requested = Number(req.nextUrl.searchParams.get('limit'));
    const limit = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), 500) : 200;

    const { data, error } = await db
      .from('audit_logs')
      .select('id, event_type, user_id, ip_address, user_agent, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return fail(500, 'Could not load audit logs.');

    // Resolve actors to names. A trail reading "9f3c1a2e-… approved withdrawal"
    // is not usable evidence — the reader has to look up every id by hand, and
    // in practice nobody does, so nobody reads the log. One extra query beats a
    // join here because audit_logs deliberately has no FK cascade behaviour we
    // want to depend on, and a deleted user must still resolve to something.
    const actorIds = Array.from(
      new Set((data ?? []).map((r) => r.user_id).filter((id): id is string => Boolean(id))),
    );

    const actors = new Map<string, { name: string; email: string; role: string }>();
    if (actorIds.length > 0) {
      const { data: people } = await db
        .from('profiles')
        .select('id, full_name, email, role')
        .in('id', actorIds);

      for (const p of people ?? []) {
        actors.set(p.id, { name: p.full_name, email: p.email, role: p.role });
      }
    }

    return ok({
      logs: (data ?? []).map((row) => {
        const actor = row.user_id ? actors.get(row.user_id) : undefined;
        return {
          id: row.id,
          eventType: row.event_type,
          userId: row.user_id ?? undefined,
          // 'System' for unattributed events; 'Deleted account' when the id no
          // longer resolves — never a bare uuid, and never silently blank,
          // because "who did this" is the question the log exists to answer.
          actorName: row.user_id ? (actor?.name ?? 'Deleted account') : 'System',
          actorEmail: actor?.email,
          actorRole: actor?.role,
          ipAddress: row.ip_address ?? 'unknown',
          userAgent: row.user_agent ?? 'unknown',
          metadata: row.metadata ?? {},
          timestamp: row.created_at,
        };
      }),
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
