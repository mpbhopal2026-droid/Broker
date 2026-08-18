/**
 * UPI deep links for collecting payments without a payment gateway.
 *
 * A `upi://pay?...` URI opens the user's installed UPI app (GPay, PhonePe,
 * Paytm, BHIM) with the payee, amount and note prefilled. On desktop the same
 * string is rendered as a QR code to scan.
 *
 * What this does NOT do — and it matters:
 *
 *   There is no callback. UPI intent links are fire-and-forget: the payer's
 *   app talks to the bank, not to us, so nothing tells the server that money
 *   arrived. The `tr` (transaction reference) below is our own id echoed
 *   through the payment note, which helps a human match a bank statement line
 *   to a deposit record — but it is a reconciliation aid, never proof of
 *   payment. Credit only after an operator confirms receipt in the bank
 *   account. That is exactly what the deposit approval flow does.
 */

export interface UpiLinkParams {
  /** Payee VPA, e.g. 'merchant@hdfcbank'. */
  vpa: string;
  /** Payee display name shown in the payer's app. */
  payeeName: string;
  /** Amount in INR. Omit to let the payer type it. */
  amountINR?: number;
  /** Our reference, echoed back on the bank statement where the bank supports it. */
  transactionRef?: string;
  /** Short note shown to the payer. */
  note?: string;
}

/** UPI IDs are `handle@psp`. Reject anything else before building a link. */
export function isValidVpa(vpa: string): boolean {
  return /^[\w.\-]{2,64}@[A-Za-z]{2,64}$/.test(vpa.trim());
}

/**
 * Build a `upi://pay` URI.
 * Returns null for an invalid VPA rather than emitting a broken link that
 * silently fails to open, or worse, opens with the wrong payee.
 */
export function buildUpiLink(params: UpiLinkParams): string | null {
  const vpa = params.vpa?.trim();
  if (!vpa || !isValidVpa(vpa)) return null;

  const query = new URLSearchParams();
  query.set('pa', vpa);
  query.set('pn', sanitiseText(params.payeeName, 50) || 'Merchant');
  query.set('cu', 'INR');

  if (params.amountINR !== undefined && Number.isFinite(params.amountINR) && params.amountINR > 0) {
    // Two decimals exactly — some PSP apps reject other formats.
    query.set('am', params.amountINR.toFixed(2));
  }
  if (params.transactionRef) {
    query.set('tr', sanitiseText(params.transactionRef, 35));
  }
  if (params.note) {
    query.set('tn', sanitiseText(params.note, 50));
  }

  return `upi://pay?${query.toString()}`;
}

/** App-specific schemes. Some Android builds ignore the generic intent. */
export function buildAppSpecificLinks(params: UpiLinkParams) {
  const generic = buildUpiLink(params);
  if (!generic) return null;

  const query = generic.split('?')[1];
  return {
    generic,
    gpay: `tez://upi/pay?${query}`,
    phonepe: `phonepe://pay?${query}`,
    paytm: `paytmmp://pay?${query}`,
  };
}

/**
 * QR image URL for a UPI link.
 *
 * Uses a third-party renderer (api.qrserver.com), which means the UPI string —
 * payee VPA, amount, reference — is sent to that service. It contains no
 * client personal data, but for a production deployment prefer generating the
 * QR locally with a library so nothing leaves your infrastructure.
 */
export function buildUpiQrUrl(upiLink: string, size = 300): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(upiLink)}`;
}

/**
 * Short, human-readable reference for matching a bank line to a deposit.
 * Uppercase alphanumeric only — UPI note fields mangle punctuation.
 */
export function buildPaymentReference(userId: string, at: number): string {
  const userPart = userId.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase();
  const timePart = at.toString(36).toUpperCase().slice(-6);
  return `DEP${userPart}${timePart}`;
}

function sanitiseText(value: string, maxLength: number): string {
  return String(value ?? '')
    .replace(/[^\w\s.\-@]/g, '')
    .trim()
    .slice(0, maxLength);
}
