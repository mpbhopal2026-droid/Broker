/**
 * Spread and quote pricing.
 *
 * Clients never transact at the mid price. They buy at mid + spread and sell at
 * mid - spread, and the difference is the dealing desk's buffer for executing
 * the matching real-world transaction. That is ordinary broker mechanics.
 *
 * Two rules make it ordinary rather than not:
 *
 *   1. The spread is fixed BEFORE the client commits and is shown to them.
 *      Deciding the price after seeing which way the market moved is a
 *      different thing entirely, and nothing here supports it.
 *
 *   2. It is symmetric and bounded. Both legs come from the same configured
 *      numbers, capped in the database (±₹5 on FX, 200bps on instruments), so a
 *      mistyped value cannot quietly take a large cut.
 */

export interface FxRates {
  mid: number;
  /** Rate applied when the client BUYS USD (deposits INR). Higher = fewer USD. */
  deposit: number;
  /** Rate applied when the client SELLS USD (withdraws to INR). Lower = fewer INR. */
  withdrawal: number;
  spreadDeposit: number;
  spreadWithdrawal: number;
}

export const FX_SPREAD_CAP = 5.0; // rupees, mirrors the DB CHECK constraint

/**
 * Derive the two client-facing USD/INR rates from the mid rate.
 *
 * Deposit:    ₹84.50 mid + ₹0.50 = ₹85.00 per USD  (client gets slightly less USD)
 * Withdrawal: ₹84.50 mid - ₹0.50 = ₹84.00 per USD  (client gets slightly less INR)
 */
export function deriveFxRates(
  mid: number,
  spreadDeposit: number,
  spreadWithdrawal: number
): FxRates {
  const safeMid = Number.isFinite(mid) && mid > 0 ? mid : 84.5;
  const sd = clamp(spreadDeposit, 0, FX_SPREAD_CAP);
  const sw = clamp(spreadWithdrawal, 0, FX_SPREAD_CAP);

  return {
    mid: safeMid,
    deposit: round(safeMid + sd, 4),
    withdrawal: round(Math.max(0.01, safeMid - sw), 4),
    spreadDeposit: sd,
    spreadWithdrawal: sw,
  };
}

export interface BidAsk {
  mid: number;
  /** Price the client BUYS at (higher). */
  ask: number;
  /** Price the client SELLS at (lower). */
  bid: number;
  spreadBps: number;
  /** Absolute spread in price units, for display. */
  spreadAbsolute: number;
}

/**
 * Derive bid/ask from a mid price and a spread in basis points.
 * Half the spread is applied to each side, so the mid stays the midpoint.
 */
export function deriveBidAsk(mid: number, spreadBps: number): BidAsk {
  const safeMid = Number.isFinite(mid) && mid > 0 ? mid : 0;
  const bps = clamp(spreadBps, 0, 500);
  const half = (safeMid * bps) / 10_000 / 2;
  const precision = pricePrecision(safeMid);

  return {
    mid: safeMid,
    ask: round(safeMid + half, precision),
    bid: round(Math.max(0, safeMid - half), precision),
    spreadBps: bps,
    spreadAbsolute: round(half * 2, precision),
  };
}

/** The price a client pays/receives for a given side. */
export function executionPrice(quote: BidAsk, side: 'BUY' | 'SELL'): number {
  return side === 'BUY' ? quote.ask : quote.bid;
}

/**
 * Unrealised P&L on a leveraged position, in quote currency.
 *
 * Closing crosses the spread in the opposite direction, so a position opened at
 * the ask and closed at the bid starts slightly negative. That is real and is
 * not hidden here — showing a position as flat at open would misstate it.
 */
export function positionPnl(params: {
  side: 'BUY' | 'SELL';
  entryPrice: number;
  currentQuote: BidAsk;
  margin: number;
  leverage: number;
}): number {
  const { side, entryPrice, currentQuote, margin, leverage } = params;
  if (!entryPrice || !margin) return 0;

  // Closing a long means selling (bid); closing a short means buying (ask).
  const closePrice = side === 'BUY' ? currentQuote.bid : currentQuote.ask;
  const move = side === 'BUY' ? closePrice - entryPrice : entryPrice - closePrice;
  const notional = margin * leverage;

  return round((move / entryPrice) * notional, 2);
}

/** Sensible decimal places for a price of this magnitude. */
export function pricePrecision(price: number): number {
  if (price >= 1000) return 2;
  if (price >= 10) return 3;
  return 5;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
