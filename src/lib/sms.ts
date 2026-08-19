import 'server-only';

import { log } from './logger';

/**
 * SMS delivery.
 *
 * Two providers because the sensible choice differs by market: MSG91 is cheap
 * and reliable for Indian numbers and handles DLT template registration, which
 * TRAI requires for transactional SMS to Indian subscribers; Twilio is the
 * fallback for international numbers.
 *
 * With neither configured, sends are logged and reported as mocked — the same
 * shape as the mailer, so local development is not a dead end and a missing
 * provider never silently swallows a login code.
 */

export type SmsProvider = 'msg91' | 'twilio' | 'none';

export function activeSmsProvider(): SmsProvider {
  if (process.env.MSG91_AUTH_KEY) return 'msg91';
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) return 'twilio';
  return 'none';
}

export interface SendSmsResult {
  ok: boolean;
  mocked: boolean;
  error?: string;
}

/**
 * Normalise to E.164.
 *
 * A bare 10-digit number is assumed Indian, which is the overwhelmingly common
 * case here — but an explicit +country prefix always wins, so an international
 * client is never silently rewritten into a wrong Indian number.
 */
export function normalisePhone(raw: string): string | null {
  const trimmed = String(raw ?? '').replace(/[\s()-]/g, '');
  if (!trimmed) return null;

  if (trimmed.startsWith('+')) {
    return /^\+[1-9]\d{7,14}$/.test(trimmed) ? trimmed : null;
  }
  // 0-prefixed domestic form, e.g. 09876543210
  if (/^0\d{10}$/.test(trimmed)) return `+91${trimmed.slice(1)}`;
  // Bare Indian mobile: 10 digits starting 6-9
  if (/^[6-9]\d{9}$/.test(trimmed)) return `+91${trimmed}`;
  // Already has 91 but no plus
  if (/^91[6-9]\d{9}$/.test(trimmed)) return `+${trimmed}`;

  // "91+9979388603" — the plus typed after the country code rather than before.
  // Real numbers arrived in this shape, and rejecting them meant the account
  // was created with an unusable number that phone sign-in could never match.
  if (/^91\+[6-9]\d{9}$/.test(trimmed)) return `+${trimmed.replace('+', '')}`;

  return null;
}

/** Last 4 digits only, for logs and audit metadata. */
export function maskPhone(e164: string): string {
  return e164.length > 4 ? `${'•'.repeat(e164.length - 4)}${e164.slice(-4)}` : e164;
}

export async function sendSms(params: { to: string; message: string; otp?: string }): Promise<SendSmsResult> {
  const provider = activeSmsProvider();

  if (provider === 'none') {
    // Never log the code itself in production paths; this branch only runs when
    // no provider exists, i.e. local development.
    log.info('sms', 'no provider configured; simulated send', { to: maskPhone(params.to) });
    console.log(`[sms:mock] to=${params.to} message="${params.message}"`);
    return { ok: true, mocked: true };
  }

  try {
    if (provider === 'msg91') return await sendViaMsg91(params);
    return await sendViaTwilio(params);
  } catch (err: any) {
    log.error('sms', 'send threw', { provider, to: maskPhone(params.to), error: String(err?.message ?? err) });
    return { ok: false, mocked: false, error: err?.message ?? 'SMS send failed' };
  }
}

async function sendViaMsg91(params: { to: string; message: string; otp?: string }): Promise<SendSmsResult> {
  const authKey = process.env.MSG91_AUTH_KEY!;
  const templateId = process.env.MSG91_TEMPLATE_ID;
  const senderId = process.env.MSG91_SENDER_ID || 'GLBFRX';

  // MSG91 wants the number without the leading '+'.
  const mobile = params.to.replace(/^\+/, '');

  // TRAI requires transactional SMS to Indian numbers to use a registered DLT
  // template. With a template id we use the OTP endpoint; without one we fall
  // back to the plain flow, which will be rejected for Indian numbers until a
  // template is registered.
  const url = templateId
    ? 'https://control.msg91.com/api/v5/otp'
    : 'https://control.msg91.com/api/v5/flow/';

  const body = templateId
    ? { template_id: templateId, mobile, otp: params.otp, sender: senderId }
    : { sender: senderId, mobiles: mobile, message: params.message };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', authkey: authKey },
    body: JSON.stringify(body),
  });

  const payload = await res.json().catch(() => ({}));

  if (!res.ok || payload?.type === 'error') {
    const message = payload?.message ?? `MSG91 returned ${res.status}`;
    log.error('sms', 'msg91 rejected send', { to: maskPhone(params.to), error: message });
    return { ok: false, mocked: false, error: String(message) };
  }

  return { ok: true, mocked: false };
}

async function sendViaTwilio(params: { to: string; message: string }): Promise<SendSmsResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!from) return { ok: false, mocked: false, error: 'TWILIO_FROM_NUMBER is not set.' };

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: params.to, From: from, Body: params.message }),
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    const message = payload?.message ?? `Twilio returned ${res.status}`;
    log.error('sms', 'twilio rejected send', { to: maskPhone(params.to), error: message });
    return { ok: false, mocked: false, error: String(message) };
  }

  return { ok: true, mocked: false };
}

export function buildOtpSms(code: string, appName = 'Global Forex'): string {
  return `${code} is your ${appName} verification code. It expires in 10 minutes. We will never ask you for this code.`;
}
