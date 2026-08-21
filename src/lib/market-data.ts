/**
 * Simulated market data for the DEMO account.
 *
 * This is NOT a price feed and must never price a real-money order. It exists
 * so the demo account behaves like a market: prices move, spreads cost you
 * something, and a position can go against you.
 *
 * Prices are a deterministic function of the clock — a sum of sine waves plus a
 * per-symbol phase offset. Deterministic rather than random on purpose:
 *
 *   - Every user sees the same price at the same moment, so demo results are
 *     comparable and reproducible.
 *   - A position's P&L evolves smoothly instead of jumping on every poll,
 *     which is what Math.random() per request would do.
 *   - No server state is needed to keep a consistent series.
 */

export interface InstrumentDefinition {
  symbol: string;
  name: string;
  category: 'Forex' | 'Commodities' | 'Crypto';
  basePrice: number;
  /** Peak-to-peak movement as a fraction of base price. */
  volatility: number;
  tvSymbol: string;
}

export const INSTRUMENTS: InstrumentDefinition[] = [
  // tvSymbol must name the SAME market the price comes from.
  //
  // The chart and the dealing price sat on different sources: gold charted
  // OANDA:XAUUSD (spot) while its price came from PAXG, so the two disagreed by
  // the token premium and a client saw two gold prices on one screen. Pointing
  // the chart at the source we actually quote makes them agree exactly. Any
  // future change to a price source has to move its tvSymbol with it.
  // basePrice is only the fallback anchor when every real source is
  // unreachable, and such a quote is always labelled 'simulated'. It still has
  // to be roughly true: these had drifted a long way from the market — gold
  // 2415.80 against 4573, USD/INR 84.15 against 95.77 — so an outage did not
  // just show an approximate price, it showed one 47% wrong. Re-anchored to
  // measured values on 2026-08-21. Worth refreshing if they drift again.
  { symbol: 'XAU/USD', name: 'Gold Spot / US Dollar',   category: 'Commodities', basePrice: 4573.90, volatility: 0.010, tvSymbol: 'BINANCE:PAXGUSDT' },
  { symbol: 'EUR/USD', name: 'Euro / US Dollar',        category: 'Forex',       basePrice: 1.16765, volatility: 0.004, tvSymbol: 'BINANCE:EURUSDT' },
  { symbol: 'GBP/USD', name: 'British Pound / US Dollar', category: 'Forex',     basePrice: 1.36303, volatility: 0.005, tvSymbol: 'FX:GBPUSD' },
  { symbol: 'USD/INR', name: 'US Dollar / Indian Rupee', category: 'Forex',      basePrice: 95.7700, volatility: 0.003, tvSymbol: 'FX_IDC:USDINR' },
  { symbol: 'BTC/USD', name: 'Bitcoin / US Dollar',     category: 'Crypto',      basePrice: 77332.0, volatility: 0.030, tvSymbol: 'BINANCE:BTCUSDT' },
  { symbol: 'WTI/USD', name: 'WTI Crude Oil Spot',      category: 'Commodities', basePrice: 86.3000, volatility: 0.018, tvSymbol: 'TVC:USOIL' },
];

export function findInstrument(symbol: string): InstrumentDefinition | undefined {
  return INSTRUMENTS.find((i) => i.symbol === symbol);
}

/** Stable per-symbol phase offset so instruments don't move in lockstep. */
function phaseFor(symbol: string): number {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = (hash * 31 + symbol.charCodeAt(i)) | 0;
  }
  return (Math.abs(hash) % 1000) / 1000 * Math.PI * 2;
}

/**
 * Simulated mid price at a point in time.
 * Three sine waves at different periods give movement that looks like a market
 * over seconds, minutes and hours without being random.
 */
export function simulatedMid(symbol: string, atMs: number = Date.now()): number {
  const instrument = findInstrument(symbol);
  if (!instrument) return 0;

  const phase = phaseFor(symbol);
  const t = atMs / 1000;

  const slow = Math.sin(t / 3600 + phase);        // ~1 hour cycle
  const medium = Math.sin(t / 300 + phase * 2);   // ~5 minute cycle
  const fast = Math.sin(t / 20 + phase * 3);      // ~20 second cycle

  const drift = slow * 0.6 + medium * 0.3 + fast * 0.1;
  const price = instrument.basePrice * (1 + drift * instrument.volatility);

  const decimals = instrument.basePrice >= 1000 ? 2 : instrument.basePrice >= 10 ? 3 : 5;
  const factor = 10 ** decimals;
  return Math.round(price * factor) / factor;
}

/** Mid price plus 24h change, for list views. */
export function simulatedSnapshot(symbol: string, atMs: number = Date.now()) {
  const instrument = findInstrument(symbol);
  if (!instrument) return null;

  const price = simulatedMid(symbol, atMs);
  const dayAgo = simulatedMid(symbol, atMs - 86_400_000);
  const change = price - dayAgo;

  return {
    symbol: instrument.symbol,
    name: instrument.name,
    category: instrument.category,
    tvSymbol: instrument.tvSymbol,
    price,
    change: Number(change.toFixed(instrument.basePrice >= 1000 ? 2 : 5)),
    changePercent: dayAgo ? Number(((change / dayAgo) * 100).toFixed(2)) : 0,
    high24h: Number((price * (1 + instrument.volatility * 0.5)).toFixed(2)),
    low24h: Number((price * (1 - instrument.volatility * 0.5)).toFixed(2)),
  };
}
