import { NextRequest } from 'next/server';
import { requireUser, auditServer } from '@/lib/auth-server';
import { rateLimit } from '@/lib/rate-limit';
import { ok, fail, tooManyRequests, cleanString, handleRouteError } from '@/lib/api';
import { openDemoPosition, closeDemoPosition } from '@/lib/demo-engine';
import { isEnabled } from '@/lib/feature-flags';
import { getQuotes } from '@/lib/quote-provider';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIN_MARGIN = 1;
const MAX_MARGIN = 100_000;
const ALLOWED_LEVERAGE = [1, 2, 5, 10, 20, 50, 100, 200];

/**
 * Open or close a DEMO position.
 *
 * Nothing here can affect a real balance: the engine only ever touches
 * `demo_balance` and `demo_trades`. Prices come from the simulator, and the
 * response says so explicitly so the UI cannot present a demo fill as real.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const allowed = await isEnabled('demo_account_enabled', user.id);
    if (!allowed) {
      return fail(403, 'Demo trading is currently disabled.');
    }

    const limit = rateLimit(`demo:trade:${user.id}`, 120, 60 * 60);
    if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);

    // Warms the live price cache the engine prices against.
    //
    // The engine is synchronous and reads the last real mid recorded by
    // getQuotes(). On serverless this request may land on an instance that has
    // never served /api/quotes, whose cache is therefore empty — so the fill
    // would silently drop to simulation while the client's chart shows the real
    // market. Awaiting here guarantees a real mid on this instance. It is cheap:
    // the underlying fetches are cached, so it is usually a cache read.
    await getQuotes().catch(() => {
      // Feed unreachable. The engine falls back to simulation on its own.
    });

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (action === 'close') {
      const tradeId = cleanString(body?.tradeId, 64);
      if (!tradeId) return fail(400, 'tradeId is required.');

      const result = await closeDemoPosition(user.id, tradeId);
      if (!result.ok) return fail(400, result.error);

      await auditServer(req, 'DEMO_POSITION_CLOSED', {
        userId: user.id,
        metadata: { tradeId, pnl: result.pnl },
      });

      return ok({
        message: `Demo position closed. ${result.pnl >= 0 ? 'Profit' : 'Loss'}: $${Math.abs(result.pnl).toFixed(2)}.`,
        pnl: result.pnl,
        balance: result.balance,
        simulated: true,
      });
    }

    if (action !== 'open') return fail(400, 'action must be open or close.');

    const symbol = cleanString(body?.symbol, 20);
    const side = body?.side;
    const margin = Number(body?.margin);
    const leverage = Number(body?.leverage);
    const stopLoss = body?.stopLoss !== undefined && body?.stopLoss !== null ? Number(body.stopLoss) : undefined;
    const takeProfit = body?.takeProfit !== undefined && body?.takeProfit !== null ? Number(body.takeProfit) : undefined;

    if (!symbol) return fail(400, 'Choose an instrument.');
    if (side !== 'BUY' && side !== 'SELL') return fail(400, 'side must be BUY or SELL.');
    if (!Number.isFinite(margin) || margin < MIN_MARGIN || margin > MAX_MARGIN) {
      return fail(400, `Margin must be between $${MIN_MARGIN} and $${MAX_MARGIN.toLocaleString()}.`);
    }
    if (!ALLOWED_LEVERAGE.includes(leverage)) {
      return fail(400, `Leverage must be one of: ${ALLOWED_LEVERAGE.join(', ')}.`);
    }
    if (stopLoss !== undefined && (!Number.isFinite(stopLoss) || stopLoss <= 0)) {
      return fail(400, 'Stop loss must be a positive price.');
    }
    if (takeProfit !== undefined && (!Number.isFinite(takeProfit) || takeProfit <= 0)) {
      return fail(400, 'Take profit must be a positive price.');
    }

    const result = await openDemoPosition({
      userId: user.id,
      symbol,
      side,
      margin: Number(margin.toFixed(2)),
      leverage,
      stopLoss,
      takeProfit,
    });

    if (!result.ok) return fail(400, result.error);

    await auditServer(req, 'DEMO_POSITION_OPENED', {
      userId: user.id,
      metadata: { symbol, side, margin, leverage, entryPrice: result.position.entryPrice },
    });

    return ok({
      message: `Demo ${side} opened on ${symbol} at ${result.position.entryPrice}.`,
      position: result.position,
      simulated: true,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
