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
      .select('id, email, phone, role, is_active')
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

      case 'update_role': {
        const newRole = cleanString(body?.role, 32);
        if (!newRole || !['client', 'staff', 'admin'].includes(newRole)) {
          return fail(400, 'Invalid role specified.');
        }

        if (target.id === admin.id && newRole !== 'admin') {
          return fail(400, 'You cannot remove your own admin privileges.');
        }

        const { error } = await db.from('profiles').update({ role: newRole, updated_at: new Date().toISOString() }).eq('id', userId);
        if (error) return fail(500, 'Could not update user role.');

        await auditServer(req, 'ADMIN_USER_ROLE_UPDATED', {
          userId: admin.id,
          metadata: { targetUserId: userId, targetEmail: target.email, previousRole: target.role, newRole },
        });

        return ok({ message: `User role updated to ${newRole}.` });
      }

      case 'add_staff': {
        const staffEmail = cleanString(body?.email, 120)?.toLowerCase().trim();
        const staffName = cleanString(body?.fullName, 120)?.trim();
        const staffPhone = cleanString(body?.phone, 24)?.trim();

        if (!staffEmail || !staffName) {
          return fail(400, 'Staff email and full name are required.');
        }

        const { data: existingUser } = await db.from('profiles').select('id, email, role').eq('email', staffEmail).maybeSingle();

        if (existingUser) {
          await db.from('profiles').update({
            role: 'staff',
            full_name: staffName,
            ...(staffPhone ? { phone: staffPhone } : {}),
            updated_at: new Date().toISOString(),
          }).eq('id', existingUser.id);

          await auditServer(req, 'ADMIN_STAFF_PROMOTED', {
            userId: admin.id,
            metadata: { targetUserId: existingUser.id, targetEmail: staffEmail },
          });

          return ok({ message: `Existing user promoted to Staff Operator.` });
        } else {
          const newId = crypto.randomUUID();
          const { error: createError } = await db.from('profiles').insert({
            id: newId,
            email: staffEmail,
            full_name: staffName,
            phone: staffPhone || null,
            role: 'staff',
            is_active: true,
            email_verified: true,
            wallet_balance: 0,
            kyc_status: 'approved',
          });

          if (createError) return fail(500, 'Could not create staff record: ' + createError.message);

          await auditServer(req, 'ADMIN_STAFF_CREATED', {
            userId: admin.id,
            metadata: { targetUserId: newId, targetEmail: staffEmail },
          });

          return ok({ message: `Staff operator onboarded successfully.` });
        }
      }

      case 'delete_user': {
        if (userId === admin.id) return fail(400, 'You cannot delete your own admin account.');

        const userEmail = target.email?.toLowerCase().trim();
        const userPhone = target.phone;

        // 1. Delete trade orders & positions
        await db.from('trade_orders').delete().eq('user_id', userId);
        // 2. Delete transactions & deposits & withdrawals
        await db.from('transactions').delete().eq('user_id', userId);
        // 3. Delete ledger entries
        await db.from('ledger_entries').delete().eq('user_id', userId);
        // 4. Delete kyc documents & records
        await db.from('kyc_documents').delete().eq('user_id', userId);
        await db.from('kyc_records').delete().eq('user_id', userId);
        // 5. Delete active sessions and tokens
        await db.from('sessions').delete().eq('user_id', userId);
        // 6. Delete notifications
        await db.from('notifications').delete().eq('user_id', userId);
        
        // 7. Delete ALL OTP records for this email/phone so they can cleanly re-register
        if (userEmail) {
          await db.from('auth_otps').delete().or(`identifier.eq.${userEmail},email.eq.${userEmail}`);
        }
        if (userPhone) {
          await db.from('auth_otps').delete().eq('identifier', userPhone);
        }

        // 8. Delete from profiles table
        const { error: profileError } = await db.from('profiles').delete().eq('id', userId);
        if (profileError) {
          console.error('[admin] profile delete failed:', profileError);
        }

        // 9. Permanently delete from Supabase Auth so the user MUST re-register
        try {
          await db.auth.admin.deleteUser(userId);
        } catch (authErr) {
          console.warn('[admin] auth.admin.deleteUser skipped or failed:', authErr);
        }

        await auditServer(req, 'ADMIN_USER_DELETED', {
          userId: admin.id,
          metadata: { deletedUserId: userId, targetEmail: target.email, completelyPurged: true },
        });

        return ok({ message: 'User account completely removed. The user must now re-register.' });
      }

      default:
        return fail(400, 'Unknown action.');
    }
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const db = getServiceClient();
    if (!db) return fail(503, 'Not available.');

    const body = await req.json().catch(() => ({}));
    const userId = cleanString(body?.userId, 64);
    if (!userId) return fail(400, 'userId is required.');
    if (userId === admin.id) return fail(400, 'You cannot delete your own admin account.');

    const { data: target } = await db
      .from('profiles')
      .select('id, email, phone')
      .eq('id', userId)
      .maybeSingle();

    if (!target) return fail(404, 'No such client.');

    const userEmail = target.email?.toLowerCase().trim();
    const userPhone = target.phone;

    await db.from('trade_orders').delete().eq('user_id', userId);
    await db.from('transactions').delete().eq('user_id', userId);
    await db.from('ledger_entries').delete().eq('user_id', userId);
    await db.from('kyc_documents').delete().eq('user_id', userId);
    await db.from('kyc_records').delete().eq('user_id', userId);
    await db.from('sessions').delete().eq('user_id', userId);
    await db.from('notifications').delete().eq('user_id', userId);

    if (userEmail) {
      await db.from('auth_otps').delete().or(`identifier.eq.${userEmail},email.eq.${userEmail}`);
    }
    if (userPhone) {
      await db.from('auth_otps').delete().eq('identifier', userPhone);
    }

    const { error } = await db.from('profiles').delete().eq('id', userId);
    if (error) return fail(500, 'Could not delete user: ' + error.message);

    try {
      await db.auth.admin.deleteUser(userId);
    } catch (authErr) {
      console.warn('[admin] auth.admin.deleteUser skipped or failed:', authErr);
    }

    await auditServer(req, 'ADMIN_USER_DELETED', {
      userId: admin.id,
      metadata: { deletedUserId: userId, targetEmail: target.email, completelyPurged: true },
    });

    return ok({ message: 'User account completely removed. The user must now re-register.' });
  } catch (err) {
    return handleRouteError(err);
  }
}

