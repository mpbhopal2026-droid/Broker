import { INSTRUMENTS, findInstrument, simulatedSnapshot } from '@/lib/market-data';
import { fetchBinance } from '@/lib/quote-sources';

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

export type QuoteSource = 'live' | 'stale' | 'simulated';

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
/**
 * A provider tick older than this is no longer 'live'.
 *
 * Generous on purpose: forex closes at weekends and some instruments trade in
 * sessions, so a legitimately quiet market must not be flagged stale. This is
 * aimed at the failure that actually happened — the feed silently stopping
 * while cached prices kept being served as current.
 */
const STALE_AFTER_MS = 30 * 60_000;

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
  // Overrunning the plan does not degrade gracefully: the provider starts
  // erroring and every quote silently falls back to simulated. Production
  // burned 8,046 credits against a budget of 800 and then served hours-old
  // prices. So rather than a fixed default, the refresh window is DERIVED from
  // the daily credit budget and the number of symbols actually being asked
  // for:
  //
  //   refresh = (seconds/day x symbols) / daily_budget, plus 10% headroom
  //
  // Deriving it matters because that symbol count is no longer fixed. Binance
  // now answers BTC, gold and EUR/USD for free, so only three symbols reach
  // this adapter instead of six — which halves the cost per refresh and buys
  // twice the frequency at no charge. A hardcoded default could not notice
  // that. Equally, if a symbol is ever added, the window widens on its own
  // instead of quietly overrunning.
  //
  //   3 symbols, 800/day  -> ~356s   fits free
  //   6 symbols, 800/day  -> ~713s   fits free
  //   6 symbols, Grow     -> set MARKET_DATA_DAILY_CREDITS to the plan's
  //
  // MARKET_DATA_REFRESH_SECONDS still overrides outright when set.
  const dailyCredits = Number(process.env.MARKET_DATA_DAILY_CREDITS) || 800;
  const derived = Math.ceil(((86_400 * symbols.length) / dailyCredits) * 1.1);
  const refresh = Number(process.env.MARKET_DATA_REFRESH_SECONDS) || derived;

  const res = await fetch(url, { next: { revalidate: refresh } });
  if (!res.ok) throw new Error(`market data provider returned ${res.status}`);

  const body = await res.json();
  const rows = symbols.length === 1 ? { [symbols[0]]: body } : body;
  const out = new Map<string, Partial<Quote>>();

  for (const [symbol, row] of Object.entries<any>(rows)) {
    if (!row || row.status === 'error' || row.close == null) continue;
    const mid = Number(row.close);
    if (!Number.isFinite(mid)) continue;

    // A price is only "live" if the provider says it is recent.
    //
    // Next serves a cached fetch stale-while-revalidate, so once revalidation
    // starts failing — a 429 when the daily credit budget is gone — it keeps
    // returning the last successful response indefinitely. Production showed
    // exactly that: five instruments labelled 'live' at prices that had not
    // moved in hours, while the provider was refusing every request.
    //
    // A stale price presented as live is the worst kind of wrong on a trading
    // screen: it looks authoritative and a client can act on it.
    const tickMs = Number(row.timestamp) * 1000;
    const ageMs = Number.isFinite(tickMs) && tickMs > 0 ? Date.now() - tickMs : 0;
    const isStale = ageMs > STALE_AFTER_MS;

    out.set(symbol, {
      mid,
      change: Number(row.change) || 0,
      changePercent: Number(row.percent_change) || 0,
      high24h: Number(row.high) || mid,
      low24h: Number(row.low) || mid,
      // Downgraded rather than hidden. The last real price is still the most
      // useful number to show — it just must not claim to be current.
      source: isStale ? 'stale' : 'live',
      asOf: Number.isFinite(tickMs) && tickMs > 0 ? new Date(tickMs).toISOString() : undefined,
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

  const symbols = base.map((q) => q.symbol);

  // Sources are tried in order and each only fills what the previous left.
  //
  //   Binance — free, official, keyless, real-time, true bid/ask. Crypto only,
  //             so it is asked first and answers for BTC alone. It has no rate
  //             budget to protect, and its quote is better than Twelve Data's
  //             for that symbol, so there is no reason to spend a credit on it.
  //
  //   Twelve  — everything else. The only licensed source we have for forex and
  //             commodities.
  //
  // Anything neither source answers for stays simulated and stays LABELLED
  // simulated. See quote-sources.ts for why there is no free licensed
  // real-time option for forex or commodities, and why we do not scrape one.
  const merged = new Map<string, Partial<Quote>>();

  const collect = (m: Map<string, Partial<Quote>>) => {
    for (const [symbol, v] of m) if (!merged.has(symbol)) merged.set(symbol, v);
  };

  const missing = () => symbols.filter((s) => !merged.has(s));

  try {
    collect(await fetchBinance(symbols));
  } catch {
    // Optional source. A failure here must not take the others down.
  }

  if (hasLiveFeed() && process.env.MARKET_DATA_PROVIDER === 'twelvedata') {
    try {
      const rest = missing();
      // Only the symbols still outstanding — Twelve Data bills per symbol, so
      // asking it for BTC that Binance already answered wastes a credit out of
      // a daily budget of 800.
      if (rest.length) collect(await fetchTwelveData(rest));
    } catch {
      // Out of credits, or the provider is down. Falls through to simulated,
      // which is visibly marked rather than silently wrong.
    }
  }

  return base.map((q) => {
    const l = merged.get(q.symbol);
    if (!l?.mid) return q;
    return {
      ...q,
      ...l,
      mid: l.mid,
      ...withSpread(l.mid),
      // Carry the adapter's own verdict through. Hardcoding 'live' here is
      // what let a stale cached tick reach the client wearing a live label.
      source: (l.source ?? 'live') as QuoteSource,
      asOf: l.asOf ?? new Date(atMs).toISOString(),
    };
  });
}
