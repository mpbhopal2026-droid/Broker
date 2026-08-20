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

    // Exclude permanently purged / deleted users from admin view
    const visibleUsers = (data ?? []).filter((u: any) => {
      const email = (u.email || '').toLowerCase();
      const name = (u.full_name || '').toLowerCase();
      return !email.includes('purged.invalid') && !email.startsWith('purged_') && name !== 'purged user' && name !== 'deleted user';
    });

    return ok({ users: visibleUsers });
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

        // 0. Unlink any operator references where this user processed/reviewed records
        await db.from('transactions').update({ processed_by: null }).eq('processed_by', userId);
        await db.from('kyc_records').update({ reviewed_by: null }).eq('reviewed_by', userId);
        await db.from('ledger_entries').update({ created_by: null }).eq('created_by', userId);

        // 1. Delete demo trades
        await db.from('demo_trades').delete().eq('user_id', userId);
        // 2. Delete transactions, deposits & withdrawals
        await db.from('transactions').delete().eq('user_id', userId);
        // 3. Delete ledger entries (ON DELETE RESTRICT in DB)
        await db.from('ledger_entries').delete().eq('user_id', userId);
        // 4. Delete kyc records
        await db.from('kyc_records').delete().eq('user_id', userId);
        // 5. Delete legal, consent, and data requests
        await db.from('legal_acceptances').delete().eq('user_id', userId);
        await db.from('consent_logs').delete().eq('user_id', userId);
        await db.from('data_requests').delete().eq('user_id', userId);
        // 6. Delete active sessions and tokens
        await db.from('sessions').delete().eq('user_id', userId);
        // 7. Delete notifications and audit logs pointing to this user
        await db.from('notifications').delete().eq('user_id', userId);
        await db.from('audit_logs').delete().eq('user_id', userId);
        
        // 8. Delete ALL OTP records for this email/phone so they can cleanly re-register
        if (userEmail && !userEmail.includes('purged.invalid')) {
          await db.from('auth_otps').delete().or(`identifier.eq.${userEmail},email.eq.${userEmail}`);
        }
        if (userPhone) {
          await db.from('auth_otps').delete().eq('identifier', userPhone);
        }

        // 9. Try hard delete from profiles table
        const { error: profileError } = await db.from('profiles').delete().eq('id', userId);
        if (profileError) {
          console.warn('[admin] profile hard delete blocked, applying complete wipe:', profileError.message);
          const scrambled = `purged_${Date.now()}_${userId.slice(0, 8)}@purged.invalid`;
          await db.from('profiles').update({
            email: scrambled,
            phone: null,
            full_name: 'Purged User',
            is_active: false,
            wallet_balance: 0,
            kyc_status: 'not_submitted',
            email_verified: false,
            bank_account_name: null,
            bank_name: null,
            bank_account_number: null,
            bank_ifsc: null,
            user_upi_id: null,
          }).eq('id', userId);
        }

        // 10. Free the email in Supabase Auth so the address can register again.
        //
        // deleteUser() FAILS here whenever the profile above was scrambled
        // rather than hard-deleted, because profiles.id references
        // auth.users(id) and that row still exists. The old code swallowed that
        // error, which left the two out of step:
        //
        //   auth.users : veer@example.com          <- still the real address
        //   profiles   : purged_…@purged.invalid   <- scrambled
        //
        // An OTP for the real address then succeeded, the profile lookup missed,
        // and sign-in resolved back to the same auth id — logging the person
        // into the purged shell account. Verified in production.
        //
        // So: delete when we can, and when we cannot, scramble the auth email to
        // match. Either way the original address is released.
        const { error: authDeleteError } = await db.auth.admin.deleteUser(userId);

        if (authDeleteError) {
          const scrambledAuth = `purged_${Date.now()}_${userId.slice(0, 8)}@purged.invalid`;
          const { error: authUpdateError } = await db.auth.admin.updateUserById(userId, {
            email: scrambledAuth,
            email_confirm: false,
            user_metadata: { purged: true, purged_at: new Date().toISOString() },
          });

          if (authUpdateError) {
            // Do not claim success. A caller told the account is gone while the
            // address still authenticates is the worst possible outcome here.
            return fail(
              500,
              'The account was partially removed but the sign-in address could not be released. Do not re-register this address yet.',
            );
          }
        }

        await auditServer(req, 'ADMIN_USER_DELETED', {
          userId: admin.id,
          metadata: { deletedUserId: userId, targetEmail: target.email, completelyPurged: true },
        });

        return ok({ message: 'User account completely purged. The user must now re-register.' });
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

    await db.from('transactions').update({ processed_by: null }).eq('processed_by', userId);
    await db.from('kyc_records').update({ reviewed_by: null }).eq('reviewed_by', userId);
    await db.from('ledger_entries').update({ created_by: null }).eq('created_by', userId);

    await db.from('demo_trades').delete().eq('user_id', userId);
    await db.from('transactions').delete().eq('user_id', userId);
    await db.from('ledger_entries').delete().eq('user_id', userId);
    await db.from('kyc_records').delete().eq('user_id', userId);
    await db.from('legal_acceptances').delete().eq('user_id', userId);
    await db.from('consent_logs').delete().eq('user_id', userId);
    await db.from('data_requests').delete().eq('user_id', userId);
    await db.from('sessions').delete().eq('user_id', userId);
    await db.from('notifications').delete().eq('user_id', userId);
    await db.from('audit_logs').delete().eq('user_id', userId);

    if (userEmail && !userEmail.includes('purged.invalid')) {
      await db.from('auth_otps').delete().or(`identifier.eq.${userEmail},email.eq.${userEmail}`);
    }
    if (userPhone) {
      await db.from('auth_otps').delete().eq('identifier', userPhone);
    }

    const { error: profileError } = await db.from('profiles').delete().eq('id', userId);
    if (profileError) {
      const scrambled = `purged_${Date.now()}_${userId.slice(0, 8)}@purged.invalid`;
      await db.from('profiles').update({
        email: scrambled,
        phone: null,
        full_name: 'Purged User',
        is_active: false,
        wallet_balance: 0,
        kyc_status: 'not_submitted',
        email_verified: false,
        bank_account_name: null,
        bank_name: null,
        bank_account_number: null,
        bank_ifsc: null,
        user_upi_id: null,
      }).eq('id', userId);
    }

    try {
      await db.auth.admin.deleteUser(userId);
    } catch (authErr) {
      console.warn('[admin] auth.admin delete error:', authErr);
    }

  } catch (err) {
    return handleRouteError(err);
  }
}

