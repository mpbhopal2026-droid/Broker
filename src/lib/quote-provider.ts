import { INSTRUMENTS, findInstrument, simulatedSnapshot } from '@/lib/market-data';

/**
 * Market data seam.
 *
 * The app previously rendered a frozen array of prices that never moved and
 * carried no indication they were not real. On a platform holding real client
 * money that is the most dangerous kind of placeholder, so every quote now
 * carries its own provenance and the UI is expected to show it.
 *
 * Set MARKET_DATA_PROVIDER + MARKET_DATA_API_KEY to serve real quotes. With no
 * key configured this returns simulated quotes explicitly marked as such —
 * it never dresses simulated prices up as live.
 */

export type QuoteSource = 'live' | 'simulated';

export interface Quote {
  symbol: string;
  name: string;
  category: string;
  bid: number;
  ask: number;
  mid: number;
  change: number;
  changePercent: number;
  high24h: number;
  low24h: number;
  tvSymbol: string;
  source: QuoteSource;
  asOf: string;
}

/** True when a real feed is configured. Live trading stays disabled without one. */
export function hasLiveFeed(): boolean {
  return Boolean(process.env.MARKET_DATA_API_KEY && process.env.MARKET_DATA_PROVIDER);
}

/** Half-spread applied either side of the mid to produce a dealable bid/ask. */
const HALF_SPREAD = 0.0002;

function withSpread(mid: number) {
  return {
    bid: Number((mid * (1 - HALF_SPREAD)).toFixed(5)),
    ask: Number((mid * (1 + HALF_SPREAD)).toFixed(5)),
  };
}

function simulatedQuote(symbol: string, atMs: number): Quote | null {
  const inst = findInstrument(symbol);
  const snap = simulatedSnapshot(symbol, atMs);
  if (!inst || !snap) return null;

  return {
    symbol: snap.symbol,
    name: snap.name,
    category: snap.category,
    ...withSpread(snap.price),
    mid: snap.price,
    change: snap.change,
    changePercent: snap.changePercent,
    high24h: snap.high24h,
    low24h: snap.low24h,
    tvSymbol: snap.tvSymbol,
    source: 'simulated',
    asOf: new Date(atMs).toISOString(),
  };
}

/**
 * Twelve Data adapter — covers forex, commodities and crypto in one call, which
 * matches the instrument list. Add further providers as sibling branches; the
 * Quote shape is the contract the rest of the app depends on.
 */
async function fetchTwelveData(symbols: string[]): Promise<Map<string, Partial<Quote>>> {
  const key = process.env.MARKET_DATA_API_KEY!;
  const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbols.join(','))}&apikey=${key}`;

  // Twelve Data bills one credit PER SYMBOL, so a batch call for 6 instruments
  // costs 6 credits — not 1. At a 5s refresh that is 72 credits/minute, which
  // overruns the free tier (8/min) in seconds and the Grow tier (55/min) too.
  //
  // Hence the refresh window is configurable: set MARKET_DATA_REFRESH_SECONDS
  // to (60 * symbols) / your_per_minute_credits, rounded up. For 6 symbols on
  // Grow that is 7 seconds. Overrunning does not degrade gracefully — the
  // provider starts returning errors and every quote silently falls back to
  // simulated, which is the one outcome we cannot afford to be quiet about.
  const refresh = Number(process.env.MARKET_DATA_REFRESH_SECONDS) || 7;

  const res = await fetch(url, { next: { revalidate: refresh } });
  if (!res.ok) throw new Error(`market data provider returned ${res.status}`);

  const body = await res.json();
  const rows = symbols.length === 1 ? { [symbols[0]]: body } : body;
  const out = new Map<string, Partial<Quote>>();

  for (const [symbol, row] of Object.entries<any>(rows)) {
    if (!row || row.status === 'error' || row.close == null) continue;
    const mid = Number(row.close);
    if (!Number.isFinite(mid)) continue;

    out.set(symbol, {
      mid,
      change: Number(row.change) || 0,
      changePercent: Number(row.percent_change) || 0,
      high24h: Number(row.high) || mid,
      low24h: Number(row.low) || mid,
      source: 'live',
    });
  }
  return out;
}

/**
 * Quotes for every tradable instrument. Falls back to clearly-marked simulated
 * data if the provider errors, so a feed outage degrades the display rather
 * than blanking the platform — but the source flag always tells the truth.
 */
export async function getQuotes(atMs: number = Date.now()): Promise<Quote[]> {
  const base = INSTRUMENTS
    .map((i) => simulatedQuote(i.symbol, atMs))
    .filter((q): q is Quote => q !== null);

  if (!hasLiveFeed() || process.env.MARKET_DATA_PROVIDER !== 'twelvedata') {
    return base;
  }

  try {
    const live = await fetchTwelveData(base.map((q) => q.symbol));

    return base.map((q) => {
      const l = live.get(q.symbol);
      if (!l?.mid) return q;
      return {
        ...q,
        ...l,
        mid: l.mid,
        ...withSpread(l.mid),
        source: 'live' as const,
        asOf: new Date(atMs).toISOString(),
      };
    });
  } catch {
    return base;
  }
}
