import { NextResponse } from 'next/server';
import { getQuotes } from '@/lib/quote-provider';

export const dynamic = 'force-dynamic';

/**
 * Single source of truth for displayed prices.
 *
 * `source` on each quote, and `feed` on the envelope, tell the client whether
 * these are real prices or simulated ones. The UI must surface that — never
 * render a simulated price as if it were the market.
 */
export async function GET() {
  try {
    const quotes = await getQuotes();

    // Derived from the quotes themselves, not from configuration.
    //
    // This used to report hasLiveFeed(), which only asks whether a Twelve Data
    // key is set. Binance and Kraken now serve gold, BTC, EUR/USD and GBP/USD
    // live with no key at all, so with Twelve Data unconfigured the envelope
    // called four genuinely live instruments 'simulated'. Asking the prices
    // what they are cannot drift from what was actually served.
    const live = quotes.filter((q) => q.source === 'live').length;
    const feed = live === quotes.length ? 'live' : live > 0 ? 'partial' : 'simulated';

    return NextResponse.json(
      { ok: true, feed, liveCount: live, total: quotes.length, quotes },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json({ ok: false, error: 'Quotes unavailable.' }, { status: 503 });
  }
}
