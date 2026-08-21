import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase-server';
import { requireCapability, auditServer } from '@/lib/auth-server';
import { ok, fail, handleRouteError } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireCapability('client:view');
    const db = getServiceClient();
    if (!db) return fail(503, 'Database unavailable.');

    const userId = req.nextUrl.searchParams.get('userId');
    let query = db.from('demo_trades').select('*').order('opened_at', { ascending: false }).limit(200);
    if (userId) query = query.eq('user_id', userId);

    const { data, error } = await query;
    if (error) return fail(500, 'Could not fetch trades.');

    return ok({ trades: data ?? [] });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminUser = await requireCapability('client:edit');
    const db = getServiceClient();
    if (!db) return fail(503, 'Database unavailable.');

    const body = await req.json().catch(() => ({}));
    const { action, tradeId, updates } = body;

    if (!tradeId) return fail(400, 'Missing trade ID.');

    if (action === 'close') {
      const { error } = await db
        .from('demo_trades')
        .update({ status: 'CLOSED', closed_at: new Date().toISOString() })
        .eq('id', tradeId);

      if (error) return fail(500, 'Could not close position.');

      await auditServer(req, 'ADMIN_CLOSE_TRADE', {
        userId: adminUser.id,
        metadata: { tradeId },
      });

      return ok({ message: 'Position closed by administrator.' });
    }

    // The 'inject' action was REMOVED and must not come back.
    //
    // It let an operator write a position into a client's portfolio with an
    // arbitrary entry price and an arbitrary profit — `pnl` was taken straight
    // from the request body and stored, never derived from a price. The admin
    // UI shipped with a $150.00 profit and a 2418.50 entry pre-filled in the
    // form. There is no reading of that feature that is not fabrication.
    //
    // If a dealing desk is needed, where an operator records trades they really
    // executed in the market, the shape is different in one non-negotiable way:
    // P&L is COMPUTED from entry and exit prices, never accepted as input, and
    // the record carries the broker's execution reference so the fill can be
    // checked against a third party. An operator must never be able to type a
    // number into a client's account.
    return fail(400, 'Unknown action.');
  } catch (err) {
    return handleRouteError(err);
  }
}
