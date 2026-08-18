import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase-server';
import { auditServer } from '@/lib/auth-server';
import { randomNumericCode, hmacSign } from '@/lib/crypto';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { ok, fail, tooManyRequests, normaliseEmail, cleanString, handleRouteError } from '@/lib/api';
import { sendMail } from '@/lib/mailer';
import { buildOtpEmailHtml } from '@/lib/resend';
import { sendSms, normalisePhone, maskPhone, buildOtpSms } from '@/lib/sms';
import { configFailureMessage } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const OTP_TTL_MINUTES = 10;

/**
 * Issue a login/verification code over email or SMS.
 *
 * The code is generated here, HMAC-hashed with the server secret, and sent. It
 * is never returned in the response and never rendered in the UI — that was the
 * central flaw in the old flow, which printed the code on screen and accepted
 * the constants 1234 / 123456 forever.
 *
 * Both channels share one code path. SMS therefore inherits the same single
 * use, 10-minute TTL, 5-attempt lock and rate limiting rather than getting a
 * parallel implementation that could drift.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);

    const ipLimit = rateLimit(`otp:req:ip:${ip}`, 10, 15 * 60);
    if (!ipLimit.allowed) return tooManyRequests(ipLimit.retryAfterSeconds);

    const body = await req.json().catch(() => ({}));
    const purpose = body?.purpose === 'email_verify' ? 'email_verify' : 'login';
    const channel: 'email' | 'sms' = body?.channel === 'sms' ? 'sms' : 'email';

    let identifier: string | null;
    if (channel === 'sms') {
      identifier = normalisePhone(cleanString(body?.phone, 24) ?? '');
      if (!identifier) return fail(400, 'Enter a valid mobile number.');
    } else {
      identifier = normaliseEmail(body?.email);
      if (!identifier) return fail(400, 'Enter a valid email address.');
    }

    const idLimit = rateLimit(`otp:req:id:${identifier}`, 3, 15 * 60);
    if (!idLimit.allowed) return tooManyRequests(idLimit.retryAfterSeconds);

    // Say what is actually wrong. A generic 503 here sent people hunting
    // through application code for a missing environment variable.
    const configError = configFailureMessage();
    if (configError) return fail(503, configError);

    const db = getServiceClient();
    const secret = process.env.SESSION_SECRET;
    if (!db || !secret) return fail(503, 'Sign-in is unavailable: the server is not fully configured.');

    // Smart Check: For login purpose, verify user exists in profiles
    if (purpose === 'login') {
      const { data: profile } = await (channel === 'sms'
        ? db.from('profiles').select('id, is_active').eq('phone', identifier).maybeSingle()
        : db.from('profiles').select('id, is_active').eq('email', identifier).maybeSingle());

      if (!profile) {
        return ok({
          channel,
          userExists: false,
          message: `No account found for this ${channel === 'sms' ? 'mobile number' : 'email'}. Redirecting to registration...`,
        });
      }

      if (profile.is_active === false) {
        return fail(403, 'This account is currently suspended. Please contact support.');
      }
    }

    // Smart Check: For registration purpose, verify user does not already exist
    if (purpose === 'email_verify') {
      const { data: existingProfile } = await (channel === 'sms'
        ? db.from('profiles').select('id').eq('phone', identifier).maybeSingle()
        : db.from('profiles').select('id').eq('email', identifier).maybeSingle());

      if (existingProfile) {
        return fail(409, `An account is already registered with this ${channel === 'sms' ? 'phone number' : 'email'}. Please sign in.`, {
          alreadyRegistered: true,
        });
      }
    }

    const code = randomNumericCode(6);
    // HMAC, not a bare hash: a 6-digit space is exhaustible in milliseconds, so
    // a plain sha256 in a leaked dump would give up every live code.
    const codeHash = await hmacSign(`${code}:${identifier}:${purpose}`, secret);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);

    // One live code per identifier + purpose.
    await db
      .from('auth_otps')
      .update({ consumed_at: new Date().toISOString() })
      .eq('identifier', identifier)
      .eq('purpose', purpose)
      .is('consumed_at', null);

    const { error: insertError } = await db.from('auth_otps').insert({
      identifier,
      channel,
      email: channel === 'email' ? identifier : null,
      purpose,
      code_hash: codeHash,
      ip_address: ip,
      expires_at: expiresAt.toISOString(),
    });

    if (insertError) {
      console.error('[auth] failed to persist otp:', insertError);
      // Distinguish a rejected key from a genuine transient fault — the first
      // needs a config change, the second needs a retry.
      // Classify accurately. Blaming credentials for a schema mismatch sent
      // people checking API keys that were never the problem.
      const msg = insertError.message ?? '';
      const badCreds = /invalid api key|jwt expired|not authorized/i.test(msg);
      const badSchema = /column|schema cache|does not exist|PGRST204/i.test(msg);

      if (badSchema) {
        return fail(503, 'Sign-in is unavailable: the database schema is out of date. Run supabase/fix-login.sql in the Supabase SQL editor.');
      }
      return fail(
        badCreds ? 503 : 500,
        badCreds
          ? 'Sign-in is unavailable: the database rejected our credentials.'
          : 'Could not send the code. Please try again.'
      );
    }

    // The send and the audit write are independent, so they run concurrently.
    // Serially they cost a round trip to Resend *plus* one to Postgres, and on
    // this deployment a Postgres round trip is not cheap — the user was waiting
    // through both before the button stopped spinning.
    const [sent] = await Promise.all([
      channel === 'sms'
        ? sendSms({ to: identifier, message: buildOtpSms(code), otp: code })
        : sendMail({
            to: identifier,
            subject: `${code} is your Global Forex verification code`,
            html: buildOtpEmailHtml({ code, purpose, expiryMinutes: OTP_TTL_MINUTES, ipAddress: ip }),
            template: `${purpose}_otp`,
          }),
      // Phone numbers are masked in the audit trail; the full value is already
      // in auth_otps and does not need duplicating into a 180-day log.
      auditServer(req, 'AUTH_OTP_REQUESTED', {
        metadata: {
          channel,
          target: channel === 'sms' ? maskPhone(identifier) : identifier,
          purpose,
        },
      }),
    ]);

    // Always the same response shape, whether or not the account exists —
    // otherwise this endpoint becomes a user-enumeration oracle.
    return ok({
      channel,
      message:
        channel === 'sms'
          ? `If that number is registered, a code is on its way. It expires in ${OTP_TTL_MINUTES} minutes.`
          : `If that address is valid, a code is on its way. It expires in ${OTP_TTL_MINUTES} minutes.`,
      // Only surfaced when no provider is configured, so local development is
      // not a dead end.
      devHint: sent.mocked
        ? 'No delivery provider configured — check the server console for the code.'
        : undefined,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
