import { NextResponse } from 'next/server';
import { getQuotes, hasLiveFeed } from '@/lib/quote-provider';

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
    return NextResponse.json(
      { ok: true, feed: hasLiveFeed() ? 'live' : 'simulated', quotes },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json({ ok: false, error: 'Quotes unavailable.' }, { status: 503 });
  }
}
