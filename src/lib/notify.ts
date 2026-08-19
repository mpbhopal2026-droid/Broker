import 'server-only';

import { getServiceClient } from './supabase-server';
import { log } from './logger';

/**
 * Server-side notification delivery.
 *
 * One call fans out to the channels the event warrants. Notifications are
 * written by the server only — a client-writable notification table would be a
 * phishing surface inside the product, where an attacker could plant "Your
 * withdrawal needs re-confirmation, click here".
 *
 * Money and security events ignore user preferences. Someone must always be
 * told their balance moved or that a new device signed in; making that opt-out
 * would let an attacker who compromises an account silence the alerts that
 * would expose them.
 */

export type NotificationType = 'deposit' | 'withdrawal' | 'kyc' | 'security' | 'system' | 'support';

export interface NotifyParams {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  /** Deep link, e.g. '/transactions'. */
  link?: string;
  priority?: 'low' | 'normal' | 'high';
}

/** Events the user cannot opt out of. */
const ALWAYS_DELIVER: NotificationType[] = ['deposit', 'withdrawal', 'security', 'kyc'];

export async function notifyUser(params: NotifyParams): Promise<boolean> {
  const db = getServiceClient();
  if (!db) return false;

  try {
    if (!ALWAYS_DELIVER.includes(params.type)) {
      const { data: profile } = await db
        .from('profiles')
        .select('notify_inapp')
        .eq('id', params.userId)
        .maybeSingle();

      if (profile?.notify_inapp === false) return false;
    }

    const { error } = await db.from('notifications').insert({
      user_id: params.userId,
      type: params.type,
      title: params.title.slice(0, 200),
      body: params.body.slice(0, 1000),
      link: params.link ?? null,
      priority: params.priority ?? 'normal',
    });

    if (error) {
      log.error('notify', 'failed to write notification', {
        userId: params.userId,
        type: params.type,
        error: error.message,
      });
      return false;
    }

    return true;
  } catch (err) {
    // Never let a notification failure break the action it describes.
    log.error('notify', 'threw', { userId: params.userId, error: String(err) });
    return false;
  }
}

/** Fire-and-forget. Use when the caller must not wait on delivery. */
export function notifyUserBestEffort(params: NotifyParams): void {
  void notifyUser(params).catch(() => {});
}

/**
 * Notify every operator at once.
 *
 * Client-facing events were the only ones wired up, so a deposit landed in the
 * queue and nobody was told. The client waits, believing someone is looking at
 * it; the operator finds out whenever they next happen to open /admin. On a
 * platform where a pending deposit is somebody's money sitting in limbo, "we
 * check the queue periodically" is not a process.
 *
 * Writes one row per operator so each has their own read state — a shared
 * notification that one person dismisses for everybody is worse than none.
 *
 * Roles are read live rather than cached: someone promoted this morning should
 * receive tonight's alerts, and someone demoted should stop.
 */
export async function notifyOperators(params: Omit<NotifyParams, 'userId'>): Promise<number> {
  const db = getServiceClient();
  if (!db) return 0;

  try {
    const { data: operators } = await db
      .from('profiles')
      .select('id')
      .in('role', ['admin', 'staff'])
      .eq('is_active', true);

    if (!operators?.length) {
      // Worth a log line: it means an event that needs a human went nowhere.
      log.warn('notify', 'operator notification had no recipients', { title: params.title });
      return 0;
    }

    const rows = operators.map((o) => ({
      user_id: o.id,
      type: params.type,
      title: params.title,
      body: params.body,
      link: params.link ?? null,
      priority: params.priority ?? 'normal',
    }));

    const { error } = await db.from('notifications').insert(rows);
    if (error) {
      log.error('notify', 'could not notify operators', { error: error.message });
      return 0;
    }

    return rows.length;
  } catch (err) {
    log.error('notify', 'operator notify threw', {
      error: err instanceof Error ? err.message : String(err),
    });
    return 0;
  }
}

/** Never let a notification failure break the action it describes. */
export function notifyOperatorsBestEffort(params: Omit<NotifyParams, 'userId'>): void {
  void notifyOperators(params).catch(() => {});
}

// ---------------------------------------------------------------------------
// Typed helpers — keeps copy consistent and deep links correct
// ---------------------------------------------------------------------------

/**
 * Operator-facing alerts. Each deep links straight to the queue that action
 * belongs in, so the notification is one tap from being dealt with.
 */
export const operatorAlerts = {
  depositSubmitted: (clientName: string, amountINR: number, utr: string) =>
    notifyOperatorsBestEffort({
      type: 'deposit',
      priority: 'high',
      title: 'New deposit awaiting review',
      body: `${clientName} submitted ₹${amountINR.toLocaleString('en-IN')}. UTR ${utr}. Match it against the bank statement before crediting.`,
      link: '/admin/deposits',
    }),

  withdrawalRequested: (clientName: string, amountUSD: number) =>
    notifyOperatorsBestEffort({
      type: 'withdrawal',
      priority: 'high',
      title: 'Withdrawal requested',
      body: `${clientName} requested $${amountUSD.toFixed(2)} to their verified bank account.`,
      link: '/admin/withdrawals',
    }),

  kycSubmitted: (clientName: string, documentType: string) =>
    notifyOperatorsBestEffort({
      type: 'kyc',
      priority: 'normal',
      title: 'KYC documents submitted',
      body: `${clientName} submitted ${documentType.toUpperCase()} for verification.`,
      link: '/admin/kyc',
    }),

  supportTicket: (clientName: string, subject: string) =>
    notifyOperatorsBestEffort({
      type: 'support',
      priority: 'normal',
      title: 'New support ticket',
      body: `${clientName}: ${subject}`,
      link: '/admin/support',
    }),
};

export const notifications = {
  depositApproved: (userId: string, amountUSD: number, newBalance: number) =>
    notifyUserBestEffort({
      userId,
      type: 'deposit',
      priority: 'high',
      title: 'Deposit credited',
      body: `$${amountUSD.toFixed(2)} has been added to your wallet. New balance: $${newBalance.toFixed(2)}.`,
      link: '/transactions',
    }),

  depositRejected: (userId: string, reason: string) =>
    notifyUserBestEffort({
      userId,
      type: 'deposit',
      priority: 'high',
      title: 'Deposit could not be verified',
      body: reason,
      link: '/transactions',
    }),

  withdrawalCompleted: (userId: string, amountUSD: number) =>
    notifyUserBestEffort({
      userId,
      type: 'withdrawal',
      priority: 'high',
      title: 'Withdrawal sent',
      body: `$${amountUSD.toFixed(2)} has been dispatched to your registered bank account.`,
      link: '/transactions',
    }),

  withdrawalRejected: (userId: string, amountUSD: number, reason: string) =>
    notifyUserBestEffort({
      userId,
      type: 'withdrawal',
      priority: 'high',
      title: 'Withdrawal not processed',
      body: `${reason} $${amountUSD.toFixed(2)} has been returned to your wallet.`,
      link: '/transactions',
    }),

  kycApproved: (userId: string) =>
    notifyUserBestEffort({
      userId,
      type: 'kyc',
      priority: 'high',
      title: 'Identity verified',
      body: 'Your KYC has been approved. Deposits and withdrawals are now enabled.',
      link: '/dashboard',
    }),

  kycRejected: (userId: string, notes: string) =>
    notifyUserBestEffort({
      userId,
      type: 'kyc',
      priority: 'high',
      title: 'KYC needs correction',
      body: notes || 'Please re-upload a clear photo of your document.',
      link: '/kyc',
    }),

  newSignIn: (userId: string, ip: string) =>
    notifyUserBestEffort({
      userId,
      type: 'security',
      priority: 'normal',
      title: 'New sign-in',
      body: `Your account was accessed from ${ip}. If this was not you, sign out all devices immediately.`,
      link: '/profile/security',
    }),

  welcome: (userId: string) =>
    notifyUserBestEffort({
      userId,
      type: 'system',
      title: 'Welcome to Global Forex',
      body: 'Complete your onboarding to start trading. The demo account is available right now.',
      link: '/onboarding',
    }),
};
