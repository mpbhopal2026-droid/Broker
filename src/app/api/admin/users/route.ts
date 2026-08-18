import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase-server';
import { requireAdmin, auditServer } from '@/lib/auth-server';
import { ok, fail, cleanString, handleRouteError } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();
    const db = getServiceClient();
    if (!db) return fail(503, 'Not available.');

    const { data, error } = await db
      .from('profiles')
      .select('id, full_name, email, phone, role, kyc_status, wallet_balance, is_active, email_verified, city, state, address, postal_code, bank_account_name, bank_name, bank_account_number, bank_ifsc, user_upi_id, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) return fail(500, 'Could not load clients.');
    return ok({ users: data ?? [] });
  } catch (err) {
    return handleRouteError(err);
  }
}

/**
 * Administrative actions on a client account.
 *
 * Deliberately narrow. There is no "set balance" action: money moves only
 * through the ledger, so a correction is posted as an adjustment entry with a
 * mandatory reason and shows up in the client's statement. Silent balance
 * edits are exactly what an audit trail exists to prevent.
 */
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const db = getServiceClient();
    if (!db) return fail(503, 'Not available.');

    const body = await req.json().catch(() => ({}));
    const userId = cleanString(body?.userId, 64);
    const action = body?.action;

    if (!userId) return fail(400, 'userId is required.');

    const { data: target } = await db
      .from('profiles')
      .select('id, email, role, is_active')
      .eq('id', userId)
      .maybeSingle();

    if (!target) return fail(404, 'No such client.');

    switch (action) {
      case 'suspend':
      case 'reactivate': {
        const isActive = action === 'reactivate';

        if (target.role === 'admin' && target.id === admin.id) {
          return fail(400, 'You cannot suspend your own admin account.');
        }

        await db.from('profiles').update({ is_active: isActive }).eq('id', userId);

        // Suspension must also kill live sessions, or the user keeps working
        // until their cookie happens to expire.
        if (!isActive) {
          await db
            .from('sessions')
            .update({ revoked_at: new Date().toISOString() })
            .eq('user_id', userId)
            .is('revoked_at', null);
        }

        await auditServer(req, isActive ? 'ADMIN_USER_REACTIVATED' : 'ADMIN_USER_SUSPENDED', {
          userId: admin.id,
          metadata: { targetUserId: userId, targetEmail: target.email },
        });

        return ok({ message: isActive ? 'Account reactivated.' : 'Account suspended and sessions revoked.' });
      }

      case 'adjust_balance': {
        const delta = Number(body?.deltaUSD);
        const reason = cleanString(body?.reason, 300);

        if (!Number.isFinite(delta) || delta === 0) return fail(400, 'Enter a non-zero adjustment.');
        if (!reason) return fail(400, 'A reason is required for every balance adjustment.');

        const { data: newBalance, error } = await db.rpc('post_ledger_entry', {
          p_user_id: userId,
          p_direction: delta > 0 ? 'credit' : 'debit',
          p_amount: Math.abs(delta),
          p_reason: `Manual adjustment: ${reason}`,
          p_reference_type: 'admin_adjustment',
          p_reference_id: null,
          p_created_by: admin.id,
        });

        if (error) {
          const insufficient = String(error.message || '').includes('insufficient');
          return fail(insufficient ? 400 : 500, insufficient ? 'Insufficient balance for this debit.' : 'Adjustment failed.');
        }

        await auditServer(req, 'ADMIN_BALANCE_ADJUSTED', {
          userId: admin.id,
          metadata: { targetUserId: userId, deltaUSD: delta, reason, balanceAfter: newBalance },
        });

        return ok({ message: 'Adjustment posted to the ledger.', newBalance });
      }

      case 'update_profile': {
        // Contact/KYC-adjacent fields an operator may legitimately correct.
        // Note what is not here: role, wallet_balance, kyc_status, email.
        // Balance changes go through 'adjust_balance' so they hit the ledger;
        // KYC status changes go through the review route so they are reviewed.
        const update: Record<string, unknown> = {};
        const allowed: Array<[string, string, number]> = [
          ['fullName', 'full_name', 120],
          ['phone', 'phone', 24],
          ['city', 'city', 80],
          ['state', 'state', 80],
          ['address', 'address', 255],
          ['postalCode', 'postal_code', 12],
          ['bankAccountName', 'bank_account_name', 120],
          ['bankName', 'bank_name', 120],
          ['bankAccountNumber', 'bank_account_number', 34],
          ['bankIfsc', 'bank_ifsc', 15],
          ['userUpiId', 'user_upi_id', 80],
        ];

        for (const [key, column, max] of allowed) {
          const value = cleanString(body?.[key], max);
          if (value) update[column] = value;
        }

        const rejected = Object.keys(body ?? {}).filter(
          (k) => !['userId', 'action', ...allowed.map(([key]) => key)].includes(k)
        );

        if (Object.keys(update).length === 0) return fail(400, 'Nothing to update.');
        update.updated_at = new Date().toISOString();

        const { error } = await db.from('profiles').update(update).eq('id', userId);
        if (error) return fail(500, 'Could not update the client record.');

        await auditServer(req, 'ADMIN_CLIENT_PROFILE_UPDATED', {
          userId: admin.id,
          metadata: {
            targetUserId: userId,
            fields: Object.keys(update).filter((k) => k !== 'updated_at'),
            ignoredFields: rejected,
          },
        });

        return ok({
          message: 'Client record updated.',
          ignored: rejected.length ? rejected : undefined,
        });
      }

      default:
        return fail(400, 'Unknown action.');
    }
  } catch (err) {
    return handleRouteError(err);
  }
}
