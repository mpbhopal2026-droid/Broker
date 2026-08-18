import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase-server';
import { requireUser, auditServer } from '@/lib/auth-server';
import { rateLimit } from '@/lib/rate-limit';
import { ok, fail, tooManyRequests, cleanString, handleRouteError } from '@/lib/api';
import { sendMailBestEffort } from '@/lib/mailer';
import { buildDataRequestAckEmailHtml } from '@/lib/resend';
import { GRIEVANCE_OFFICER } from '@/lib/legal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_TYPES = ['access', 'correction', 'erasure', 'grievance', 'consent_withdrawal'] as const;

/**
 * Data-principal requests under DPDP Act 2023 ss.11-13.
 *
 * Every request is logged with a statutory due date so an unanswered one is
 * queryable rather than invisible. Erasure is handled asynchronously by the
 * compliance desk because financial records carry their own retention
 * obligations — an account cannot simply be deleted on demand while a
 * transaction history must legally be kept.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const limit = rateLimit(`dpdp:${user.id}`, 10, 24 * 60 * 60);
    if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);

    const body = await req.json().catch(() => ({}));
    const requestType = body?.requestType;
    const details = cleanString(body?.details, 4000);

    if (!VALID_TYPES.includes(requestType)) {
      return fail(400, 'Choose a valid request type.');
    }
    if ((requestType === 'correction' || requestType === 'grievance') && !details) {
      return fail(400, 'Please describe what you would like corrected or raised.');
    }

    const db = getServiceClient();
    if (!db) return fail(503, 'Not available right now.');

    const dueAt = new Date(Date.now() + GRIEVANCE_OFFICER.responseDays * 86_400_000);

    const { data: request, error } = await db
      .from('data_requests')
      .insert({
        user_id: user.id,
        email: user.email,
        request_type: requestType,
        details,
        status: 'received',
        due_at: dueAt.toISOString(),
      })
      .select('id, created_at, due_at')
      .single();

    if (error || !request) {
      console.error('[dpdp] request insert failed:', error);
      return fail(500, 'Could not log your request. Please try again.');
    }

    if (requestType === 'erasure') {
      await db
        .from('profiles')
        .update({ erasure_requested_at: new Date().toISOString() })
        .eq('id', user.id);
    }

    await auditServer(req, 'DPDP_REQUEST_SUBMITTED', {
      userId: user.id,
      metadata: { requestId: request.id, requestType },
    });

    sendMailBestEffort({
      to: user.email,
      subject: 'We received your data request | Global Forex',
      html: buildDataRequestAckEmailHtml({
        userName: user.fullName,
        requestType: requestType.replace('_', ' '),
        referenceId: request.id,
        dueDate: new Date(request.due_at).toDateString(),
      }),
      template: 'dpdp_request_ack',
      userId: user.id,
    });

    return ok({
      requestId: request.id,
      dueAt: request.due_at,
      message: `Request logged. We will respond by ${new Date(request.due_at).toDateString()}.`,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

/** The client's own request history. */
export async function GET() {
  try {
    const user = await requireUser();
    const db = getServiceClient();
    if (!db) return fail(503, 'Not available.');

    const { data } = await db
      .from('data_requests')
      .select('id, request_type, status, details, resolution_notes, created_at, due_at, resolved_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    return ok({ requests: data ?? [] });
  } catch (err) {
    return handleRouteError(err);
  }
}
