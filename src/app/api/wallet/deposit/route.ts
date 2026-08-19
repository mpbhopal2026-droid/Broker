import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase-server';
import { requireUser, auditServer } from '@/lib/auth-server';
import { rateLimit } from '@/lib/rate-limit';
import { ok, fail, tooManyRequests, cleanString, handleRouteError } from '@/lib/api';
import { deriveFxRates } from '@/lib/pricing';
import { verifyUploadedFile, BUCKETS } from '@/lib/storage';
import { operatorAlerts } from '@/lib/notify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIN_INR = 500;
const MAX_INR = 10_000_000;

/**
 * Record a deposit claim. Credits nothing — the wallet moves only when an
 * administrator confirms the money actually arrived. The client-supplied INR
 * amount is a claim, not a fact.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const limit = rateLimit(`deposit:${user.id}`, 10, 60 * 60);
    if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);

    const body = await req.json().catch(() => ({}));
    const amountINR = Number(body?.amountINR);
    const paymentMode = cleanString(body?.paymentMode, 60);
    const utrNumber = cleanString(body?.utrNumber, 40);
    const proofImagePath = cleanString(body?.proofImagePath, 500);

    if (!Number.isFinite(amountINR) || amountINR < MIN_INR || amountINR > MAX_INR) {
      return fail(400, `Enter an amount between ₹${MIN_INR.toLocaleString('en-IN')} and ₹${MAX_INR.toLocaleString('en-IN')}.`);
    }
    if (!utrNumber || !/^[A-Za-z0-9]{6,40}$/.test(utrNumber)) {
      return fail(400, 'Enter the UTR / reference number from your payment.');
    }

    if (!proofImagePath) {
      return fail(400, 'Payment proof screenshot is mandatory to verify and credit your deposit.');
    }

    const verdict = await verifyUploadedFile(BUCKETS.proof, proofImagePath, user.id);
    if (!verdict.ok) return fail(400, verdict.error);

    const db = getServiceClient();
    if (!db) return fail(503, 'Deposits are not available right now.');

    // The conversion rate comes from the server, never the browser — otherwise
    // a client could claim any exchange rate they liked.
    const { data: settings } = await db
      .from('broker_payment_settings')
      .select('usd_to_inr_rate, inr_spread_deposit, inr_spread_withdrawal')
      .eq('id', 1)
      .maybeSingle();

    // Deposits convert at the BUY rate (mid + spread), which is the desk's
    // buffer for executing the matching real transaction. The rate applied is
    // returned to the client so the cost is visible, not silent.
    const fx = deriveFxRates(
      Number(settings?.usd_to_inr_rate),
      Number(settings?.inr_spread_deposit ?? 0),
      Number(settings?.inr_spread_withdrawal ?? 0)
    );
    const rate = fx.deposit;
    const estimatedUSD = Number((amountINR / rate).toFixed(2));

    const { data: existing } = await db
      .from('transactions')
      .select('id')
      .eq('utr_number', utrNumber)
      .eq('status', 'completed')
      .maybeSingle();

    if (existing) return fail(409, 'That UTR has already been credited.');

    const { data: tx, error } = await db
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'deposit',
        amount: estimatedUSD,
        amount_inr: amountINR,
        payment_mode: paymentMode,
        utr_number: utrNumber,
        proof_image_path: proofImagePath,
        status: 'pending',
      })
      .select('id, created_at')
      .single();

    if (error || !tx) {
      console.error('[wallet] deposit insert failed:', error);
      return fail(500, 'Could not record your deposit. Please try again.');
    }

    await auditServer(req, 'DEPOSIT_CLAIM_SUBMITTED', {
      userId: user.id,
      metadata: { transactionId: tx.id, amountINR, estimatedUSD, utrNumber, rate, midRate: fx.mid },
    });

    // Tell the desk. Without this the claim sat in the queue unannounced: the
    // client believes someone is looking at their money, while the operator
    // finds out whenever they next happen to open /admin.
    operatorAlerts.depositSubmitted(user.fullName || user.email, amountINR, utrNumber);

    return ok({
      transactionId: tx.id,
      estimatedUSD,
      appliedRate: rate,
      midRate: fx.mid,
      spread: fx.spreadDeposit,
      message: 'Deposit submitted. It will be credited once our payments desk confirms receipt.',
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
