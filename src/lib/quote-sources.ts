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
 * The honest consequence: free AND real-time AND licensed exists for crypto and
 * for nothing else. Forex and commodities on a free licensed tier are
 * rate-limited to slow refreshes. Those instruments therefore update in minutes,
 * not seconds, and say so via `source` and `asOf`. Slow and true beats fast and
 * unlicensed. A paid Twelve Data plan is the fix, and is required before live
 * execution is enabled.
 */

/**
 * Binance. Free, keyless, publicly documented, and explicitly offered for
 * application use — no terms problem. Real-time, and uniquely here it returns a
 * true bid/ask, so the spread is the market's rather than one we derived.
 *
 * This stays the BTC source permanently, on any plan.
 */
const BINANCE_SYMBOLS: Record<string, string> = {
  'BTC/USD': 'BTCUSDT',
};

export interface SourcedQuote {
  mid: number;
  change?: number;
  changePercent?: number;
  high24h?: number;
  low24h?: number;
  source: Quote['source'];
  asOf?: string;
}

export async function fetchBinance(symbols: string[]): Promise<Map<string, SourcedQuote>> {
  const out = new Map<string, SourcedQuote>();
  const wanted = symbols.filter((s) => BINANCE_SYMBOLS[s]);
  if (wanted.length === 0) return out;

  await Promise.all(
    wanted.map(async (symbol) => {
      try {
        const pair = BINANCE_SYMBOLS[symbol];
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
        if (!Number.isFinite(bid) || !Number.isFinite(ask)) return;

        out.set(symbol, {
          mid: (bid + ask) / 2,
          change: Number(stats?.priceChange) || 0,
          changePercent: Number(stats?.priceChangePercent) || 0,
          high24h: Number(stats?.highPrice) || undefined,
          low24h: Number(stats?.lowPrice) || undefined,
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
