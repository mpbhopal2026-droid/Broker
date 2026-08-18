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

    if (action === 'inject') {
      const { userId, symbol, pairName, side, entryPrice, lotSize, margin, leverage, pnl, status } = updates || {};
      if (!userId || !symbol) return fail(400, 'Missing required trade details.');

      const { data, error } = await db.from('demo_trades').insert({
        user_id: userId,
        symbol: symbol,
        pair_name: pairName || symbol,
        side: side || 'BUY',
        entry_price: entryPrice || 2400.00,
        lot_size: lotSize || 0.10,
        margin: margin || 50.00,
        leverage: leverage || 100,
        pnl: pnl || 0.00,
        status: status || 'CLOSED',
        opened_at: new Date().toISOString(),
        closed_at: status === 'CLOSED' ? new Date().toISOString() : null,
      }).select().single();

      if (error) return fail(500, 'Could not inject position.');

      await auditServer(req, 'ADMIN_INJECT_TRADE', {
        userId: adminUser.id,
        metadata: { targetUserId: userId, symbol, pnl },
      });

      return ok({ message: 'Position injected successfully.', trade: data });
    }

    return fail(400, 'Unknown action.');
  } catch (err) {
    return handleRouteError(err);
  }
}
