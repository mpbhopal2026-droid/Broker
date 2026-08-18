import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase-server';
import { requireAdmin, auditServer } from '@/lib/auth-server';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { escapeHtml } from '@/lib/crypto';
import { ok, fail, tooManyRequests, cleanString, handleRouteError } from '@/lib/api';
import { sendMail } from '@/lib/mailer';
import {
  buildDepositApprovalEmailHtml,
  buildWithdrawalStatusEmailHtml,
  buildKycStatusEmailHtml,
} from '@/lib/resend';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Operator-initiated client email.
 *
 * Three things changed from the previous version, which was an open relay:
 *   1. Admin session required — it was completely unauthenticated.
 *   2. The recipient is looked up from `profiles` by userId. The caller can no
 *      longer name an arbitrary `recipientEmail`, so this cannot be used to
 *      send mail to strangers from your verified domain.
 *   3. Custom message bodies are escaped and wrapped, not injected as raw HTML.
 */
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();

    const limit = rateLimit(`send-email:${admin.id}`, 60, 60 * 60);
    if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);

    const body = await req.json().catch(() => ({}));
    const { type, userId, payload } = body ?? {};

    if (typeof userId !== 'string' || !userId) {
      return fail(400, 'A target userId is required.');
    }

    const db = getServiceClient();
    if (!db) return fail(503, 'Email is not configured on this server.');

    const { data: recipient } = await db
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', userId)
      .maybeSingle();

    if (!recipient?.email) return fail(404, 'No such client.');

    const userName = recipient.full_name || 'Trader';
    let subject: string;
    let html: string;

    switch (type) {
      case 'deposit_approval':
        subject = 'Deposit approved and wallet credited | Global Forex';
        html = buildDepositApprovalEmailHtml({
          userName,
          amountINR: Number(payload?.amountINR) || 0,
          amountUSD: Number(payload?.amountUSD) || 0,
          utrNumber: cleanString(payload?.utrNumber, 40) || 'N/A',
          newBalanceUSD: Number(payload?.newBalanceUSD) || 0,
        });
        break;

      case 'withdrawal_status': {
        const status = payload?.status === 'completed' ? 'completed' : 'rejected';
        subject = `Withdrawal request ${status === 'completed' ? 'processed' : 'update'} | Global Forex`;
        html = buildWithdrawalStatusEmailHtml({
          userName,
          amountUSD: Number(payload?.amountUSD) || 0,
          amountINR: Number(payload?.amountINR) || 0,
          status,
          bankDetails: cleanString(payload?.bankDetails, 80) || 'Registered account',
          remarks: cleanString(payload?.remarks, 500) || undefined,
        });
        break;
      }

      case 'kyc_status': {
        const status = payload?.status === 'approved' ? 'approved' : 'rejected';
        subject = `KYC verification ${status} | Global Forex`;
        html = buildKycStatusEmailHtml({
          userName,
          status,
          documentType: cleanString(payload?.documentType, 40) || 'document',
          remarks: cleanString(payload?.remarks, 500) || undefined,
        });
        break;
      }

      case 'custom': {
        const message = cleanString(payload?.message, 4000);
        const customSubject = cleanString(payload?.subject, 160);
        if (!message || !customSubject) return fail(400, 'Subject and message are required.');

        subject = customSubject;
        // Escaped, then only newlines are turned back into markup. Admin input
        // is not trusted to carry HTML — an admin account is a compromise
        // target too, and this route reaches real client inboxes.
        html = `<div style="font-family: sans-serif; padding: 20px; color: #333; line-height: 1.6;">${escapeHtml(
          message
        ).replace(/\n/g, '<br/>')}</div>`;
        break;
      }

      default:
        return fail(400, 'Unknown email type.');
    }

    const result = await sendMail({
      to: recipient.email,
      subject,
      html,
      template: `admin_${type}`,
      userId: recipient.id,
    });

    await auditServer(req, 'ADMIN_EMAIL_SENT', {
      userId: admin.id,
      metadata: { type, recipientId: recipient.id, subject, mocked: result.mocked },
    });

    if (!result.ok) return fail(502, 'The email provider rejected the message.');

    return ok({ mocked: result.mocked });
  } catch (err) {
    return handleRouteError(err);
  }
}
