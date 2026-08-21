import 'server-only';

import { getServiceClient } from './supabase-server';
import { simulatedMid, findInstrument } from './market-data';
import { getLiveAnchor } from './live-price-cache';
import { deriveBidAsk, executionPrice, positionPnl } from './pricing';

/**
 * Demo (paper trading) engine.
 *
 * Structurally separate from real money: demo balances live in
 * `profiles.demo_balance` and demo positions in `demo_trades`. Nothing here
 * touches `ledger_entries`, `transactions` or `wallet_balance`, so a demo
 * profit cannot become a withdrawable balance even through a bug — the code
 * path simply does not exist.
 */

export const DEMO_STARTING_BALANCE = 1000;
export const DEMO_MAX_OPEN_POSITIONS = 20;

export interface DemoSpreadConfig {
  defaultSpreadBps: number;
  bySymbol: Record<string, number>;
}

/** Spreads apply in demo too — otherwise it teaches the wrong lesson. */
export async function loadSpreadConfig(): Promise<DemoSpreadConfig> {
  const db = getServiceClient();
  const fallback: DemoSpreadConfig = { defaultSpreadBps: 5, bySymbol: {} };
  if (!db) return fallback;

  const [settings, spreads] = await Promise.all([
    db.from('broker_payment_settings').select('default_spread_bps').eq('id', 1).maybeSingle(),
    db.from('instrument_spreads').select('symbol, spread_bps, is_tradeable'),
  ]);

  const bySymbol: Record<string, number> = {};
  for (const row of spreads.data ?? []) {
    if (row.is_tradeable !== false) bySymbol[row.symbol] = Number(row.spread_bps);
  }

  return {
    defaultSpreadBps: Number(settings.data?.default_spread_bps ?? 5),
    bySymbol,
  };
}

/**
 * Bid/ask for a demo trade.
 *
 * Prefers the real market. A demo that fills at a price unrelated to the chart
 * beside it teaches the client the wrong thing and reads as a bug — which is
 * exactly how this surfaced: live gold charting at 4573 while demo fills came
 * from an independent simulated series.
 *
 * Falls back to simulation when no recent real mid exists (cold instance, or an
 * instrument with no free live source such as USD/INR or WTI), so the demo
 * always works.
 *
 * `atMs` is still honoured for the simulated path, which is what historical
 * mark-to-market replays depend on.
 */
export function quoteFor(symbol: string, config: DemoSpreadConfig, atMs = Date.now()) {
  const mid = getLiveAnchor(symbol) ?? simulatedMid(symbol, atMs);
  const bps = config.bySymbol[symbol] ?? config.defaultSpreadBps;
  return deriveBidAsk(mid, bps);
}

export interface DemoPosition {
  id: string;
  symbol: string;
  pairName: string;
  side: 'BUY' | 'SELL';
  lotSize: number;
  margin: number;
  leverage: number;
  entryPrice: number;
  exitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  pnl: number;
  status: 'OPEN' | 'CLOSED';
  openedAt: string;
  closedAt?: string;
  /** Live mark for open positions; null once closed. */
  currentPrice?: number;
}

/** Mark open positions to the current simulated quote. */
export async function loadDemoState(userId: string) {
  const db = getServiceClient();
  if (!db) return null;

  const [profile, trades] = await Promise.all([
    db.from('profiles').select('demo_balance, demo_reset_at').eq('id', userId).maybeSingle(),
    db.from('demo_trades').select('*').eq('user_id', userId).order('opened_at', { ascending: false }).limit(200),
  ]);

  const config = await loadSpreadConfig();
  const now = Date.now();

  const positions: DemoPosition[] = (trades.data ?? []).map((t) => {
    const base: DemoPosition = {
      id: t.id,
      symbol: t.symbol,
      pairName: t.pair_name,
      side: t.side,
      lotSize: Number(t.lot_size),
      margin: Number(t.margin),
      leverage: t.leverage,
      entryPrice: Number(t.entry_price),
      exitPrice: t.exit_price !== null ? Number(t.exit_price) : undefined,
      stopLoss: t.stop_loss !== null ? Number(t.stop_loss) : undefined,
      takeProfit: t.take_profit !== null ? Number(t.take_profit) : undefined,
      pnl: Number(t.pnl),
      status: t.status,
      openedAt: t.opened_at,
      closedAt: t.closed_at ?? undefined,
    };

    if (t.status !== 'OPEN') return base;

    const quote = quoteFor(t.symbol, config, now);
    return {
      ...base,
      currentPrice: quote.mid,
      pnl: positionPnl({
        side: base.side,
        entryPrice: base.entryPrice,
        currentQuote: quote,
        margin: base.margin,
        leverage: base.leverage,
      }),
    };
  });

  const open = positions.filter((p) => p.status === 'OPEN');
  const balance = Number(profile.data?.demo_balance ?? 0);
  const marginUsed = open.reduce((sum, p) => sum + p.margin, 0);
  const openPnl = open.reduce((sum, p) => sum + p.pnl, 0);

  return {
    balance,
    marginUsed,
    openPnl: Number(openPnl.toFixed(2)),
    /** What the account would be worth if every open position closed now. */
    equity: Number((balance + marginUsed + openPnl).toFixed(2)),
    positions,
    resetAt: profile.data?.demo_reset_at ?? null,
    startingBalance: DEMO_STARTING_BALANCE,
  };
}

export async function openDemoPosition(params: {
  userId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  margin: number;
  leverage: number;
  stopLoss?: number;
  takeProfit?: number;
}): Promise<{ ok: true; position: DemoPosition } | { ok: false; error: string }> {
  const db = getServiceClient();
  if (!db) return { ok: false, error: 'Demo trading is unavailable.' };

  const instrument = findInstrument(params.symbol);
  if (!instrument) return { ok: false, error: 'Unknown instrument.' };

  const config = await loadSpreadConfig();
  if (config.bySymbol[params.symbol] === undefined && Object.keys(config.bySymbol).length > 0) {
    // Present in the catalogue but flagged non-tradeable.
    if (!(params.symbol in config.bySymbol)) {
      return { ok: false, error: 'This instrument is not currently tradeable.' };
    }
  }

  const { data: profile } = await db
    .from('profiles')
    .select('demo_balance')
    .eq('id', params.userId)
    .maybeSingle();

  const balance = Number(profile?.demo_balance ?? 0);
  if (params.margin > balance) {
    return { ok: false, error: `Insufficient demo balance. You have $${balance.toFixed(2)}.` };
  }

  const { count } = await db
    .from('demo_trades')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', params.userId)
    .eq('status', 'OPEN');

  if ((count ?? 0) >= DEMO_MAX_OPEN_POSITIONS) {
    return { ok: false, error: `You can hold at most ${DEMO_MAX_OPEN_POSITIONS} open demo positions.` };
  }

  const quote = quoteFor(params.symbol, config);
  const entryPrice = executionPrice(quote, params.side);
  const lotSize = Number(((params.margin * params.leverage) / 100_000).toFixed(4)) || 0.01;

  const { data: trade, error } = await db
    .from('demo_trades')
    .insert({
      user_id: params.userId,
      symbol: params.symbol,
      pair_name: instrument.name,
      side: params.side,
      lot_size: lotSize,
      margin: params.margin,
      leverage: params.leverage,
      entry_price: entryPrice,
      stop_loss: params.stopLoss ?? null,
      take_profit: params.takeProfit ?? null,
      pnl: 0,
      status: 'OPEN',
    })
    .select('*')
    .single();

  if (error || !trade) {
    console.error('[demo] open failed:', error);
    return { ok: false, error: 'Could not open the demo position.' };
  }

  // Margin is held while the position is open, mirroring the real flow.
  await db
    .from('profiles')
    .update({ demo_balance: Number((balance - params.margin).toFixed(2)) })
    .eq('id', params.userId);

  return {
    ok: true,
    position: {
      id: trade.id,
      symbol: trade.symbol,
      pairName: trade.pair_name,
      side: trade.side,
      lotSize: Number(trade.lot_size),
      margin: Number(trade.margin),
      leverage: trade.leverage,
      entryPrice: Number(trade.entry_price),
      pnl: 0,
      status: 'OPEN',
      openedAt: trade.opened_at,
      currentPrice: quote.mid,
    },
  };
}

export async function closeDemoPosition(
  userId: string,
  tradeId: string
): Promise<{ ok: true; pnl: number; balance: number } | { ok: false; error: string }> {
  const db = getServiceClient();
  if (!db) return { ok: false, error: 'Demo trading is unavailable.' };

  const { data: trade } = await db
    .from('demo_trades')
    .select('*')
    .eq('id', tradeId)
    .eq('user_id', userId) // scoping to the owner prevents closing someone else's position
    .maybeSingle();

  if (!trade) return { ok: false, error: 'No such demo position.' };
  if (trade.status !== 'OPEN') return { ok: false, error: 'That position is already closed.' };

  const config = await loadSpreadConfig();
  const quote = quoteFor(trade.symbol, config);
  const side = trade.side as 'BUY' | 'SELL';
  const exitPrice = side === 'BUY' ? quote.bid : quote.ask;

  const pnl = positionPnl({
    side,
    entryPrice: Number(trade.entry_price),
    currentQuote: quote,
    margin: Number(trade.margin),
    leverage: trade.leverage,
  });

  // Guard against a status race: only settle a row still marked OPEN.
  const { data: updated } = await db
    .from('demo_trades')
    .update({ status: 'CLOSED', exit_price: exitPrice, pnl, closed_at: new Date().toISOString() })
    .eq('id', tradeId)
    .eq('status', 'OPEN')
    .select('id')
    .maybeSingle();

  if (!updated) return { ok: false, error: 'That position is already closed.' };

  const { data: profile } = await db
    .from('profiles')
    .select('demo_balance')
    .eq('id', userId)
    .maybeSingle();

  // Return margin plus P&L, floored at zero so a loss cannot go negative.
  const returned = Math.max(0, Number(trade.margin) + pnl);
  const balance = Number((Number(profile?.demo_balance ?? 0) + returned).toFixed(2));

  await db.from('profiles').update({ demo_balance: balance }).eq('id', userId);

  return { ok: true, pnl, balance };
}

export async function resetDemoAccount(userId: string): Promise<boolean> {
  const db = getServiceClient();
  if (!db) return false;

  await db.from('demo_trades').delete().eq('user_id', userId);

  const { error } = await db
    .from('profiles')
    .update({ demo_balance: DEMO_STARTING_BALANCE, demo_reset_at: new Date().toISOString() })
    .eq('id', userId);

  return !error;
}

export async function demoDepositFunds(userId: string, amount: number): Promise<{ ok: true; balance: number } | { ok: false; error: string }> {
  const db = getServiceClient();
  if (!db) return { ok: false, error: 'Database unavailable.' };
  if (amount <= 0 || amount > 100000) return { ok: false, error: 'Invalid deposit amount ($1 - $100,000).' };

  const { data: profile } = await db.from('profiles').select('demo_balance').eq('id', userId).maybeSingle();
  const current = Number(profile?.demo_balance ?? 0);
  const newBalance = Number((current + amount).toFixed(2));

  const { error } = await db.from('profiles').update({ demo_balance: newBalance }).eq('id', userId);
  if (error) return { ok: false, error: 'Could not update demo balance.' };
  return { ok: true, balance: newBalance };
}

export async function demoWithdrawFunds(userId: string, amount: number): Promise<{ ok: true; balance: number } | { ok: false; error: string }> {
  const db = getServiceClient();
  if (!db) return { ok: false, error: 'Database unavailable.' };
  if (amount <= 0) return { ok: false, error: 'Invalid withdrawal amount.' };

  const { data: profile } = await db.from('profiles').select('demo_balance').eq('id', userId).maybeSingle();
  const current = Number(profile?.demo_balance ?? 0);
  if (amount > current) return { ok: false, error: `Insufficient demo balance. You have $${current.toFixed(2)}.` };

  const newBalance = Number((current - amount).toFixed(2));
  const { error } = await db.from('profiles').update({ demo_balance: newBalance }).eq('id', userId);
  if (error) return { ok: false, error: 'Could not deduct demo balance.' };
  return { ok: true, balance: newBalance };
}

