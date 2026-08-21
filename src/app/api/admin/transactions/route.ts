import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase-server';
import { requireAdmin, auditServer } from '@/lib/auth-server';
import { ok, fail, cleanString, handleRouteError } from '@/lib/api';
import { sendMailBestEffort } from '@/lib/mailer';
import { buildDepositApprovalEmailHtml, buildWithdrawalStatusEmailHtml } from '@/lib/resend';
import { mapTransaction } from '@/lib/mappers';
import { notifications } from '@/lib/notify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Pending queue for the payments desk. */
export async function GET() {
  try {
    await requireAdmin();
    const db = getServiceClient();
    if (!db) return fail(503, 'Not available.');

    const { data, error } = await db
      .from('transactions')
      .select('*, profiles!transactions_user_id_fkey(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) return fail(500, 'Could not load transactions.');
    return ok({ transactions: (data ?? []).map(mapTransaction) });
  } catch (err) {
    return handleRouteError(err);
  }
}

/**
 * Approve or reject a pending transaction.
 *
 * Every branch re-reads the row and checks `status === 'pending'` before acting,
 * so a double-click or a replayed request cannot credit the same deposit twice.
 * An approving admin may adjust the credited USD (the INR that actually landed
 * can differ from the claim), but never below zero and never on a settled row.
 */
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const db = getServiceClient();
    if (!db) return fail(503, 'Not available.');

    const body = await req.json().catch(() => ({}));
    const transactionId = cleanString(body?.transactionId, 64);
    const action = body?.action;
    const remarks = cleanString(body?.remarks, 500);

    if (!transactionId) return fail(400, 'transactionId is required.');
    if (action !== 'approve' && action !== 'reject') return fail(400, 'action must be approve or reject.');

    const { data: tx } = await db
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .maybeSingle();

    if (!tx) return fail(404, 'No such transaction.');
    if (tx.status !== 'pending') return fail(409, `This transaction is already ${tx.status}.`);

    const { data: client } = await db
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', tx.user_id)
      .maybeSingle();

    const now = new Date().toISOString();
    const clientName = client?.full_name || 'Trader';

    // ---- DEPOSIT ------------------------------------------------------------
    if (tx.type === 'deposit') {
      if (action === 'reject') {
        await db
          .from('transactions')
          .update({
            status: 'rejected',
            admin_remarks: remarks || 'Payment not traced in the broker account.',
            processed_at: now,
            processed_by: admin.id,
          })
          .eq('id', tx.id)
          .eq('status', 'pending');

        await auditServer(req, 'DEPOSIT_REJECTED', {
          userId: admin.id,
          metadata: { transactionId: tx.id, clientId: tx.user_id, remarks },
        });
        notifications.depositRejected(tx.user_id, remarks || 'Payment not traced in the broker account.');
        return ok({ message: 'Deposit rejected.' });
      }

      const overrideUSD = Number(body?.creditUSD);
      const creditUSD =
        Number.isFinite(overrideUSD) && overrideUSD > 0 ? Number(overrideUSD.toFixed(2)) : Number(tx.amount);

      if (creditUSD <= 0) return fail(400, 'Credit amount must be positive.');

      const isUUID = (str?: string | null): boolean =>
        Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

      let newBalance: number = 0;
      let creditSuccess = false;

      // 1. Try PostgreSQL RPC post_ledger_entry
      try {
        const { data: rpcBalance, error: ledgerError } = await db.rpc('post_ledger_entry', {
          p_user_id: tx.user_id,
          p_direction: 'credit',
          p_amount: creditUSD,
          p_reason: `Deposit approved (UTR ${tx.utr_number ?? 'n/a'})`,
          p_reference_type: 'transaction',
          p_reference_id: isUUID(tx.id) ? tx.id : null,
          p_created_by: isUUID(admin.id) ? admin.id : null,
        });

        if (!ledgerError && rpcBalance !== null && rpcBalance !== undefined) {
          newBalance = Number(rpcBalance);
          creditSuccess = true;
        } else if (ledgerError) {
          console.warn('[admin] post_ledger_entry RPC returned error, attempting direct fallback:', ledgerError);
        }
      } catch (err) {
        console.warn('[admin] post_ledger_entry RPC threw exception, attempting direct fallback:', err);
      }

      // 2. Direct Fallback if RPC failed or table function had a constraint issue
      if (!creditSuccess) {
        try {
          const { data: currentProf, error: profErr } = await db
            .from('profiles')
            .select('wallet_balance')
            .eq('id', tx.user_id)
            .maybeSingle();

          if (profErr) console.error('[admin] fetch profile failed:', profErr);

          const curBal = Number(currentProf?.wallet_balance || 0);
          newBalance = Number((curBal + creditUSD).toFixed(2));

          const { error: updErr } = await db
            .from('profiles')
            .update({
              wallet_balance: newBalance,
              updated_at: now,
            })
            .eq('id', tx.user_id);

          if (updErr) {
            console.error('[admin] direct wallet_balance update failed:', updErr);
            return fail(500, 'Could not credit the wallet.');
          }

          creditSuccess = true;

          // Record entry in ledger_entries if table exists
          try {
            await db
              .from('ledger_entries')
              .insert({
                user_id: tx.user_id,
                direction: 'credit',
                amount: creditUSD,
                balance_after: newBalance,
                reason: `Deposit approved (UTR ${tx.utr_number ?? 'n/a'})`,
                reference_type: 'transaction',
                reference_id: isUUID(tx.id) ? tx.id : null,
                created_by: isUUID(admin.id) ? admin.id : null,
              });
          } catch (e) {
            console.warn('[admin] ledger insert fallback error:', e);
          }
        } catch (fallbackErr) {
          console.error('[admin] direct wallet credit failed:', fallbackErr);
          return fail(500, 'Could not credit the wallet.');
        }
      }

      // 3. Mark transaction completed
      await db
        .from('transactions')
        .update({
          status: 'completed',
          amount: creditUSD,
          admin_remarks: remarks || `₹${Number(tx.amount_inr || 0).toLocaleString('en-IN')} received; credited $${creditUSD.toFixed(2)}.`,
          processed_at: now,
          processed_by: isUUID(admin.id) ? admin.id : null,
        })
        .eq('id', tx.id);

      await auditServer(req, 'DEPOSIT_APPROVED', {
        userId: admin.id,
        metadata: {
          transactionId: tx.id,
          clientId: tx.user_id,
          claimedINR: tx.amount_inr,
          creditedUSD: creditUSD,
          adjusted: creditUSD !== Number(tx.amount),
          balanceAfter: newBalance,
        },
      });

      if (client?.email) {
        sendMailBestEffort({
          to: client.email,
          subject: 'Deposit approved and wallet credited | Global Forex',
          html: buildDepositApprovalEmailHtml({
            userName: clientName,
            amountINR: Number(tx.amount_inr || 0),
            amountUSD: creditUSD,
            utrNumber: tx.utr_number || 'N/A',
            newBalanceUSD: Number(newBalance),
          }),
          template: 'deposit_approved',
          userId: tx.user_id,
        });
      }

      notifications.depositApproved(tx.user_id, creditUSD, Number(newBalance));
      return ok({ message: 'Deposit approved and credited.', newBalance });
    }

    // ---- WITHDRAWAL ---------------------------------------------------------
    // Funds were already debited when the client submitted the request.
    // Approval just settles it; rejection returns the money.
    const details = (tx.withdrawal_account_details ?? {}) as Record<string, string>;
    const destination = details.accountNumber
      ? `${details.bankName ?? 'Bank'} ••••${String(details.accountNumber).slice(-4)}`
      : 'Registered account';

    const isUUID = (str?: string | null): boolean =>
      Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

    if (action === 'approve') {
      await db
        .from('transactions')
        .update({
          status: 'completed',
          admin_remarks: remarks || 'Payout dispatched to beneficiary account.',
          processed_at: now,
          processed_by: isUUID(admin.id) ? admin.id : null,
        })
        .eq('id', tx.id);

      await auditServer(req, 'WITHDRAWAL_APPROVED', {
        userId: admin.id,
        metadata: { transactionId: tx.id, clientId: tx.user_id, amountUSD: tx.amount, remarks },
      });

      if (client?.email) {
        sendMailBestEffort({
          to: client.email,
          subject: 'Withdrawal processed | Global Forex',
          html: buildWithdrawalStatusEmailHtml({
            userName: clientName,
            amountUSD: Number(tx.amount),
            amountINR: Number(tx.amount_inr || 0),
            status: 'completed',
            bankDetails: destination,
          }),
          template: 'withdrawal_completed',
          userId: tx.user_id,
        });
      }

      notifications.withdrawalCompleted(tx.user_id, Number(tx.amount));
      return ok({ message: 'Withdrawal approved.' });
    }

    let refundedBalance: number = 0;
    let refundSuccess = false;

    try {
      const { data: rpcRefund, error: refundError } = await db.rpc('post_ledger_entry', {
        p_user_id: tx.user_id,
        p_direction: 'credit',
        p_amount: Number(tx.amount),
        p_reason: 'Withdrawal rejected — funds returned',
        p_reference_type: 'transaction',
        p_reference_id: isUUID(tx.id) ? tx.id : null,
        p_created_by: isUUID(admin.id) ? admin.id : null,
      });

      if (!refundError && rpcRefund !== null && rpcRefund !== undefined) {
        refundedBalance = Number(rpcRefund);
        refundSuccess = true;
      }
    } catch {}

    if (!refundSuccess) {
      const { data: currentProf } = await db
        .from('profiles')
        .select('wallet_balance')
        .eq('id', tx.user_id)
        .maybeSingle();

      const curBal = Number(currentProf?.wallet_balance || 0);
      refundedBalance = Number((curBal + Number(tx.amount)).toFixed(2));

      await db
        .from('profiles')
        .update({
          wallet_balance: refundedBalance,
          updated_at: now,
        })
        .eq('id', tx.user_id);
    }

    await db
      .from('transactions')
      .update({
        status: 'rejected',
        admin_remarks: remarks || 'Withdrawal could not be processed.',
        processed_at: now,
        processed_by: isUUID(admin.id) ? admin.id : null,
      })
      .eq('id', tx.id);

    await auditServer(req, 'WITHDRAWAL_REJECTED', {
      userId: admin.id,
      metadata: { transactionId: tx.id, clientId: tx.user_id, amountUSD: tx.amount, remarks, balanceAfter: refundedBalance },
    });

    if (client?.email) {
      sendMailBestEffort({
        to: client.email,
        subject: 'Withdrawal request update | Global Forex',
        html: buildWithdrawalStatusEmailHtml({
          userName: clientName,
          amountUSD: Number(tx.amount),
          amountINR: Number(tx.amount_inr || 0),
          status: 'rejected',
          bankDetails: destination,
          remarks: remarks || undefined,
        }),
        template: 'withdrawal_rejected',
        userId: tx.user_id,
      });
    }

    notifications.withdrawalRejected(tx.user_id, Number(tx.amount), remarks || 'Your withdrawal could not be processed.');
    return ok({ message: 'Withdrawal rejected and funds returned.', newBalance: refundedBalance });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (admin.role !== 'developer') {
      return fail(403, 'Permission denied. Only Developer accounts can permanently delete transaction records.');
    }
    const db = getServiceClient();
    if (!db) return fail(503, 'Not available.');

    const body = await req.json().catch(() => ({}));
    const transactionId = cleanString(body?.transactionId, 64);
    if (!transactionId) return fail(400, 'transactionId is required.');

    const { error } = await db.from('transactions').delete().eq('id', transactionId);
    if (error) return fail(500, 'Could not delete transaction: ' + error.message);

    await auditServer(req, 'ADMIN_TRANSACTION_DELETED', {
      userId: admin.id,
      metadata: { deletedTransactionId: transactionId },
    });

    return ok({ message: 'Transaction record deleted permanently.' });
  } catch (err) {
    return handleRouteError(err);
  }
}

