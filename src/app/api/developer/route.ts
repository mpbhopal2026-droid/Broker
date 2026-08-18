import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase-server';
import { requireCapability, auditServer } from '@/lib/auth-server';
import { ok, fail, cleanString, handleRouteError, normaliseEmail } from '@/lib/api';
import { loadFlags, invalidateFlagCache, DEFAULT_FLAGS, parseFlagMeta, formatFlagDescription } from '@/lib/feature-flags';
import { sendMail } from '@/lib/mailer';
import {
  buildDepositApprovalEmailHtml,
  buildWithdrawalStatusEmailHtml,
  buildKycStatusEmailHtml,
  buildCustomEmailHtml,
} from '@/lib/resend';
import { UserRole, isOperationsRole } from '@/lib/permissions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Developer tooling: Team & Role Management, Email Lab, Push Notification Lab,
 * Delivery Telemetry, System Logs, Flags, and Health.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireCapability('logs:view');
    const db = getServiceClient();
    if (!db) return fail(503, 'Not available.');

    const view = req.nextUrl.searchParams.get('view') ?? 'overview';
    const limitParam = Number(req.nextUrl.searchParams.get('limit'));
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 500) : 100;

    // VIEW: USERS (Filtered by role for developer role management)
    if (view === 'users') {
      const roleFilter = req.nextUrl.searchParams.get('role');
      let query = db
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (roleFilter && ['client', 'staff', 'admin', 'developer'].includes(roleFilter)) {
        query = query.eq('role', roleFilter);
      }

      const { data } = await query;
      return ok({ users: data ?? [] });
    }

    // VIEW: NOTIFICATIONS (Dispatched in-app & push alerts)
    if (view === 'notifications') {
      const { data } = await db
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      return ok({ notifications: data ?? [] });
    }

    if (view === 'emails') {
      const status = req.nextUrl.searchParams.get('status');
      let query = db
        .from('email_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status && ['sent', 'failed', 'mocked'].includes(status)) {
        query = query.eq('status', status);
      }

      const delivery = req.nextUrl.searchParams.get('delivery');
      if (delivery && ['delivered', 'bounced', 'complained', 'delayed', 'opened', 'clicked'].includes(delivery)) {
        query = query.eq('delivery_status', delivery);
      }
      if (delivery === 'pending') query = query.is('delivery_status', null).eq('status', 'sent');

      const { data } = await query;
      const { data: health } = await db.from('email_delivery_health').select('*');

      return ok({ emails: data ?? [], deliveryHealth: health ?? [] });
    }

    if (view === 'logins') {
      const { data } = await db
        .from('audit_logs')
        .select('*')
        .in('event_type', ['LOGIN_SUCCESS', 'LOGIN_FAILED', 'OTP_REQUESTED', 'OTP_VERIFIED', 'SESSION_REVOKED', 'DEVELOPER_ROLE_CHANGED'])
        .order('created_at', { ascending: false })
        .limit(limit);

      return ok({ logins: data ?? [] });
    }

    if (view === 'actions') {
      const { data } = await db
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      return ok({ actions: data ?? [] });
    }

    if (view === 'logs') {
      const level = req.nextUrl.searchParams.get('level');
      let query = db
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (level && ['info', 'warn', 'error', 'fatal'].includes(level)) {
        query = query.eq('level', level);
      }

      const { data } = await query;
      return ok({ logs: data ?? [] });
    }

    // Overview: flags + counters for the dashboard tiles.
    const since = new Date(Date.now() - 24 * 3600_000).toISOString();

    let flags = DEFAULT_FLAGS;
    try {
      flags = await loadFlags();
    } catch {
      flags = DEFAULT_FLAGS;
    }

    const [emailsSent, emailsFailed, errors, drift, bounced, awaiting] = await Promise.all([
      db.from('email_log').select('id', { count: 'exact', head: true }).eq('status', 'sent').gte('created_at', since).then(r => r, () => ({ count: 0 })),
      db.from('email_log').select('id', { count: 'exact', head: true }).eq('status', 'failed').gte('created_at', since).then(r => r, () => ({ count: 0 })),
      db.from('system_logs').select('id', { count: 'exact', head: true }).in('level', ['error', 'fatal']).gte('created_at', since).then(r => r, () => ({ count: 0 })),
      db.from('balance_reconciliation').select('user_id, email, drift').neq('drift', 0).limit(20).then(r => r, () => ({ data: [] })),
      db.from('email_log').select('id', { count: 'exact', head: true }).in('delivery_status', ['bounced', 'complained']).gte('created_at', since).then(r => r, () => ({ count: 0 })),
      db.from('email_log').select('id', { count: 'exact', head: true }).eq('status', 'sent').is('delivery_status', null).gte('created_at', since).then(r => r, () => ({ count: 0 })),
    ]);

    return ok({
      flags: flags ?? DEFAULT_FLAGS,
      health: {
        emailsSent24h: emailsSent?.count ?? 0,
        emailsFailed24h: emailsFailed?.count ?? 0,
        emailsBounced24h: bounced?.count ?? 0,
        emailsAwaitingEvent24h: awaiting?.count ?? 0,
        webhookConfigured: Boolean(process.env.RESEND_WEBHOOK_SECRET),
        errors24h: errors?.count ?? 0,
        ledgerDrift: drift?.data ?? [],
        supabaseConfigured: true,
      },
      viewer: { id: user.id, email: user.email, role: user.role },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

/**
 * Developer Actions:
 * - change_role: Promote or demote any user and revoke active sessions.
 * - send_test_email: Send custom/templated transactional emails.
 * - send_test_notification: Send in-app notification & FCM push notification.
 */
export async function POST(req: NextRequest) {
  try {
    const operator = await requireCapability('role:manage');
    const db = getServiceClient();
    if (!db) return fail(503, 'Not available.');

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    // 1. CHANGE USER ROLE (Promote / Demote)
    if (action === 'change_role') {
      const targetUserId = cleanString(body?.userId, 64);
      const newRole = cleanString(body?.role, 32) as UserRole;

      if (!targetUserId) return fail(400, 'userId is required.');
      if (!['client', 'staff', 'admin', 'developer'].includes(newRole)) {
        return fail(400, 'Invalid role. Must be client, staff, admin, or developer.');
      }

      const { data: targetUser, error: fetchErr } = await db
        .from('profiles')
        .select('id, email, full_name, role')
        .eq('id', targetUserId)
        .maybeSingle();

      if (fetchErr || !targetUser) return fail(404, 'User not found.');

      // Prevent developer self-lockout
      if (targetUser.id === operator.id && newRole !== 'developer' && newRole !== 'admin') {
        return fail(400, 'You cannot demote your own active developer account.');
      }

      // Update role
      const { error: updateErr } = await db
        .from('profiles')
        .update({
          role: newRole,
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetUserId);

      if (updateErr) return fail(500, 'Could not update user role.');

      // Revoke all live sessions for the user so new permissions take effect immediately
      await db
        .from('sessions')
        .update({ revoked_at: new Date().toISOString() })
        .eq('user_id', targetUserId)
        .is('revoked_at', null);

      // Audit the role change
      await auditServer(req, 'DEVELOPER_ROLE_CHANGED', {
        userId: operator.id,
        metadata: {
          targetUserId,
          targetEmail: targetUser.email,
          previousRole: targetUser.role,
          newRole,
          changedBy: operator.email,
        },
      });

      return ok({
        message: `Successfully changed ${targetUser.full_name || targetUser.email}'s role to ${newRole.toUpperCase()}. Active sessions revoked.`,
        user: { id: targetUserId, role: newRole },
      });
    }

    // 2. SEND TEST / CUSTOM TRANSACTIONAL EMAIL
    if (action === 'send_test_email') {
      const recipientEmail = normaliseEmail(body?.recipientEmail);
      const template = cleanString(body?.template, 64) || 'custom';
      const customSubject = cleanString(body?.subject, 200);
      const customMessage = cleanString(body?.message, 5000);
      const userName = cleanString(body?.userName, 100) || 'Trader';

      if (!recipientEmail) return fail(400, 'A valid recipient email is required.');

      let subject = customSubject || 'Global Forex Notification';
      let html = '';

      switch (template) {
        case 'welcome':
          subject = customSubject || 'Welcome to Global Forex Institutional Trading';
          html = buildCustomEmailHtml({
            userName,
            title: 'Welcome to Global Forex',
            paragraphs: [
              'Your account has been initialized on our Tier-1 institutional ECN trading engine.',
              'You can now access live demo sandboxes, verify your KYC documents, and explore global FX & CFD markets.',
            ],
            callToAction: { text: 'Open Trading Desk', url: 'https://globalforex.online/trade' },
          });
          break;

        case 'deposit_approved':
          subject = customSubject || 'Deposit Approved & Balance Credited | Global Forex';
          html = buildDepositApprovalEmailHtml({
            userName,
            amountUSD: Number(body?.amountUSD || 500),
            amountINR: Number(body?.amountINR || 44500),
            utrNumber: body?.utrNumber || 'UPI987654321012',
            newBalanceUSD: Number(body?.amountUSD || 500),
          });
          break;

        case 'withdrawal_processed':
          subject = customSubject || 'Withdrawal Processed & Dispatched | Global Forex';
          html = buildWithdrawalStatusEmailHtml({
            userName,
            status: 'completed',
            amountUSD: Number(body?.amountUSD || 250),
            amountINR: Number(body?.amountINR || 22250),
            bankDetails: body?.bankDetails || 'HDFC Bank (...4821)',
          });
          break;

        case 'kyc_approved':
          subject = customSubject || 'KYC Verification Approved | Global Forex';
          html = buildKycStatusEmailHtml({
            userName,
            status: 'approved',
            documentType: 'Aadhaar Card',
          });
          break;

        case 'security_alert':
          subject = customSubject || 'Security Alert: New Sign-In Verified | Global Forex';
          html = buildCustomEmailHtml({
            userName,
            title: 'Security Notice: New Session',
            paragraphs: [
              'A new login was verified on your account from IP address 127.0.0.1.',
              'If this was you, no action is needed. If you did not initiate this login, please revoke all sessions in Security Settings immediately.',
            ],
            callToAction: { text: 'Review Security Settings', url: 'https://globalforex.online/profile/security' },
          });
          break;

        default:
          html = buildCustomEmailHtml({
            userName,
            title: customSubject || 'Notice from Global Forex',
            paragraphs: customMessage ? [customMessage] : ['This is a test notification from the Global Forex Developer Engine.'],
            callToAction: body?.ctaUrl ? { text: body?.ctaText || 'View Dashboard', url: body.ctaUrl } : undefined,
          });
          break;
      }

      const result = await sendMail({
        to: recipientEmail,
        subject,
        html,
        template,
        userId: body?.userId || undefined,
      });

      const dispatchStatus = result.ok ? 'sent' : result.mocked ? 'mocked' : 'failed';

      await auditServer(req, 'TEST_EMAIL_DISPATCHED', {
        userId: operator.id,
        metadata: { recipientEmail, template, status: dispatchStatus },
      });

      return ok({
        message: `Email dispatched (${dispatchStatus}) to ${recipientEmail}.`,
        result,
      });
    }

    // 3. SEND TEST / BROADCAST IN-APP & PUSH NOTIFICATION
    if (action === 'send_test_notification') {
      const targetUserId = cleanString(body?.userId, 64);
      const isBroadcast = Boolean(body?.broadcast);
      const title = cleanString(body?.title, 150) || 'System Announcement';
      const notificationBody = cleanString(body?.body, 500) || 'Platform update from Global Forex.';
      const type = cleanString(body?.type, 32) || 'system';
      const priority = cleanString(body?.priority, 16) || 'normal';
      const link = cleanString(body?.link, 200) || '/dashboard';

      if (!isBroadcast && !targetUserId) {
        return fail(400, 'Either specify a target userId or set broadcast: true.');
      }

      let userIds: string[] = [];

      if (isBroadcast) {
        const { data: users } = await db.from('profiles').select('id').limit(500);
        userIds = (users ?? []).map((u) => u.id);
      } else if (targetUserId) {
        userIds = [targetUserId];
      }

      if (userIds.length === 0) {
        return fail(404, 'No recipient users found.');
      }

      // Insert notifications into notifications table
      const rows = userIds.map((uid) => ({
        user_id: uid,
        title,
        body: notificationBody,
        type,
        priority,
        link,
        created_at: new Date().toISOString(),
      }));

      const { error: notifErr } = await db.from('notifications').insert(rows);
      if (notifErr) return fail(500, 'Could not insert in-app notifications.');

      await auditServer(req, 'PUSH_NOTIFICATION_DISPATCHED', {
        userId: operator.id,
        metadata: { recipientsCount: userIds.length, isBroadcast, title, type },
      });

      return ok({
        message: `Notification successfully sent to ${userIds.length} user(s).`,
        recipientsCount: userIds.length,
      });
    }

    return fail(400, 'Unknown developer action.');
  } catch (err) {
    return handleRouteError(err);
  }
}

/** Toggle a feature flag or change its rollout and user overrides. */
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireCapability('flags:edit');
    const db = getServiceClient();
    if (!db) return fail(503, 'Not available.');

    const body = await req.json().catch(() => ({}));
    const key = cleanString(body?.key, 64);
    if (!key) return fail(400, 'A flag key is required.');

    // Fetch existing state
    const { data: current } = await db
      .from('feature_flags')
      .select('*')
      .eq('key', key)
      .maybeSingle();

    const currentMeta = parseFlagMeta(current?.description);

    let allowedUserIds = Array.isArray(body?.allowedUserIds)
      ? body.allowedUserIds
      : Array.isArray(current?.allowed_user_ids) && current.allowed_user_ids.length > 0
      ? current.allowed_user_ids
      : currentMeta.allowedUserIds;

    let userOverrides =
      body?.userOverrides && typeof body.userOverrides === 'object'
        ? body.userOverrides
        : typeof current?.user_overrides === 'object' &&
          current.user_overrides !== null &&
          Object.keys(current.user_overrides).length > 0
        ? current.user_overrides
        : currentMeta.userOverrides;

    // Handle single-user toggle
    if (body?.toggleUserId) {
      const targetUid = String(body.toggleUserId);
      const shouldEnable =
        body.toggleUserEnabled !== undefined ? Boolean(body.toggleUserEnabled) : true;
      if (shouldEnable) {
        allowedUserIds = allowedUserIds.includes(targetUid)
          ? allowedUserIds
          : [...allowedUserIds, targetUid];
      } else {
        allowedUserIds = allowedUserIds.filter((id: string) => id !== targetUid);
      }
      userOverrides = { ...userOverrides, [targetUid]: shouldEnable };
    }

    const enabledVal =
      typeof body?.enabled === 'boolean'
        ? body.enabled
        : current
        ? Boolean(current.enabled)
        : false;

    let rolloutVal = current ? Number(current.rollout_percent ?? 0) : 0;
    if (body?.rolloutPercent !== undefined) {
      const percent = Number(body.rolloutPercent);
      if (Number.isInteger(percent) && percent >= 0 && percent <= 100) {
        rolloutVal = percent;
      }
    }

    const baseDesc =
      currentMeta.description ||
      current?.description ||
      DEFAULT_FLAGS.find((f) => f.key === key)?.description ||
      key;

    const packedDesc = formatFlagDescription(baseDesc, allowedUserIds, userOverrides);

    // Tier 1: Try upsert with all extended columns
    let savedFlag = {
      key,
      enabled: enabledVal,
      description: baseDesc,
      rolloutPercent: rolloutVal,
      allowedUserIds,
      userOverrides,
      updatedAt: new Date().toISOString(),
    };

    const { error: fullErr } = await db
      .from('feature_flags')
      .upsert(
        {
          key,
          enabled: enabledVal,
          description: packedDesc,
          rollout_percent: rolloutVal,
          allowed_user_ids: allowedUserIds,
          user_overrides: userOverrides,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );

    if (fullErr) {
      // Tier 2: Fallback without extended column names if table schema lacks them
      const { error: fallbackErr } = await db
        .from('feature_flags')
        .upsert(
          {
            key,
            enabled: enabledVal,
            description: packedDesc,
            rollout_percent: rolloutVal,
            updated_by: user.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        );

      if (fallbackErr) {
        // Tier 3: Minimum upsert without foreign key in case updated_by references missing user
        await db
          .from('feature_flags')
          .upsert(
            {
              key,
              enabled: enabledVal,
              description: packedDesc,
              rollout_percent: rolloutVal,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'key' }
          );
      }
    }

    invalidateFlagCache();

    await auditServer(req, 'FEATURE_FLAG_CHANGED', {
      userId: user.id,
      metadata: { key, enabled: enabledVal, rolloutPercent: rolloutVal, allowedUserIds, userOverrides },
    });

    return ok({ flag: savedFlag, message: `Flag "${key}" updated.` });
  } catch (err) {
    return handleRouteError(err);
  }
}
