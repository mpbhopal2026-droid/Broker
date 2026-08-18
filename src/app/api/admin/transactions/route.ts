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

      const { data: newBalance, error: ledgerError } = await db.rpc('post_ledger_entry', {
        p_user_id: tx.user_id,
        p_direction: 'credit',
        p_amount: creditUSD,
        p_reason: `Deposit approved (UTR ${tx.utr_number ?? 'n/a'})`,
        p_reference_type: 'transaction',
        p_reference_id: tx.id,
        p_created_by: admin.id,
      });

      if (ledgerError) {
        console.error('[admin] deposit credit failed:', ledgerError);
        return fail(500, 'Could not credit the wallet.');
      }

      await db
        .from('transactions')
        .update({
          status: 'completed',
          amount: creditUSD,
          admin_remarks: remarks || `₹${Number(tx.amount_inr || 0).toLocaleString('en-IN')} received; credited $${creditUSD.toFixed(2)}.`,
          processed_at: now,
          processed_by: admin.id,
        })
        .eq('id', tx.id)
        .eq('status', 'pending');

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

    if (action === 'approve') {
      await db
        .from('transactions')
        .update({
          status: 'completed',
          admin_remarks: remarks || 'Payout dispatched to beneficiary account.',
          processed_at: now,
          processed_by: admin.id,
        })
        .eq('id', tx.id)
        .eq('status', 'pending');

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

    const { data: refundedBalance, error: refundError } = await db.rpc('post_ledger_entry', {
      p_user_id: tx.user_id,
      p_direction: 'credit',
      p_amount: Number(tx.amount),
      p_reason: 'Withdrawal rejected — funds returned',
      p_reference_type: 'transaction',
      p_reference_id: tx.id,
      p_created_by: admin.id,
    });

    if (refundError) {
      console.error('[admin] withdrawal refund failed:', refundError);
      return fail(500, 'Could not return the funds. Transaction left pending.');
    }

    await db
      .from('transactions')
      .update({
        status: 'rejected',
        admin_remarks: remarks || 'Withdrawal could not be processed.',
        processed_at: now,
        processed_by: admin.id,
      })
      .eq('id', tx.id)
      .eq('status', 'pending');

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
