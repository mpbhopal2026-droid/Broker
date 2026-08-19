import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { getServiceClient } from '@/lib/supabase-server';
import { auditServer } from '@/lib/auth-server';
import { hmacSign, timingSafeEqual } from '@/lib/crypto';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { createSessionCookieValue, SESSION_COOKIE, sessionCookieOptions } from '@/lib/session';
import { ok, fail, tooManyRequests, normaliseEmail, cleanString, handleRouteError } from '@/lib/api';
import { sendMailBestEffort } from '@/lib/mailer';
import { buildLoginAlertEmailHtml, buildWelcomeEmailHtml } from '@/lib/resend';
import { UserRole } from '@/lib/permissions';
import { normalisePhone, maskPhone } from '@/lib/sms';

const KNOWN_ROLES: UserRole[] = ['client', 'staff', 'admin', 'developer'];
function normaliseRole(value: unknown): UserRole {
  return KNOWN_ROLES.includes(value as UserRole) ? (value as UserRole) : 'client';
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_ATTEMPTS = 5;

function appUrl(req: NextRequest, path: string): string {
  const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  return `${origin.replace(/\/$/, '')}${path}`;
}

/**
 * Verify a code and open a session.
 *
 * Role is never taken from the request. A new account is always created as
 * 'client'; admin is granted only by a deliberate database update. The old
 * flow derived admin from `email.includes('admin')`, so admin@gmail.com was
 * a full administrator.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    const userAgent = req.headers.get('user-agent') || 'unknown';

    const ipLimit = rateLimit(`otp:verify:ip:${ip}`, 20, 15 * 60);
    if (!ipLimit.allowed) return tooManyRequests(ipLimit.retryAfterSeconds);

    const body = await req.json().catch(() => ({}));
    const channel: 'email' | 'sms' = body?.channel === 'sms' ? 'sms' : 'email';

    // Whichever channel issued the code is the one we verify against.
    const identifier =
      channel === 'sms'
        ? normalisePhone(cleanString(body?.phone, 24) ?? '')
        : normaliseEmail(body?.email);

    const email = channel === 'email' ? identifier : null;
    const rawCode = cleanString(body?.code, 20) ?? '';
    const cleanCode = rawCode.replace(/\D/g, '');
    const fullNameInput = cleanString(body?.fullName, 120);
    const phoneInput = cleanString(body?.phone, 24);

    if (!identifier || cleanCode.length !== 6) {
      return fail(400, channel === 'sms' ? 'Enter your mobile number and the 6-digit code.' : 'Enter your email and the 6-digit code.');
    }

    const idLimit = rateLimit(`otp:verify:id:${identifier}`, 40, 15 * 60);
    if (!idLimit.allowed) return tooManyRequests(idLimit.retryAfterSeconds);

    const db = getServiceClient();
    const secret = process.env.SESSION_SECRET;
    if (!db || !secret) return fail(503, 'Authentication is not configured on this server.');

    // Look up active, unexpired, unconsumed OTP
    const query = db
      .from('auth_otps')
      .select('id, code_hash, attempts, expires_at, purpose')
      .is('consumed_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    const { data: otp } = await (channel === 'email'
      ? query.or(`identifier.eq.${identifier},email.eq.${identifier}`).maybeSingle()
      : query.eq('identifier', identifier).maybeSingle());

    if (!otp) {
      // Check if there is an expired or consumed record to give exact feedback
      const { data: pastOtp } = await (channel === 'email'
        ? db.from('auth_otps').select('id, expires_at, consumed_at').or(`identifier.eq.${identifier},email.eq.${identifier}`).order('created_at', { ascending: false }).limit(1).maybeSingle()
        : db.from('auth_otps').select('id, expires_at, consumed_at').eq('identifier', identifier).order('created_at', { ascending: false }).limit(1).maybeSingle());

      await auditServer(req, 'AUTH_OTP_VERIFY_FAILED', { metadata: { email, reason: 'no_live_code' } });

      if (pastOtp?.consumed_at) {
        return fail(401, 'This verification code has already been used. Please request a new code.');
      }
      if (pastOtp && new Date(pastOtp.expires_at) <= new Date()) {
        return fail(401, 'This verification code has expired. Please request a new code.');
      }
      return fail(401, 'No active verification code found. Please request a new code.');
    }

    if (otp.attempts >= MAX_ATTEMPTS) {
      await db.from('auth_otps').update({ consumed_at: new Date().toISOString() }).eq('id', otp.id);
      await auditServer(req, 'AUTH_OTP_LOCKED', { metadata: { email } });
      return fail(429, 'Too many incorrect attempts. Please request a new code.');
    }

    const otpPurpose = otp.purpose || 'login';
    const candidate = await hmacSign(`${cleanCode}:${identifier}:${otpPurpose}`, secret);

    let isMatch = timingSafeEqual(candidate, otp.code_hash);
    if (!isMatch) {
      // Fallback cross-check against alternate purposes and raw inputs
      const candLogin = await hmacSign(`${cleanCode}:${identifier}:login`, secret);
      const candVerify = await hmacSign(`${cleanCode}:${identifier}:email_verify`, secret);
      const candRaw = await hmacSign(`${rawCode.trim()}:${identifier}:${otpPurpose}`, secret);
      isMatch = timingSafeEqual(candLogin, otp.code_hash) || timingSafeEqual(candVerify, otp.code_hash) || timingSafeEqual(candRaw, otp.code_hash);
    }

    if (!isMatch) {
      await db.from('auth_otps').update({ attempts: otp.attempts + 1 }).eq('id', otp.id);
      await auditServer(req, 'AUTH_OTP_VERIFY_FAILED', {
        metadata: { email, attempt: otp.attempts + 1 },
      });
      return fail(401, 'Incorrect verification code. Please check the code in your email or request a new one.');
    }

    // Single-use: burn the code before issuing anything.
    await db.from('auth_otps').update({ consumed_at: new Date().toISOString() }).eq('id', otp.id);

    // --- resolve or create the account ---------------------------------------
    // Look up on whichever identifier was verified.
    const lookup = db
      .from('profiles')
      .select('id, email, full_name, role, is_active, email_verified');

    let { data: profile } = await (channel === 'sms'
      ? lookup.eq('phone', identifier).eq('phone_verified', true)
      : lookup.eq('email', identifier)
    ).maybeSingle();

    // Rule 1: If user is attempting registration (fullNameInput supplied) but profile already exists:
    if (fullNameInput && profile) {
      return fail(409, 'An account is already registered with this email address or mobile number. Please sign in instead.', {
        alreadyRegistered: true,
      });
    }

    // Rule 2: If user is attempting login (no fullNameInput) but profile does NOT exist:
    if (!fullNameInput && !profile) {
      return fail(404, 'No account found with this email address or mobile number. Please create an account first.', {
        notRegistered: true,
      });
    }

    let isNewAccount = false;

    if (!profile && channel === 'sms') {
      return fail(404, 'No account found for that number. Please register with your email first.', {
        needsRegistration: true,
      });
    }

    if (!profile && !email) {
      return fail(400, 'An email address is required to create an account.', {
        needsRegistration: true,
      });
    }

    if (!profile && !fullNameInput) {
      return fail(404, 'No account found for that email. Please register first.', {
        needsRegistration: true,
      });
    }

    if (!profile) {
      if (phoneInput) {
        const { data: takenBy } = await db
          .from('profiles')
          .select('id')
          .eq('phone', phoneInput)
          .maybeSingle();

        if (takenBy) {
          return fail(409, 'That mobile number is already registered to another account.');
        }
      }

      let authUserId = crypto.randomUUID();
      try {
        const { data: created, error: createError } = await db.auth.admin.createUser({
          email: email as string,
          email_confirm: true,
        });

        if (created?.user?.id) {
          authUserId = created.user.id;
        } else if (createError) {
          // If auth user exists in auth.users, find their ID
          const { data: userList } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
          const match = userList?.users?.find((u) => u.email?.toLowerCase() === (email as string).toLowerCase());
          if (match?.id) {
            authUserId = match.id;
          }
        }
      } catch (authErr) {
        console.warn('[auth] admin createUser skipped or failed:', authErr);
      }

      const { data: newProfile, error: profileError } = await db
        .from('profiles')
        .upsert({
          id: authUserId,
          email: email as string,
          full_name: fullNameInput || (email as string).split('@')[0],
          phone: phoneInput || null,
          role: 'client',
          email_verified: true,
          is_active: true,
          wallet_balance: 0,
        }, { onConflict: 'email' })
        .select('id, email, full_name, role, is_active, email_verified')
        .single();

      if (profileError || !newProfile) {
        console.error('[auth] profile upsert failed:', profileError);
        return fail(500, 'Could not complete registration. Please try again.');
      }

      profile = newProfile;
      isNewAccount = true;
    }

    if (profile.is_active === false) {
      await auditServer(req, 'AUTH_LOGIN_BLOCKED_INACTIVE', { userId: profile.id, metadata: { email } });
      return fail(403, 'This account is suspended. Contact support.');
    }

    if (!profile.email_verified) {
      await db.from('profiles').update({ email_verified: true }).eq('id', profile.id);
    }

    // --- open the session ----------------------------------------------------
    // Role comes from the database record, never from the request.
    const role = normaliseRole(profile.role);
    const { cookieValue, sidHash, expiresAt } = await createSessionCookieValue(profile.id, role);

    const { error: sessionError } = await db.from('sessions').insert({
      user_id: profile.id,
      sid_hash: sidHash,
      ip_address: ip,
      user_agent: userAgent,
      expires_at: expiresAt.toISOString(),
    });

    if (sessionError) {
      console.error('[auth] session persist failed:', sessionError);
      return fail(500, 'Could not complete sign-in. Please try again.');
    }

    cookies().set(SESSION_COOKIE, cookieValue, sessionCookieOptions);

    await auditServer(req, isNewAccount ? 'AUTH_ACCOUNT_CREATED' : 'AUTH_LOGIN_SUCCESS', {
      userId: profile.id,
      metadata: { channel, identifier: channel === 'sms' ? maskPhone(identifier) : identifier, role },
    });

    if (isNewAccount) {
      sendMailBestEffort({
        to: profile.email,
        subject: 'Welcome to Global Forex — finish your onboarding',
        html: buildWelcomeEmailHtml({
          userName: profile.full_name,
          nextStepUrl: appUrl(req, '/onboarding'),
        }),
        template: 'welcome_onboarding',
        userId: profile.id,
      });
    } else {
      sendMailBestEffort({
        to: profile.email,
        subject: 'New sign-in to your Global Forex account',
        html: buildLoginAlertEmailHtml({
          userName: profile.full_name,
          ipAddress: ip,
          userAgent,
          loginAt: new Date().toUTCString(),
          secureAccountUrl: appUrl(req, '/profile/security'),
        }),
        template: 'login_alert',
        userId: profile.id,
      });
    }

    return ok({
      user: {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        role,
      },
      isNewAccount,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
