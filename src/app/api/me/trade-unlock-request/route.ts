import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth-server';
import { getServiceClient } from '@/lib/supabase-server';
import { ok, fail, handleRouteError } from '@/lib/api';
import { notifyOperatorsBestEffort } from '@/lib/notify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const db = getServiceClient();
    if (!db) return fail(503, 'Database unavailable.');

    const body = await req.json().catch(() => ({}));
    const symbol = body?.symbol || 'ALL';

    // 1. Notify all operators & dealing desk in real-time
    notifyOperatorsBestEffort({
      type: 'system',
      priority: 'high',
      title: '🚀 Live Trade Unlock Requested',
      body: `${user.fullName || user.email} (${user.role.toUpperCase()}) requested live trading clearance for ${symbol}.`,
      link: '/admin/users',
    });

    // 2. Insert audit log / unlock request record
    try {
      await db.from('audit_logs').insert({
        actor_id: user.id,
        actor_role: user.role,
        action: 'trade_unlock_requested',
        target_type: 'user',
        target_id: user.id,
        metadata: { symbol, requestedAt: new Date().toISOString() },
      });
    } catch {
      // Non-blocking
    }

    return ok({
      success: true,
      message: 'Trade unlock request sent to Admin & Dealing Desk. Our officers are reviewing your account.',
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
