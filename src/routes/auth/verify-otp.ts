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

    const cleanIdentifier = (identifier || '').toLowerCase().trim();

    // Look up ALL active, unexpired, unconsumed OTPs for this user
    let { data: activeOtps } = await (channel === 'email'
      ? db
          .from('auth_otps')
          .select('id, code_hash, attempts, expires_at, purpose, created_at')
          .is('consumed_at', null)
          .gt('expires_at', new Date().toISOString())
          .ilike('identifier', cleanIdentifier)
          .order('created_at', { ascending: false })
      : db
          .from('auth_otps')
          .select('id, code_hash, attempts, expires_at, purpose, created_at')
          .is('consumed_at', null)
          .gt('expires_at', new Date().toISOString())
          .eq('identifier', cleanIdentifier)
          .order('created_at', { ascending: false }));

    // Fallback if not matched by identifier column
    if (!activeOtps || activeOtps.length === 0) {
      const { data: fallbackOtps } = await db
        .from('auth_otps')
        .select('id, code_hash, attempts, expires_at, purpose, created_at')
        .is('consumed_at', null)
        .gt('expires_at', new Date().toISOString())
        .ilike('email', cleanIdentifier)
        .order('created_at', { ascending: false });
      if (fallbackOtps && fallbackOtps.length > 0) {
        activeOtps = fallbackOtps;
      }
    }

    let matchedOtp: any = null;

    if (activeOtps && activeOtps.length > 0) {
      for (const otp of activeOtps) {
        if ((otp.attempts || 0) >= MAX_ATTEMPTS) continue;

        const otpPurpose = otp.purpose || 'login';
        const candPrimary = await hmacSign(`${cleanCode}:${cleanIdentifier}:${otpPurpose}`, secret);
        const candLogin = await hmacSign(`${cleanCode}:${cleanIdentifier}:login`, secret);
        const candVerify = await hmacSign(`${cleanCode}:${cleanIdentifier}:email_verify`, secret);

        const candRawPrimary = await hmacSign(`${cleanCode}:${identifier}:${otpPurpose}`, secret);
        const candRawLogin = await hmacSign(`${cleanCode}:${identifier}:login`, secret);
        const candRawVerify = await hmacSign(`${cleanCode}:${identifier}:email_verify`, secret);

        const isMatch =
          timingSafeEqual(candPrimary, otp.code_hash) ||
          timingSafeEqual(candLogin, otp.code_hash) ||
          timingSafeEqual(candVerify, otp.code_hash) ||
          timingSafeEqual(candRawPrimary, otp.code_hash) ||
          timingSafeEqual(candRawLogin, otp.code_hash) ||
          timingSafeEqual(candRawVerify, otp.code_hash);

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

        // Almost always, a "wrong" code here is the RIGHT code from an OLDER
        // email. Requesting a new code consumes every previous one, so a client
        // who taps resend and then types the first code they received gets
        // "Incorrect verification code" — which is true and useless. They read
        // it as the system being broken, request another code, and repeat.
        //
        // If a code was superseded in the last fifteen minutes, say that
        // instead. Production logs showed exactly this loop: three 401s, then a
        // success five seconds later once the newest email was used.
        const supersededSince = new Date(Date.now() - 15 * 60_000).toISOString();
        const { data: superseded } = await db
          .from('auth_otps')
          .select('id')
          .or(`identifier.eq.${identifier},email.eq.${identifier}`)
          .not('consumed_at', 'is', null)
          .gte('consumed_at', supersededSince)
          .limit(1);

        if (superseded && superseded.length > 0) {
          await auditServer(req, 'AUTH_OTP_VERIFY_FAILED', {
            metadata: { email, reason: 'superseded_code' },
          });
          return fail(
            401,
            'That code is no longer valid because a newer one was sent. Please use the code from the most recent email.',
          );
        }
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
        return fail(404, 'No account found for that mobile number. Please sign up with your email address first.', {
          needsRegistration: true,
        });
      }

      if (!cleanEmail) {
        return fail(400, 'An email address is required to create an account.', {
          needsRegistration: true,
        });
      }

      const derivedFullName = fullNameInput || cleanEmail.split('@')[0];

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
            full_name: derivedFullName,
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
      // A purged profile is not a suspended account waiting to be woken up — it
      // is a deleted one. The reactivation branch below exists so a client whose
      // account was disabled can sign back in, but it was also un-purging
      // deleted accounts and signing people into them.
      //
      // Confirmed in production: an OTP for a live address resolved to
      // "purged_…@purged.invalid" and returned 200 with a session cookie. That
      // happened because the purge left auth.users holding the real address
      // while profiles held the scrambled one, and this branch then revived the
      // shell it landed on.
      //
      // Checked here as well as at the purge site deliberately: this is the last
      // gate before a session is issued, and it must not depend on the delete
      // path having behaved.
      const isPurged =
        String(profile.email ?? '').endsWith('@purged.invalid') ||
        profile.full_name === 'Purged User';

      if (isPurged) {
        await auditServer(req, 'AUTH_LOGIN_BLOCKED_PURGED', {
          userId: profile.id,
          metadata: { attemptedIdentifier: identifier },
        });
        return fail(404, 'No account found for that address. Please register first.', {
          needsRegistration: true,
        });
      }

      if (profile.is_active === false) {
        const reactivatedName = fullNameInput || profile.full_name || cleanEmail.split('@')[0];
        await db.from('profiles').update({
          is_active: true,
          full_name: reactivatedName,
          email_verified: true,
          kyc_status: 'not_submitted',
          wallet_balance: 0,
        }).eq('id', profile.id);
        profile.is_active = true;
        profile.full_name = reactivatedName;
        isNewAccount = true;
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
