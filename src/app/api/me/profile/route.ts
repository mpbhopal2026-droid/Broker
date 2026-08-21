import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase-server';
import { requireUser, auditServer } from '@/lib/auth-server';
import { notifications, operatorAlerts } from '@/lib/notify';
import { rateLimit } from '@/lib/rate-limit';
import { ok, fail, tooManyRequests, cleanString, handleRouteError } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Self-service profile update.
 *
 * The allow-list below is the whole security control: `role`, `wallet_balance`,
 * `kyc_status`, `email` and `is_active` are simply not reachable from here, so
 * a crafted request body cannot promote an account or mint a balance. The
 * database enforces the same rule independently via column GRANTs and a
 * trigger, so a bug here is not sufficient on its own.
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();

    const limit = rateLimit(`profile:${user.id}`, 30, 60 * 60);
    if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);

    const body = await req.json().catch(() => ({}));
    const update: Record<string, unknown> = {};

    const fullName = cleanString(body?.fullName, 120);
    if (fullName) update.full_name = fullName;

    const phone = cleanString(body?.phone, 24);
    if (phone) {
      if (!/^[+\d][\d\s-]{7,23}$/.test(phone)) return fail(400, 'Enter a valid phone number.');
      update.phone = phone;
    }

    const city = cleanString(body?.city, 80);
    if (city) update.city = city;

    const state = cleanString(body?.state, 80);
    if (state) update.state = state;

    const bankAccountName = cleanString(body?.bankAccountName, 120);
    if (bankAccountName) update.bank_account_name = bankAccountName;

    const bankName = cleanString(body?.bankName, 120);
    if (bankName) update.bank_name = bankName;

    const bankAccountNumber = cleanString(body?.bankAccountNumber, 34);
    if (bankAccountNumber) {
      if (!/^\d{6,20}$/.test(bankAccountNumber)) return fail(400, 'Enter a valid bank account number.');
      update.bank_account_number = bankAccountNumber;
    }

    const bankIfsc = cleanString(body?.bankIfsc, 15);
    if (bankIfsc) {
      if (!/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(bankIfsc)) return fail(400, 'Enter a valid IFSC code.');
      update.bank_ifsc = bankIfsc.toUpperCase();
    }

    const upi = cleanString(body?.userUpiId, 80);
    if (upi) {
      if (!/^[\w.\-]{2,64}@[A-Za-z]{2,64}$/.test(upi)) return fail(400, 'Enter a valid UPI ID.');
      update.user_upi_id = upi;
    }

    if (['beginner', 'intermediate', 'expert'].includes(body?.tradingExperience)) {
      update.trading_experience = body.tradingExperience;
    }
    if (['conservative', 'moderate', 'aggressive'].includes(body?.riskTolerance)) {
      update.risk_tolerance = body.riskTolerance;
    }

    if (Object.keys(update).length === 0) return fail(400, 'Nothing to update.');

    update.updated_at = new Date().toISOString();

    const db = getServiceClient();
    if (!db) return fail(503, 'Not available.');

    const { error } = await db.from('profiles').update(update).eq('id', user.id);
    if (error) {
      console.error('[profile] update failed:', error);
      return fail(500, 'Could not save your changes.');
    }

    await auditServer(req, 'USER_PROFILE_UPDATED', {
      userId: user.id,
      metadata: { fields: Object.keys(update).filter((k) => k !== 'updated_at') },
    });

    // Withdrawals pay to the account stored here, so a change to it is the
    // move an attacker holding a stolen session makes before draining the
    // balance. Alert the client and the desk while it is still recoverable.
    // The account number is masked — a notification should not be a way to
    // read back the full number.
    if (update.bank_account_number || update.bank_ifsc) {
      const acct = String(update.bank_account_number ?? '');
      const masked = acct ? `••••${acct.slice(-4)}` : 'a new account';
      notifications.payoutAccountChanged(user.id, masked);
      operatorAlerts.payoutAccountChanged(user.fullName || user.email, masked);
    }

    return ok({ message: 'Profile updated.' });
  } catch (err) {
    return handleRouteError(err);
  }
}
