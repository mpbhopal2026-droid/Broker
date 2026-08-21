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
 * GBPUSDT exists as a Binance symbol but is delisted and returns a zero bid and
 * ask — do not be fooled by the 200 response. GBP/USD is instead derived from
 * Kraken further down.
 *
 * USD/INR and WTI/USD have no free live source at all and stay on Twelve Data.
 * For USD/INR specifically, do not reach for an Indian crypto exchange: USDT
 * trades there at a capital-controls premium, measured at 98.92 against a true
 * 95.77 — 3.3% off, which is not a rounding error on an FX rate.
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

/**
 * GBP/USD, derived from Kraken as (BTC/USD) / (BTC/GBP).
 *
 * There is no free licensed real-time GBP/USD quote. But BTC is quoted against
 * both currencies on the same order book at the same instant, and dividing one
 * by the other cancels BTC out and leaves the exchange rate. Kraken is a
 * regulated venue with a documented, keyless public API, so the inputs are
 * legitimate and so is the arithmetic.
 *
 * Measured against an independently-sourced GBP/USD it came within 0.11%, and
 * held 1.36274-1.36332 across 15 seconds with a 1-4 pip implied spread.
 *
 * DISPLAY GRADE, NOT EXECUTION GRADE. That 0.11% is roughly 15 pips, and the
 * BTC/GBP leg is the thinner of the two, so its noise lands in the result. It
 * is a good live number to show and a bad one to fill against.
 */
async function fetchKrakenGbpUsd(): Promise<Ticker | null> {
  const res = await fetch('https://api.kraken.com/0/public/Ticker?pair=XBTUSD,XBTGBP', {
    next: { revalidate: 10 },
  });
  if (!res.ok) return null;

  const r = (await res.json())?.result;
  const usd = r?.XXBTZUSD;
  const gbp = r?.XXBTZGBP;
  if (!usd || !gbp) return null;

  const num = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const uBid = num(usd.b?.[0]);
  const uAsk = num(usd.a?.[0]);
  const gBid = num(gbp.b?.[0]);
  const gAsk = num(gbp.a?.[0]);
  if (!uBid || !uAsk || !gBid || !gAsk) return null;

  const mid = (uBid + uAsk) / 2 / ((gBid + gAsk) / 2);

  // A division of two independent legs turns one stale or broken leg into a
  // confident-looking nonsense rate rather than an obvious failure. GBP/USD has
  // not left this band in its history, so anything outside it means an input is
  // wrong and we show the labelled simulated quote instead.
  if (mid < 0.8 || mid > 3) return null;

  const open = num(usd.o) && num(gbp.o) ? Number(usd.o) / Number(gbp.o) : null;

  return {
    mid,
    change: open ? mid - open : 0,
    changePercent: open ? ((mid - open) / open) * 100 : 0,
    // Kraken's 24h high/low are per-pair and do not survive the division, so
    // they are left off rather than fabricated from the ones that do exist.
    high24h: undefined,
    low24h: undefined,
  };
}

export async function fetchBinance(symbols: string[]): Promise<Map<string, SourcedQuote>> {
  const out = new Map<string, SourcedQuote>();
  const derived: Record<string, () => Promise<Ticker | null>> = {
    'XAU/USD': fetchGold,
    'GBP/USD': fetchKrakenGbpUsd,
  };

  const wanted = symbols.filter((s) => BINANCE_SYMBOLS[s] || derived[s]);
  if (wanted.length === 0) return out;

  await Promise.all(
    wanted.map(async (symbol) => {
      try {
        const tick = derived[symbol]
          ? await derived[symbol]()
          : await fetchPair(BINANCE_SYMBOLS[symbol]);
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
