import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase-server';
import { requireCapability, auditServer } from '@/lib/auth-server';
import { ok, fail, handleRouteError } from '@/lib/api';
import { findInstrument } from '@/lib/market-data';
import { getQuotes } from '@/lib/quote-provider';

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

    // Dealing-desk actions carry no tradeId on open, so they are handled before
    // the demo-trade guard below.
    if (action === 'record-live') return recordLiveTrade(req, adminUser.id, db, updates);
    if (action === 'close-live') return closeLiveTrade(req, adminUser.id, db, tradeId, updates);

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

// ---------------------------------------------------------------------------
// Dealing desk
//
// An operator executes a client's order in the real market, then records the
// fill here. Two rules make this different from the Trade Injector that was
// removed, and neither is optional:
//
//   1. P&L is NEVER accepted. live_trades has no column for it; profit is
//      computed from entry, exit and size. An operator cannot type a number
//      into a client's account.
//
//   2. Every fill carries the broker's execution reference, so a position can
//      be checked against the third party that filled it instead of being
//      taken on trust.
// ---------------------------------------------------------------------------

/**
 * How far a recorded entry price may sit from the market before it is refused.
 *
 * Wide enough to allow spread, slippage and the minutes between execution and
 * data entry; narrow enough to catch a fat-fingered decimal, which is the
 * realistic error. Recording gold at 457.39 instead of 4573.90 would otherwise
 * become an unremovable fact in a client's account.
 */
const ENTRY_PRICE_TOLERANCE = 0.1;

/**
 * Only checked for fills recorded close to when they happened. A trade opened
 * days ago can legitimately sit far from today's price, so comparing it to the
 * current market would reject honest back-entry.
 */
const PRICE_CHECK_WINDOW_MS = 2 * 60 * 60_000;

async function marketPriceCheck(
  symbol: string,
  entryPrice: number,
  openedAtMs: number,
): Promise<string | null> {
  if (Date.now() - openedAtMs > PRICE_CHECK_WINDOW_MS) return null;

  const quotes = await getQuotes().catch(() => null);
  const q = quotes?.find((x) => x.symbol === symbol);
  // No live reference to check against — record it and let the audit trail and
  // the execution reference carry the weight.
  if (!q || q.source === 'simulated') return null;

  const drift = Math.abs(entryPrice - q.mid) / q.mid;
  if (drift > ENTRY_PRICE_TOLERANCE) {
    return `Entry price ${entryPrice} is ${(drift * 100).toFixed(1)}% away from the current ${symbol} market (${q.mid.toFixed(5)}). Check for a typo, or record it once the fill is confirmed.`;
  }
  return null;
}

async function recordLiveTrade(
  req: NextRequest,
  operatorId: string,
  db: NonNullable<ReturnType<typeof getServiceClient>>,
  updates: Record<string, unknown> | undefined,
) {
  const u = updates ?? {};

  const userId = typeof u.userId === 'string' ? u.userId.trim() : '';
  const symbol = typeof u.symbol === 'string' ? u.symbol.trim() : '';
  const side = u.side === 'SELL' ? 'SELL' : u.side === 'BUY' ? 'BUY' : null;
  const executionRef = typeof u.executionRef === 'string' ? u.executionRef.trim() : '';

  const num = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
  };
  const lotSize = num(u.lotSize);
  const margin = num(u.margin);
  const leverage = num(u.leverage);
  const entryPrice = num(u.entryPrice);

  if (!userId) return fail(400, 'Select the client this trade belongs to.');
  if (!side) return fail(400, 'Side must be BUY or SELL.');

  const instrument = findInstrument(symbol);
  if (!instrument) return fail(400, 'Unknown instrument.');

  if (!(lotSize > 0)) return fail(400, 'Lot size must be greater than zero.');
  if (!(margin > 0)) return fail(400, 'Margin must be greater than zero.');
  if (!(leverage >= 1 && leverage <= 500)) return fail(400, 'Leverage must be between 1 and 500.');
  if (!(entryPrice > 0)) return fail(400, 'Enter the price the trade was actually filled at.');

  // Non-negotiable: a real fill has a broker reference. Without one there is
  // nothing to reconcile the client's position against.
  if (executionRef.length < 3 || executionRef.length > 64) {
    return fail(400, "Enter the broker's execution reference for this fill.");
  }

  const openedAtMs = u.openedAt ? Date.parse(String(u.openedAt)) : Date.now();
  if (!Number.isFinite(openedAtMs)) return fail(400, 'Execution time is not a valid date.');
  if (openedAtMs > Date.now() + 60_000) return fail(400, 'Execution time cannot be in the future.');

  const priceProblem = await marketPriceCheck(instrument.symbol, entryPrice, openedAtMs);
  if (priceProblem) return fail(400, priceProblem);

  // Refuse to attach a real-money trade to an account that is not a client in
  // good standing — an unapproved or inactive account should not be trading.
  const { data: client } = await db
    .from('profiles')
    .select('id, role, kyc_status, is_active')
    .eq('id', userId)
    .maybeSingle();

  if (!client) return fail(404, 'That client does not exist.');
  if (client.role !== 'client') return fail(400, 'Trades can only be recorded against client accounts.');
  if (!client.is_active) return fail(400, 'That account is not active.');
  if (client.kyc_status !== 'approved') return fail(400, 'That client is not KYC-approved.');

  const { data, error } = await db
    .from('live_trades')
    .insert({
      user_id: userId,
      symbol: instrument.symbol,
      pair_name: instrument.name,
      side,
      lot_size: lotSize,
      margin,
      leverage,
      entry_price: entryPrice,
      execution_ref: executionRef,
      recorded_by: operatorId,
      status: 'OPEN',
      opened_at: new Date(openedAtMs).toISOString(),
      stop_loss: num(u.stopLoss) > 0 ? num(u.stopLoss) : null,
      take_profit: num(u.takeProfit) > 0 ? num(u.takeProfit) : null,
    })
    .select()
    .single();

  if (error) {
    // The unique index on execution_ref is what stops a double-submitted form
    // from doubling a client's position.
    if (error.code === '23505') {
      return fail(409, 'That execution reference has already been recorded.');
    }
    return fail(500, 'Could not record the trade.');
  }

  await auditServer(req, 'ADMIN_RECORD_LIVE_TRADE', {
    userId: operatorId,
    metadata: { targetUserId: userId, symbol: instrument.symbol, side, lotSize, entryPrice, executionRef },
  });

  return ok({ message: 'Trade recorded against the client account.', trade: data });
}

async function closeLiveTrade(
  req: NextRequest,
  operatorId: string,
  db: NonNullable<ReturnType<typeof getServiceClient>>,
  tradeId: unknown,
  updates: Record<string, unknown> | undefined,
) {
  const u = updates ?? {};
  const id = typeof tradeId === 'string' ? tradeId.trim() : '';
  if (!id) return fail(400, 'Missing trade ID.');

  const exitPrice = Number(u.exitPrice);
  const exitRef = typeof u.exitExecutionRef === 'string' ? u.exitExecutionRef.trim() : '';

  if (!(exitPrice > 0)) return fail(400, 'Enter the price the trade was actually closed at.');
  if (exitRef.length < 3 || exitRef.length > 64) {
    return fail(400, "Enter the broker's execution reference for the closing fill.");
  }

  const { data: trade } = await db
    .from('live_trades')
    .select('id, symbol, status')
    .eq('id', id)
    .maybeSingle();

  if (!trade) return fail(404, 'That trade does not exist.');
  if (trade.status === 'CLOSED') return fail(409, 'That trade is already closed.');

  const priceProblem = await marketPriceCheck(trade.symbol, exitPrice, Date.now());
  if (priceProblem) return fail(400, priceProblem);

  // No pnl is written. There is no column for it: the closing price and size
  // are the facts, and profit is derived from them wherever it is displayed.
  const { error } = await db
    .from('live_trades')
    .update({
      status: 'CLOSED',
      exit_price: exitPrice,
      exit_execution_ref: exitRef,
      closed_by: operatorId,
      closed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'OPEN');

  if (error) return fail(500, 'Could not close the trade.');

  await auditServer(req, 'ADMIN_CLOSE_LIVE_TRADE', {
    userId: operatorId,
    metadata: { tradeId: id, symbol: trade.symbol, exitPrice, exitRef },
  });

  return ok({ message: 'Trade closed.' });
}
