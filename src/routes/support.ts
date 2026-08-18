import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase-server';
import { requireUser, requireCapability, auditServer } from '@/lib/auth-server';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { ok, fail, tooManyRequests, cleanString, handleRouteError } from '@/lib/api';
import { log } from '@/lib/logger';
import { createSignedReadUrl, BUCKETS } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CATEGORIES = ['bug', 'payment', 'kyc', 'account', 'feature', 'other'];
const SEVERITIES = ['low', 'normal', 'high', 'blocker'];

/** Raise a support ticket or bug report. */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const limit = rateLimit(`support:${user.id}`, 10, 60 * 60);
    if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);

    const body = await req.json().catch(() => ({}));

    const subject = cleanString(body?.subject, 160);
    const description = cleanString(body?.description, 4000);
    const category = CATEGORIES.includes(body?.category) ? body.category : 'other';
    const severity = SEVERITIES.includes(body?.severity) ? body.severity : 'normal';

    if (!subject) return fail(400, 'Please give the issue a short title.');
    if (!description) return fail(400, 'Please describe what happened.');

    // A screenshot path is only accepted if it sits in the reporter's own
    // folder — otherwise a ticket could point at another user's upload.
    const screenshotPath = cleanString(body?.screenshotPath, 300);
    if (screenshotPath && !screenshotPath.startsWith(`${user.id}/`)) {
      return fail(400, 'Invalid screenshot reference.');
    }

    // Diagnostics are client-reported and therefore untrusted; they are stored
    // for debugging only and never drive a decision.
    const consoleErrors = Array.isArray(body?.consoleErrors)
      ? body.consoleErrors.slice(0, 20).map((e: unknown) => String(e).slice(0, 500))
      : [];

    const db = getServiceClient();
    if (!db) return fail(503, 'Support is unavailable right now.');

    const { data: ticket, error } = await db
      .from('support_tickets')
      .insert({
        user_id: user.id,
        reporter_role: user.role,
        reporter_email: user.email,
        category,
        severity,
        subject,
        description,
        screenshot_path: screenshotPath ?? null,
        page_url: cleanString(body?.pageUrl, 500),
        user_agent: req.headers.get('user-agent')?.slice(0, 500) ?? null,
        viewport: cleanString(body?.viewport, 40),
        app_role: process.env.APP_ROLE ?? 'client',
        console_errors: consoleErrors,
      })
      .select('id, created_at')
      .single();

    if (error || !ticket) {
      log.error('support', 'failed to create ticket', { userId: user.id, error: String(error?.message) });
      return fail(500, 'Could not submit your report. Please try again.');
    }

    await auditServer(req, 'SUPPORT_TICKET_CREATED', {
      userId: user.id,
      metadata: { ticketId: ticket.id, category, severity, hasScreenshot: Boolean(screenshotPath) },
    });

    log.info('support', `new ${severity} ${category} ticket`, {
      userId: user.id,
      ticketId: ticket.id,
      subject,
      ip: clientIp(req),
    });

    return ok({
      ticketId: ticket.id,
      // Short human-quotable reference.
      reference: `SUP-${ticket.id.slice(0, 8).toUpperCase()}`,
      message: 'Thanks — your report has been sent to our team.',
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

/**
 * List tickets.
 * Clients see their own. Anyone with 'logs:view' (developer) sees all,
 * with signed screenshot URLs resolved for them.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const db = getServiceClient();
    if (!db) return fail(503, 'Not available.');

    const wantsAll = req.nextUrl.searchParams.get('scope') === 'all';

    if (wantsAll) await requireCapability('logs:view');

    let query = db
      .from('support_tickets')
      .select('id, user_id, reporter_role, reporter_email, category, severity, subject, description, screenshot_path, page_url, user_agent, viewport, console_errors, status, developer_notes, created_at, resolved_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (!wantsAll) query = query.eq('user_id', user.id);

    const status = req.nextUrl.searchParams.get('status');
    if (status && ['open', 'in_progress', 'resolved', 'closed', 'wont_fix'].includes(status)) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) return fail(500, 'Could not load tickets.');

    // Resolve screenshots to short-lived signed URLs. Sequential rather than
    // parallel to avoid a burst of signing calls on a 200-row page.
    const tickets = [];
    for (const row of data ?? []) {
      let screenshotUrl: string | null = null;
      if (row.screenshot_path) {
        screenshotUrl = await createSignedReadUrl(BUCKETS.support, row.screenshot_path, 300);
      }
      tickets.push({
        id: row.id,
        reference: `SUP-${row.id.slice(0, 8).toUpperCase()}`,
        reporterRole: row.reporter_role,
        reporterEmail: wantsAll ? row.reporter_email : undefined,
        category: row.category,
        severity: row.severity,
        subject: row.subject,
        description: row.description,
        screenshotUrl,
        pageUrl: row.page_url,
        userAgent: wantsAll ? row.user_agent : undefined,
        viewport: row.viewport,
        consoleErrors: wantsAll ? row.console_errors : undefined,
        status: row.status,
        developerNotes: row.developer_notes,
        createdAt: row.created_at,
        resolvedAt: row.resolved_at,
      });
    }

    return ok({ tickets });
  } catch (err) {
    return handleRouteError(err);
  }
}

/** Update ticket status / notes. Developer only. */
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireCapability('logs:view');
    const db = getServiceClient();
    if (!db) return fail(503, 'Not available.');

    const body = await req.json().catch(() => ({}));
    const ticketId = cleanString(body?.ticketId, 64);
    const status = body?.status;
    const notes = cleanString(body?.developerNotes, 2000);

    if (!ticketId) return fail(400, 'ticketId is required.');

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (status) {
      if (!['open', 'in_progress', 'resolved', 'closed', 'wont_fix'].includes(status)) {
        return fail(400, 'Invalid status.');
      }
      update.status = status;
      update.assigned_to = user.id;
      if (status === 'resolved' || status === 'closed') {
        update.resolved_at = new Date().toISOString();
      }
    }

    if (notes !== null) update.developer_notes = notes;
    if (Object.keys(update).length === 1) return fail(400, 'Nothing to update.');

    const { error } = await db.from('support_tickets').update(update).eq('id', ticketId);
    if (error) return fail(500, 'Could not update the ticket.');

    await auditServer(req, 'SUPPORT_TICKET_UPDATED', {
      userId: user.id,
      metadata: { ticketId, status },
    });

    return ok({ message: 'Ticket updated.' });
  } catch (err) {
    return handleRouteError(err);
  }
}
