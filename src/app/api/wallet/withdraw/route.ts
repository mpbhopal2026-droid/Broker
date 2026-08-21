import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase-server';
import { requireUser, auditServer } from '@/lib/auth-server';
import { rateLimit } from '@/lib/rate-limit';
import { ok, fail, tooManyRequests, cleanString, handleRouteError } from '@/lib/api';
import { operatorAlerts } from '@/lib/notify';
import { deriveFxRates } from '@/lib/pricing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIN_USD = 10;

/**
 * Request a payout.
 *
 * Funds are debited immediately through post_ledger_entry, which takes a row
 * lock on the profile. That lock is what stops the classic double-spend: two
 * concurrent requests can no longer both read the same balance, both pass the
 * sufficient-funds check, and both succeed.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const limit = rateLimit(`withdraw:${user.id}`, 5, 60 * 60);
    if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);

    if (user.kycStatus !== 'approved') {
      return fail(403, 'KYC verification must be approved before you can withdraw.');
    }

    const body = await req.json().catch(() => ({}));
    const amountUSD = Number(body?.amountUSD);
    const details = body?.details ?? {};

    if (!Number.isFinite(amountUSD) || amountUSD < MIN_USD) {
      return fail(400, `Minimum withdrawal is $${MIN_USD}.`);
    }

    const db = getServiceClient();
    if (!db) return fail(503, 'Withdrawals are not available right now.');

    // The destination is the account REGISTERED ON THE PROFILE, never the one
    // in the request body.
    //
    // This route previously paid out to whatever bank details the request
    // carried. A stolen session could therefore send a client's balance to any
    // account of the attacker's choosing in a single call, without ever
    // touching the registered one — which made the payout account collected
    // during onboarding decorative rather than a control.
    //
    // Reading the destination server-side means an attacker must first change
    // the payout account through the profile route, which is audited and
    // notifies the client. That converts a silent one-step theft into a
    // visible two-step one.
    const { data: payee } = await db
      .from('profiles')
      .select('bank_name, bank_account_number, bank_ifsc, full_name')
      .eq('id', user.id)
      .maybeSingle();

    const bankName = cleanString(payee?.bank_name, 120);
    const accountNumber = cleanString(payee?.bank_account_number, 34);
    const ifscCode = cleanString(payee?.bank_ifsc, 15);
    // Payouts go to the verified account holder — the client themselves. A
    // caller-supplied name would allow third-party payouts, which is both an
    // AML problem and an easy way to launder a compromised account.
    const accountHolder = cleanString(payee?.full_name, 120);
    const upiId = cleanString(details?.upiId, 80);

    if (!bankName || !accountHolder || !accountNumber || !ifscCode) {
      return fail(
        400,
        'Add your withdrawal bank account in your profile before requesting a payout.',
      );
    }
    if (!/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(ifscCode)) {
      return fail(400, 'The bank account saved on your profile has an invalid IFSC code.');
    }
    if (!/^\d{6,20}$/.test(accountNumber)) {
      return fail(400, 'The bank account saved on your profile is invalid.');
    }

    const { data: settings } = await db
      .from('broker_payment_settings')
      .select('usd_to_inr_rate, inr_spread_deposit, inr_spread_withdrawal')
      .eq('id', 1)
      .maybeSingle();

    // Withdrawals convert at the SELL rate (mid - spread).
    const fx = deriveFxRates(
      Number(settings?.usd_to_inr_rate),
      Number(settings?.inr_spread_deposit ?? 0),
      Number(settings?.inr_spread_withdrawal ?? 0)
    );
    const rate = fx.withdrawal;

    const { data: tx, error: txError } = await db
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'withdrawal',
        amount: amountUSD,
        amount_inr: Number((amountUSD * rate).toFixed(2)),
        withdrawal_account_details: { bankName, accountHolder, accountNumber, ifscCode, upiId },
        status: 'pending',
      })
      .select('id')
      .single();

    if (txError || !tx) {
      console.error('[wallet] withdrawal insert failed:', txError);
      return fail(500, 'Could not record your request. Please try again.');
    }

    // Reserve the funds. If this fails the balance was insufficient — roll the
    // request back so no orphan pending row is left behind.
    const { data: newBalance, error: ledgerError } = await db.rpc('post_ledger_entry', {
      p_user_id: user.id,
      p_direction: 'debit',
      p_amount: amountUSD,
      p_reason: 'Withdrawal requested',
      p_reference_type: 'transaction',
      p_reference_id: tx.id,
      p_created_by: user.id,
    });

    if (ledgerError) {
      await db.from('transactions').delete().eq('id', tx.id);
      const insufficient = String(ledgerError.message || '').includes('insufficient');
      await auditServer(req, 'WITHDRAWAL_REJECTED_AT_ENTRY', {
        userId: user.id,
        metadata: { amountUSD, reason: ledgerError.message },
      });
      return fail(insufficient ? 400 : 500, insufficient ? 'Insufficient wallet balance.' : 'Could not process the request.');
    }

    await auditServer(req, 'WITHDRAWAL_REQUESTED', {
      userId: user.id,
      metadata: { transactionId: tx.id, amountUSD, balanceAfter: newBalance },
    });

    // The balance is already debited at this point and the client is waiting on
    // a payout, so this is the most time-sensitive alert on the platform.
    operatorAlerts.withdrawalRequested(user.fullName || user.email, amountUSD);

    return ok({
      transactionId: tx.id,
      newBalance,
      appliedRate: rate,
      midRate: fx.mid,
      spread: fx.spreadWithdrawal,
      payoutINR: Number((amountUSD * rate).toFixed(2)),
      message: 'Withdrawal requested. Funds are on hold pending payout approval.',
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
