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

    if (action === 'update') {
      const { error } = await db
        .from('demo_trades')
        .update({
          ...(updates?.stopLoss !== undefined ? { stop_loss: updates.stopLoss } : {}),
          ...(updates?.takeProfit !== undefined ? { take_profit: updates.takeProfit } : {}),
          ...(updates?.margin !== undefined ? { margin: updates.margin } : {}),
          ...(updates?.leverage !== undefined ? { leverage: updates.leverage } : {}),
        })
        .eq('id', tradeId);

      if (error) return fail(500, 'Could not update position.');

      await auditServer(req, 'ADMIN_UPDATE_TRADE', {
        userId: adminUser.id,
        metadata: { tradeId, updates },
      });

      return ok({ message: 'Position updated successfully.' });
    }

    return fail(400, 'Unknown action.');
  } catch (err) {
    return handleRouteError(err);
  }
}
