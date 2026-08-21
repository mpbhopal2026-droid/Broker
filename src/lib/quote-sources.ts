import type { Quote } from './quote-provider';

/**
 * Additional price sources, alongside the Twelve Data adapter in
 * quote-provider.ts.
 *
 * EVERY SOURCE HERE MUST BE OFFICIAL, DOCUMENTED AND LICENSED FOR OUR USE.
 *
 * That rule exists because the obvious shortcut is tempting and wrong. Yahoo
 * Finance has an undocumented endpoint that returns gold, oil and FX for free
 * in near-real-time, and it was implemented here before being removed. It is
 * not documented, not permitted for commercial redistribution under Yahoo's
 * terms, and has been blocked without notice before. A client disputing a fill
 * and discovering the price came from a scraped endpoint is not a defensible
 * position for a broker. Do not reintroduce it, and apply the same test to any
 * new source: if we cannot point to published terms that allow this, it does
 * not go in.
 *
 * The honest consequence: free AND real-time AND licensed covers BTC, gold and
 * EUR/USD (the last two by proxy, see below). It does not cover GBP/USD,
 * USD/INR or WTI, which stay on the rate-limited free Twelve Data tier and so
 * update in minutes rather than seconds — and say so via `source` and `asOf`.
 * Slow and true beats fast and unlicensed. A paid Twelve Data plan is the fix,
 * and is required before live execution is enabled.
 */

/**
 * Binance. Free, keyless, publicly documented, and explicitly offered for
 * application use — no terms problem. Real-time, and uniquely here it returns a
 * true bid/ask, so the spread is the market's rather than one we derived.
 *
 * Three of our instruments are reachable here, two of them via proxies:
 *
 *   BTC/USD — BTCUSDT directly. Exact.
 *
 *   XAU/USD — PAXG and XAUT are gold tokens, each backed by and redeemable for
 *             one troy ounce of allocated physical gold. That redeemability is
 *             what keeps them pegged to spot; they trade around 0.2% apart from
 *             each other, so both are read and averaged rather than trusting
 *             either alone. Measured live and moving.
 *
 *   EUR/USD — EURUSDT. USDT holds its dollar peg tightly enough that this
 *             matched independently-sourced EUR/USD to four decimal places
 *             when checked (1.1700 vs 1.1699).
 *
 * THESE TWO ARE PROXIES, NOT THE UNDERLYING. Gold tokens carry a small premium
 * over spot and USDT can depeg under stress. That is fine for a display feed
 * and NOT fine for filling client orders, where a fill must be justifiable
 * against the actual market. Use a licensed feed for execution.
 *
 * GBP/USD, USD/INR and WTI/USD have no Binance equivalent. GBPUSDT exists as a
 * symbol but is delisted and returns a zero bid/ask — do not be fooled by the
 * 200 response. Those three need a licensed provider.
 */
const BINANCE_SYMBOLS: Record<string, string> = {
  'BTC/USD': 'BTCUSDT',
  'EUR/USD': 'EURUSDT',
};

/** Averaged because no single gold token is authoritative. */
const GOLD_TOKENS = ['PAXGUSDT', 'XAUTUSDT'];

/** Reject a token that has drifted this far from its peers — likely depegged. */
const GOLD_MAX_DIVERGENCE = 0.02;

export interface SourcedQuote {
  mid: number;
  change?: number;
  changePercent?: number;
  high24h?: number;
  low24h?: number;
  source: Quote['source'];
  asOf?: string;
}

interface Ticker {
  mid: number;
  change: number;
  changePercent: number;
  high24h?: number;
  low24h?: number;
}

/**
 * One Binance pair, or null if it did not return a usable two-sided market.
 *
 * A delisted symbol still answers 200 with a zero bid and ask — GBPUSDT does
 * exactly this. Treating that as a price would put a hard zero on a trading
 * screen, so a non-positive side is rejected rather than trusted.
 */
async function fetchPair(pair: string): Promise<Ticker | null> {
  const [book, stats] = await Promise.all([
    fetch(`https://api.binance.com/api/v3/ticker/bookTicker?symbol=${pair}`, {
      next: { revalidate: 10 },
    }).then((r) => (r.ok ? r.json() : null)),
    fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${pair}`, {
      next: { revalidate: 60 },
    }).then((r) => (r.ok ? r.json() : null)),
  ]);

  const bid = Number(book?.bidPrice);
  const ask = Number(book?.askPrice);
  if (!Number.isFinite(bid) || !Number.isFinite(ask) || bid <= 0 || ask <= 0) return null;

  return {
    mid: (bid + ask) / 2,
    change: Number(stats?.priceChange) || 0,
    changePercent: Number(stats?.priceChangePercent) || 0,
    high24h: Number(stats?.highPrice) || undefined,
    low24h: Number(stats?.lowPrice) || undefined,
  };
}

/**
 * Gold, as the average of the tokens that are still tracking each other.
 *
 * Averaging is not for precision — it is so that one token breaking its peg
 * cannot move the displayed gold price on its own. If the two disagree by more
 * than GOLD_MAX_DIVERGENCE something is wrong with at least one of them and we
 * would rather show nothing than pick a side, so gold falls back to the
 * labelled simulated quote.
 */
async function fetchGold(): Promise<Ticker | null> {
  const ticks = (await Promise.all(GOLD_TOKENS.map((p) => fetchPair(p).catch(() => null))))
    .filter((t): t is Ticker => t !== null);

  if (ticks.length === 0) return null;

  const mid = ticks.reduce((s, t) => s + t.mid, 0) / ticks.length;
  const diverged = ticks.some((t) => Math.abs(t.mid - mid) / mid > GOLD_MAX_DIVERGENCE);
  if (diverged) return null;

  return {
    mid,
    change: ticks.reduce((s, t) => s + t.change, 0) / ticks.length,
    changePercent: ticks.reduce((s, t) => s + t.changePercent, 0) / ticks.length,
    high24h: Math.max(...ticks.map((t) => t.high24h ?? t.mid)),
    low24h: Math.min(...ticks.map((t) => t.low24h ?? t.mid)),
  };
}

export async function fetchBinance(symbols: string[]): Promise<Map<string, SourcedQuote>> {
  const out = new Map<string, SourcedQuote>();
  const wanted = symbols.filter((s) => BINANCE_SYMBOLS[s] || s === 'XAU/USD');
  if (wanted.length === 0) return out;

  await Promise.all(
    wanted.map(async (symbol) => {
      try {
        const tick = symbol === 'XAU/USD' ? await fetchGold() : await fetchPair(BINANCE_SYMBOLS[symbol]);
        if (!tick) return;

        out.set(symbol, {
          ...tick,
          source: 'live',
          asOf: new Date().toISOString(),
        });
      } catch {
        // Leave unset — the caller falls back to a simulated quote, correctly
        // labelled. Never substitute a guess for a missing real price.
      }
    }),
  );

  return out;
}
