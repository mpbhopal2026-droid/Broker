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
import { geoFromHeaders } from '@/lib/geo';

const KNOWN_ROLES: UserRole[] = ['client', 'staff', 'admin', 'developer'];
function normaliseRole(value: unknown): UserRole {
  return KNOWN_ROLES.includes(value as UserRole) ? (value as UserRole) : 'client';
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_ATTEMPTS = 5;

/**
 * Absolute URL for links sent by email.
 *
 * The request origin is a poor fallback here: a request that arrived at the
 * stale vercel.app host would email the recipient a link back to that host, and
 * they would land on an old build. Emails outlive the request that produced
 * them, so they get the canonical domain regardless of how the caller arrived.
 */
function appUrl(req: NextRequest, path: string): string {
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://www.globalforex.online';
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
    const userAgent = cleanString(req.headers.get('user-agent'), 500) || 'unknown';

    const ipLimit = rateLimit(`otp:verify:ip:${ip}`, 20, 15 * 60);
    if (!ipLimit.allowed) return tooManyRequests(ipLimit.retryAfterSeconds);

    const body = await req.json().catch(() => ({}));
    const rawCode = typeof body?.code === 'string' ? body.code : '';
    const cleanCode = rawCode.replace(/\D/g, '');
    const channel: 'email' | 'sms' = body?.channel === 'sms' ? 'sms' : 'email';

    // Optional fields provided by the registration form
    const fullNameInput = cleanString(body?.fullName, 120);
    const phoneInput = body?.phone ? normalisePhone(String(body.phone)) : null;

    let identifier: string | null;
    let email: string | null = null;

    if (channel === 'sms') {
      identifier = normalisePhone(cleanString(body?.phone, 24) ?? '');
      if (!identifier || !cleanCode) {
        return fail(400, 'Enter your mobile number and the 6-digit code.');
      }
    } else {
      identifier = normaliseEmail(body?.email);
      email = identifier;
      if (!identifier || !cleanCode) {
        return fail(400, 'Enter your email and the 6-digit code.');
      }
    }

    const idLimit = rateLimit(`otp:verify:id:${identifier}`, 40, 15 * 60);
    if (!idLimit.allowed) return tooManyRequests(idLimit.retryAfterSeconds);

    const db = getServiceClient();
    const secret = process.env.SESSION_SECRET;
    if (!db || !secret) return fail(503, 'Authentication is not configured on this server.');

    // Look up ALL active, unexpired, unconsumed OTPs for this user
    const { data: activeOtps } = await (channel === 'email'
      ? db
          .from('auth_otps')
          .select('id, code_hash, attempts, expires_at, purpose, created_at')
          .is('consumed_at', null)
          .gt('expires_at', new Date().toISOString())
          .or(`identifier.eq.${identifier},email.eq.${identifier}`)
          .order('created_at', { ascending: false })
      : db
          .from('auth_otps')
          .select('id, code_hash, attempts, expires_at, purpose, created_at')
          .is('consumed_at', null)
          .gt('expires_at', new Date().toISOString())
          .eq('identifier', identifier)
          .order('created_at', { ascending: false }));

    let matchedOtp: any = null;

    if (activeOtps && activeOtps.length > 0) {
      for (const otp of activeOtps) {
        if ((otp.attempts || 0) >= MAX_ATTEMPTS) continue;

        // The row carries its own purpose, so signing with it matches whatever
        // request-otp used. That alone fixes the registration 401: registration
        // issues purpose 'email_verify' while sign-in issues 'login', and the
        // verifier used to assume 'login'.
        const otpPurpose = otp.purpose || 'login';
        const candPrimary = await hmacSign(`${cleanCode}:${identifier}:${otpPurpose}`, secret);

        // Transitional only: codes issued by the previous build were signed
        // with the wrong purpose. Harmless because both are still bound to the
        // identifier and the secret. Remove once no pre-fix code can still be
        // inside its 10 minute window.
        const candLogin = await hmacSign(`${cleanCode}:${identifier}:login`, secret);
        const candVerify = await hmacSign(`${cleanCode}:${identifier}:email_verify`, secret);

        // Deliberately NOT tested any more, and they must not come back:
        //   hmac(code) and sha256(code) — not bound to the identifier at all.
        //   sha256(code:identifier) — unsalted. A 6 digit code is a million
        //     possibilities, so a leaked dump becomes a lookup table. The HMAC
        //     exists precisely so a dump gives up nothing.
        //   comparing the plaintext code against code_hash — that treats the
        //     hash column as if it might hold a plaintext code, which is the
        //     one thing hashing is for.
        const isMatch =
          timingSafeEqual(candPrimary, otp.code_hash) ||
          timingSafeEqual(candLogin, otp.code_hash) ||
          timingSafeEqual(candVerify, otp.code_hash);

        if (isMatch) {
          matchedOtp = otp;
          break;
        }
      }
    }

    if (!matchedOtp) {
      if (activeOtps && activeOtps.length > 0) {
        // Charge the attempt against EVERY active code, not just the newest.
        // A wrong guess is tested against all of them, so counting it once let
        // a caller with two live codes take ten guesses instead of five —
        // and the lock is the only thing standing between an attacker and a
        // six digit space they can otherwise walk in about a million tries.
        await Promise.all(
          activeOtps.map((o) =>
            db.from('auth_otps').update({ attempts: (o.attempts || 0) + 1 }).eq('id', o.id),
          ),
        );
      } else {
        // Check past consumed/expired
        const { data: pastOtp } = await (channel === 'email'
          ? db.from('auth_otps').select('id, expires_at, consumed_at').or(`identifier.eq.${identifier},email.eq.${identifier}`).order('created_at', { ascending: false }).limit(1).maybeSingle()
          : db.from('auth_otps').select('id, expires_at, consumed_at').eq('identifier', identifier).order('created_at', { ascending: false }).limit(1).maybeSingle());

        if (pastOtp?.consumed_at) {
          return fail(401, 'This verification code has already been used. Please request a new code.');
        }
        if (pastOtp && new Date(pastOtp.expires_at) <= new Date()) {
          return fail(401, 'This verification code has expired. Please request a new code.');
        }
      }

      await auditServer(req, 'AUTH_OTP_VERIFY_FAILED', {
        metadata: { email, reason: 'no_match' },
      });
      return fail(401, 'Incorrect verification code. Please check your latest email and enter the 6-digit code.');
    }

    // --- resolve or create the account ---------------------------------------
    const cleanIdentifier = identifier.toLowerCase().trim();
    const cleanEmail = email ? email.toLowerCase().trim() : cleanIdentifier;

    const lookup = db
      .from('profiles')
      .select('id, email, full_name, role, is_active, email_verified');

    let { data: profile } = await (channel === 'sms'
      ? lookup.eq('phone', cleanIdentifier).maybeSingle()
      : lookup.ilike('email', cleanEmail).maybeSingle());

    let isNewAccount = false;

    if (!profile) {
      if (channel === 'sms') {
        return fail(404, 'No account found for that mobile number. Please register with your email first.', {
          needsRegistration: true,
        });
      }

      if (!cleanEmail) {
        return fail(400, 'An email address is required to create an account.', {
          needsRegistration: true,
        });
      }

      if (!fullNameInput) {
        return fail(404, 'No account found with this email. Please register first.', {
          needsRegistration: true,
        });
      }

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
          email: cleanEmail,
          email_confirm: true,
        });

        if (created?.user?.id) {
          authUserId = created.user.id;
        } else if (createError) {
          const { data: userList } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
          const match = userList?.users?.find((u) => u.email?.toLowerCase() === cleanEmail);
          if (match?.id) {
            authUserId = match.id;
          }
        }
      } catch (authErr) {
        console.warn('[auth] admin createUser skipped or failed:', authErr);
      }

      // Check if profile was already created
      const { data: existingProfile } = await db
        .from('profiles')
        .select('id, email, full_name, role, is_active, email_verified')
        .or(`id.eq.${authUserId},email.ilike.${cleanEmail}`)
        .maybeSingle();

      if (existingProfile) {
        profile = existingProfile;
      } else {
        const { data: newProfile, error: profileError } = await db
          .from('profiles')
          .insert({
            id: authUserId,
            email: cleanEmail,
            full_name: fullNameInput || cleanEmail.split('@')[0],
            phone: phoneInput || null,
            role: 'client',
            email_verified: true,
            is_active: true,
            wallet_balance: 0,
          })
          .select('id, email, full_name, role, is_active, email_verified')
          .single();

        if (profileError || !newProfile) {
          const { data: fallbackProfile } = await db
            .from('profiles')
            .select('id, email, full_name, role, is_active, email_verified')
            .ilike('email', cleanEmail)
            .maybeSingle();

          if (fallbackProfile) {
            profile = fallbackProfile;
          } else {
            console.error('[auth] profile creation failed:', profileError);
            return fail(500, 'Could not complete registration. Please try again.');
          }
        } else {
          profile = newProfile;
          isNewAccount = true;
        }
      }
    } else {
      // Existing profile:
      if (profile.is_active === false) {
        if (fullNameInput) {
          // User is re-registering after an account purge/deletion: reactivate cleanly
          await db.from('profiles').update({
            is_active: true,
            full_name: fullNameInput,
            email_verified: true,
            kyc_status: 'not_submitted',
            wallet_balance: 0,
          }).eq('id', profile.id);
          profile.is_active = true;
          profile.full_name = fullNameInput;
          isNewAccount = true;
        } else {
          await auditServer(req, 'AUTH_LOGIN_BLOCKED_INACTIVE', { userId: profile.id, metadata: { email } });
          return fail(403, 'This account is currently suspended. If you deleted your account, please register on the Sign Up page to start fresh.');
        }
      } else if (fullNameInput && (!profile.full_name || profile.full_name.includes('@'))) {
        await db.from('profiles').update({ full_name: fullNameInput }).eq('id', profile.id);
        profile.full_name = fullNameInput;
      }
    }

    if (!profile.email_verified) {
      await db.from('profiles').update({ email_verified: true }).eq('id', profile.id);
    }

    // --- open the session ----------------------------------------------------
    // Role comes from the database record, never from the request.
    const role = normaliseRole(profile.role);
    const { cookieValue, sidHash, expiresAt } = await createSessionCookieValue(profile.id, role);

    const geo = geoFromHeaders(req.headers);

    let { error: sessionError } = await db.from('sessions').insert({
      user_id: profile.id,
      sid_hash: sidHash,
      ip_address: ip,
      user_agent: userAgent,
      geo_country: geo.country,
      geo_region: geo.region,
      geo_city: geo.city,
      expires_at: expiresAt.toISOString(),
    });

    if (sessionError) {
      console.warn('[auth] session insert with geo columns failed, trying base schema:', sessionError.message);
      const { error: baseSessionError } = await db.from('sessions').insert({
        user_id: profile.id,
        sid_hash: sidHash,
        ip_address: ip,
        user_agent: userAgent,
        expires_at: expiresAt.toISOString(),
      });
      sessionError = baseSessionError;
    }

    if (sessionError) {
      console.error('[auth] session persist failed:', sessionError);
      return fail(500, 'Could not complete sign-in. Please try again.');
    }

    // Single-use: burn pending OTP codes for this user once session is established
    await db
      .from('auth_otps')
      .update({ consumed_at: new Date().toISOString() })
      .or(`identifier.eq.${identifier},email.eq.${identifier}`)
      .is('consumed_at', null);

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
