import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase-server';
import { requireUser } from '@/lib/auth-server';
import { rateLimit } from '@/lib/rate-limit';
import { ok, fail, tooManyRequests, handleRouteError } from '@/lib/api';
import { buildAppSpecificLinks, buildUpiQrUrl, buildPaymentReference } from '@/lib/upi';
import { deriveFxRates } from '@/lib/pricing';
import { requireFlag } from '@/lib/feature-flags';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Build a UPI payment intent for a deposit.
 *
 * This produces a link and a QR — it does not create a transaction and does not
 * credit anything. There is no gateway and therefore no callback, so receipt is
 * confirmed by an operator against the bank statement. The reference returned
 * here is what makes that matching practical.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const blocked = await requireFlag('deposits', user.id);
    if (blocked) return fail(503, blocked);

    const limit = rateLimit(`payment-intent:${user.id}`, 30, 60 * 60);
    if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);

    const body = await req.json().catch(() => ({}));
    const amountINR = Number(body?.amountINR);

    if (!Number.isFinite(amountINR) || amountINR < 500 || amountINR > 10_000_000) {
      return fail(400, 'Enter an amount between ₹500 and ₹1,00,00,000.');
    }

    const db = getServiceClient();
    if (!db) return fail(503, 'Payments are not available right now.');

    const { data: settings } = await db
      .from('broker_payment_settings')
      .select('upi_id, account_holder, bank_name, account_number, ifsc_code, usd_to_inr_rate, inr_spread_deposit, inr_spread_withdrawal')
      .eq('id', 1)
      .maybeSingle();

    if (!settings?.upi_id) {
      return fail(503, 'No payment destination is configured. Contact support.');
    }

    const reference = buildPaymentReference(user.id, Date.now());

    const links = buildAppSpecificLinks({
      vpa: settings.upi_id,
      payeeName: settings.account_holder || 'Broker',
      amountINR,
      transactionRef: reference,
      note: `Deposit ${reference}`,
    });

    if (!links) {
      return fail(503, 'The configured UPI ID is invalid. Contact support.');
    }

    const fx = deriveFxRates(
      Number(settings.usd_to_inr_rate),
      Number(settings.inr_spread_deposit ?? 0),
      Number(settings.inr_spread_withdrawal ?? 0)
    );

    return ok({
      reference,
      amountINR,
      // Shown before paying so the client knows what they will receive.
      estimatedUSD: Number((amountINR / fx.deposit).toFixed(2)),
      appliedRate: fx.deposit,
      midRate: fx.mid,
      links,
      qrUrl: buildUpiQrUrl(links.generic),
      bankTransfer: {
        accountHolder: settings.account_holder,
        bankName: settings.bank_name,
        accountNumber: settings.account_number,
        ifscCode: settings.ifsc_code,
      },
      instructions:
        `Pay ₹${amountINR.toLocaleString('en-IN')} using the link or QR, then submit the 12-digit UTR from your payment app. ` +
        `Include reference ${reference} in the payment note if your app allows it. ` +
        `Funds are credited only after our desk confirms receipt — usually within a few minutes.`,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
