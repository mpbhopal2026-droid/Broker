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

// ---------------------------------------------------------------------------
// Typed helpers — keeps copy consistent and deep links correct
// ---------------------------------------------------------------------------

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
