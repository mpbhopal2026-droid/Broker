/**
 * Last known live mid per symbol, readable synchronously.
 *
 * getQuotes() is async because it talks to Binance, Kraken and Twelve Data. The
 * demo engine is synchronous and is called from four places, so it had no way
 * to reach a real price and priced everything off simulatedMid() instead. The
 * result was a client watching a live gold chart at 4573 while their demo fill
 * came from an unrelated simulated series — the two numbers on screen were
 * never going to agree.
 *
 * This is the bridge: getQuotes() writes each live mid here as it resolves, and
 * synchronous callers read the most recent one.
 *
 * DELIBERATELY NOT USED for the simulated fallback inside getQuotes(). A price
 * anchored to a real tick but carrying invented drift is neither live nor
 * simulated, and labelling it either way would be a lie. The fallback stays
 * pure simulation and keeps saying so.
 */

interface Anchor {
  mid: number;
  atMs: number;
}

const anchors = new Map<string, Anchor>();

/**
 * How long a cached mid stays usable.
 *
 * Serverless instances start cold with an empty map, and an instance that has
 * not served /api/quotes recently holds nothing worth trusting. Past this the
 * caller falls back to simulation rather than pricing off a stale tick.
 */
const MAX_AGE_MS = 2 * 60_000;

/** Record a mid that came from a real source. Never call this with a simulated price. */
export function setLiveAnchor(symbol: string, mid: number, atMs: number = Date.now()): void {
  if (!Number.isFinite(mid) || mid <= 0) return;
  anchors.set(symbol, { mid, atMs });
}

/** The last real mid for a symbol, or null if there is not a recent one. */
export function getLiveAnchor(symbol: string): number | null {
  const a = anchors.get(symbol);
  if (!a) return null;
  if (Date.now() - a.atMs > MAX_AGE_MS) return null;
  return a.mid;
}
