import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase-server';
import { log } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Resend delivery webhook.
 *
 * email_log records what we handed to Resend, which is not the same as what
 * reached the client. A sign-in code can be accepted by the API and then bounce,
 * be greylisted, or be dropped by the recipient's server. Since a client cannot
 * get into the platform without that email, we need the delivery outcome — and
 * that only ever arrives here, after the fact.
 *
 * This endpoint is public by necessity, so it trusts nothing until the Svix
 * signature verifies. An unsigned or badly-signed request is rejected before a
 * single field of the payload is read.
 */

/** Events we act on. Anything else is stored but does not change the summary. */
const TERMINAL_STATUS: Record<string, string> = {
  'email.delivered': 'delivered',
  'email.delivery_delayed': 'delayed',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
  'email.opened': 'opened',
  'email.clicked': 'clicked',
};

/** Later events must not overwrite a more meaningful earlier one. */
const STATUS_RANK: Record<string, number> = {
  queued: 0, opened: 1, clicked: 2, delayed: 3, delivered: 4, bounced: 5, complained: 6,
};

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Svix signature check (Resend signs with Svix).
 *
 * Signed content is `${id}.${timestamp}.${body}`, so the raw body must be used
 * exactly as received — parsing and re-serialising it changes the bytes and the
 * signature will never match.
 */
async function verifySignature(req: NextRequest, rawBody: string): Promise<
  { ok: true } | { ok: false; reason: string }
> {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return { ok: false, reason: 'RESEND_WEBHOOK_SECRET is not set' };

  const svixId = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return { ok: false, reason: 'missing svix headers' };
  }

  // Reject replays. Svix recommends a five-minute tolerance.
  const sentAt = Number(svixTimestamp) * 1000;
  if (!Number.isFinite(sentAt) || Math.abs(Date.now() - sentAt) > 5 * 60_000) {
    return { ok: false, reason: 'timestamp outside tolerance' };
  }

  // Secret is `whsec_<base64>`; the bytes after the prefix are the HMAC key.
  const keyBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const key = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(keyBytes).buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signed = `${svixId}.${svixTimestamp}.${rawBody}`;
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signed));
  const expected = Buffer.from(mac).toString('base64');

  // The header carries space-separated `v1,<sig>` pairs during key rotation.
  const provided = svixSignature
    .split(' ')
    .map((part) => part.split(',')[1])
    .filter(Boolean);

  const matched = provided.some((sig) => timingSafeEqual(sig, expected));
  return matched ? { ok: true } : { ok: false, reason: 'signature mismatch' };
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const verified = await verifySignature(req, rawBody);
  if (!verified.ok) {
    // Logged as a warning, not an error: an unsigned probe on a public endpoint
    // is expected background noise, but a sudden run of them is worth seeing.
    log.warn('resend-webhook', 'rejected unverified webhook', { reason: verified.reason });
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Malformed payload.' }, { status: 400 });
  }

  const type: string = event?.type ?? 'unknown';
  const data = event?.data ?? {};
  const messageId: string | null = data.email_id ?? data.id ?? null;
  const recipient: string | null = Array.isArray(data.to) ? data.to[0] : data.to ?? null;
  const occurredAt = event?.created_at ?? new Date().toISOString();

  if (!messageId) {
    // Nothing to correlate against — accept it so Resend stops retrying.
    log.warn('resend-webhook', 'event carried no message id', { type });
    return NextResponse.json({ received: true });
  }

  const db = getServiceClient();
  if (!db) return NextResponse.json({ error: 'Unavailable.' }, { status: 503 });

  try {
    const { data: logRow } = await db
      .from('email_log')
      .select('id, delivery_status, template, recipient')
      .eq('provider_message_id', messageId)
      .maybeSingle();

    // Append the raw event first. Even an event we cannot correlate is worth
    // keeping — it is the only record of what the provider actually reported.
    // The unique constraint makes Resend's retries idempotent.
    await db.from('email_events').upsert(
      {
        email_log_id: logRow?.id ?? null,
        provider_message_id: messageId,
        event_type: type,
        recipient,
        payload: data,
        occurred_at: occurredAt,
      },
      { onConflict: 'provider_message_id,event_type,occurred_at', ignoreDuplicates: true },
    );

    const nextStatus = TERMINAL_STATUS[type];

    if (logRow && nextStatus) {
      const current = logRow.delivery_status ?? 'queued';
      const patch: Record<string, unknown> = { last_event_at: occurredAt };

      // Only advance the summary — an 'opened' arriving after 'bounced' (they
      // can overlap in real mailflow) must not erase the bounce.
      if ((STATUS_RANK[nextStatus] ?? 0) >= (STATUS_RANK[current] ?? 0)) {
        patch.delivery_status = nextStatus;
      }

      if (type === 'email.delivered') patch.delivered_at = occurredAt;
      if (type === 'email.opened') patch.opened_at = occurredAt;
      if (type === 'email.clicked') patch.clicked_at = occurredAt;
      if (type === 'email.bounced' || type === 'email.complained') {
        patch.bounced_at = occurredAt;
        patch.bounce_reason =
          data?.bounce?.message ?? data?.reason ?? (type === 'email.complained' ? 'marked as spam' : 'bounced');
      }

      await db.from('email_log').update(patch).eq('id', logRow.id);

      // A bounced sign-in code means a real person is locked out right now, so
      // it is surfaced at error level rather than buried in the delivery table.
      if (type === 'email.bounced' || type === 'email.complained') {
        log.error('resend-webhook', `email ${type.replace('email.', '')}`, {
          template: logRow.template,
          recipient: logRow.recipient,
          reason: patch.bounce_reason,
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    // Return 500 so Resend retries — losing a delivery event silently is worse
    // than processing it twice, which the unique constraint already handles.
    log.error('resend-webhook', 'failed to record event', {
      type,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Could not record event.' }, { status: 500 });
  }
}

/** Resend probes the URL before saving it; without this the check fails. */
export async function GET() {
  return NextResponse.json({ endpoint: 'resend-webhook', status: 'ready' });
}
