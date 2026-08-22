import { loadSession, requireUser } from '@/lib/auth-server';
import { getServiceClient } from '@/lib/supabase-server';
import { ok, fail, handleRouteError } from '@/lib/api';
import { getQuotes } from '@/lib/quote-provider';
import { positionPnl, deriveBidAsk } from '@/lib/pricing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * A client's real-money positions, recorded by the dealing desk.
 *
 * Read-only by construction: clients never open or close these, and
 * live_trades has no client-writable RLS policy.
 *
 * P&L IS COMPUTED HERE, NOT STORED. live_trades deliberately has no pnl column
 * — profit follows from entry price, exit price and size, so there is nothing
 * for an operator to type. Realised P&L uses the recorded exit price; open
 * P&L is marked against the current market.
 */
export async function GET() {
  try {
    const user = await loadSession();
    if (!user) {
      return ok({ trades: [] });
    }
    const db = getServiceClient();
    if (!db) return fail(503, 'Database unavailable.');

    const { data, error } = await db
      .from('live_trades')
      .select('*')
      .eq('user_id', user.id)
      .order('opened_at', { ascending: false })
      .limit(200);

    if (error) return fail(500, 'Could not load your positions.');

    const rows = data ?? [];
    const quotes = rows.length ? await getQuotes().catch(() => null) : null;

    const trades = rows.map((t) => {
      const entryPrice = Number(t.entry_price);
      const margin = Number(t.margin);
      const leverage = Number(t.leverage);
      const side = t.side as 'BUY' | 'SELL';

      const quote = quotes?.find((q) => q.symbol === t.symbol);
      const closed = t.status === 'CLOSED';
      const exitPrice = t.exit_price != null ? Number(t.exit_price) : null;

      // A closed trade is marked at the price it actually closed at. An open
      // one is marked against the live market when we have it — and when we do
      // not, P&L is reported as null rather than zero, because "no data" and
      // "no profit" are very different things to show a client.
      let pnl: number | null = null;
      let markPrice: number | null = null;

      if (closed && exitPrice !== null) {
        markPrice = exitPrice;
        pnl = positionPnl({
          side,
          entryPrice,
          currentQuote: deriveBidAsk(exitPrice, 0),
          margin,
          leverage,
        });
      } else if (quote && quote.source !== 'simulated') {
        markPrice = quote.mid;
        pnl = positionPnl({
          side,
          entryPrice,
          currentQuote: {
            mid: quote.mid,
            bid: quote.bid,
            ask: quote.ask,
            spreadAbsolute: quote.ask - quote.bid,
            spreadBps: quote.mid ? ((quote.ask - quote.bid) / quote.mid) * 10_000 : 0,
          },
          margin,
          leverage,
        });
      }

      return {
        id: t.id,
        symbol: t.symbol,
        pairName: t.pair_name,
        side,
        lotSize: Number(t.lot_size),
        margin,
        leverage,
        entryPrice,
        exitPrice,
        markPrice,
        stopLoss: t.stop_loss != null ? Number(t.stop_loss) : null,
        takeProfit: t.take_profit != null ? Number(t.take_profit) : null,
        pnl,
        // Surfaced so the client can reconcile the fill against their broker
        // confirmation rather than taking the number on trust.
        executionRef: t.execution_ref,
        exitExecutionRef: t.exit_execution_ref,
        // Tells the UI whether an open position's P&L is being marked against
        // a real price, so a stale feed is never presented as a current valuation.
        priceSource: closed ? 'executed' : (quote?.source ?? 'unavailable'),
        status: t.status,
        openedAt: t.opened_at,
        closedAt: t.closed_at,
      };
    });

    return ok({ trades });
  } catch (err) {
    return handleRouteError(err);
  }
}
