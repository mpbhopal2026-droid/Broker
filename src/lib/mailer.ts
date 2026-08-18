import 'server-only';

import { resendClient, isResendConfigured, FROM_EMAIL } from './resend';
import { getServiceClient } from './supabase-server';
import { log } from './logger';

/**
 * Internal send helper. Called only from server-side code that has already
 * decided *who* the recipient is — never from a request body.
 *
 * Every attempt is recorded in `email_log` with its outcome. The body is
 * deliberately NOT stored: it contains OTPs, balances and personal data, and a
 * log table is a softer target than the mail provider. Subject and template
 * name are enough to answer "did the client get their OTP?".
 */

export interface SendMailParams {
  to: string;
  subject: string;
  html: string;
  /** Template identifier for the delivery log, e.g. 'login_otp'. */
  template: string;
  userId?: string | null;
}

export interface SendMailResult {
  ok: boolean;
  mocked: boolean;
  error?: string;
}

async function recordDelivery(params: {
  recipient: string;
  userId?: string | null;
  template: string;
  subject: string;
  status: 'sent' | 'failed' | 'mocked';
  providerMessageId?: string | null;
  error?: string | null;
  durationMs: number;
}) {
  const db = getServiceClient();
  if (!db) return;

  try {
    await db.from('email_log').insert({
      recipient: params.recipient,
      user_id: params.userId ?? null,
      template: params.template,
      subject: params.subject,
      status: params.status,
      provider_message_id: params.providerMessageId ?? null,
      error: params.error ? String(params.error).slice(0, 1000) : null,
      duration_ms: params.durationMs,
    });
  } catch (err) {
    log.error('mailer', 'failed to record email delivery', { template: params.template, err: String(err) });
  }
}

export async function sendMail(params: SendMailParams): Promise<SendMailResult> {
  const startedAt = Date.now();

  if (!isResendConfigured || !resendClient) {
    log.info('mailer', 'email provider not configured; simulated send', {
      template: params.template,
      recipient: params.to,
    });
    await recordDelivery({
      recipient: params.to,
      userId: params.userId,
      template: params.template,
      subject: params.subject,
      status: 'mocked',
      durationMs: Date.now() - startedAt,
    });
    return { ok: true, mocked: true };
  }

  try {
    const { data, error } = await resendClient.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    const durationMs = Date.now() - startedAt;

    if (error) {
      log.error('mailer', 'provider rejected send', { template: params.template, error: error.message });
      await recordDelivery({
        recipient: params.to,
        userId: params.userId,
        template: params.template,
        subject: params.subject,
        status: 'failed',
        error: error.message,
        durationMs,
      });
      return { ok: false, mocked: false, error: error.message };
    }

    await recordDelivery({
      recipient: params.to,
      userId: params.userId,
      template: params.template,
      subject: params.subject,
      status: 'sent',
      providerMessageId: data?.id ?? null,
      durationMs,
    });

    return { ok: true, mocked: false };
  } catch (err: any) {
    const durationMs = Date.now() - startedAt;
    log.error('mailer', 'send threw', { template: params.template, error: String(err?.message ?? err) });
    await recordDelivery({
      recipient: params.to,
      userId: params.userId,
      template: params.template,
      subject: params.subject,
      status: 'failed',
      error: err?.message ?? 'send failed',
      durationMs,
    });
    return { ok: false, mocked: false, error: err?.message || 'send failed' };
  }
}

/** Fire-and-forget for non-critical mail: never let a mail outage fail the action. */
export function sendMailBestEffort(params: SendMailParams): void {
  void sendMail(params).catch((err) =>
    log.error('mailer', 'best-effort send failed', { template: params.template, error: String(err) })
  );
}
