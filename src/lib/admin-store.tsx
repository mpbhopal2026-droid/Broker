'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, Transaction, KYCRecord, BrokerPaymentSettings, ClientPaymentConfig, TradeOrder } from './types';
import { useApp, ActionResult } from './store';
import { deriveFxRates } from './pricing';

/**
 * Operator capability, kept out of the client bundle.
 */

interface AdminContextValue {
  users: UserProfile[];
  adminTransactions: Transaction[];
  adminKycRecords: KYCRecord[];
  clientPaymentConfigs: Record<string, ClientPaymentConfig>;
  refreshAdminData: () => Promise<void>;

  approveDeposit: (transactionId: string, customAmountUSD?: number) => Promise<ActionResult>;
  rejectDeposit: (transactionId: string, remarks?: string) => Promise<ActionResult>;
  approveWithdrawal: (transactionId: string, payoutRef?: string) => Promise<ActionResult>;
  rejectWithdrawal: (transactionId: string, remarks?: string) => Promise<ActionResult>;
  reviewKYC: (recordId: string, status: 'approved' | 'rejected', notes?: string) => Promise<ActionResult>;
  adjustUserBalance: (userId: string, deltaUSD: number, reason: string) => Promise<ActionResult>;
  adminUpdateUserProfile: (userId: string, data: Partial<UserProfile>) => Promise<ActionResult>;
  setUserActive: (userId: string, active: boolean) => Promise<ActionResult>;
  updatePaymentSettings: (settings: Partial<BrokerPaymentSettings>) => Promise<ActionResult>;
  sendCustomEmailNotification: (userId: string, subject: string, message: string) => Promise<ActionResult>;

  // Per-client custom payment setup
  setClientPaymentConfig: (config: ClientPaymentConfig) => Promise<ActionResult>;
  getClientPaymentConfig: (userId: string) => ClientPaymentConfig | null;

  // Client Portfolio & Trade Management
  closeClientTrade: (tradeId: string, userId: string) => Promise<ActionResult>;
  updateClientTrade: (tradeId: string, updates: Partial<TradeOrder>) => Promise<ActionResult>;
  manualVerifyUserKyc: (userId: string, status: 'approved' | 'rejected' | 'pending' | 'unverified', notes?: string) => Promise<ActionResult>;
}

const AdminContext = createContext<AdminContextValue | undefined>(undefined);

async function post(url: string, body?: unknown) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok && data?.ok !== false, data };
  } catch {
    return { ok: false, data: { error: 'Network error. Check your connection.' } };
  }
}

async function patch(url: string, body: unknown) {
  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok && data?.ok !== false, data };
  } catch {
    return { ok: false, data: { error: 'Network error. Check your connection.' } };
  }
}

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, paymentSettings, refreshSession, showToast } = useApp();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [adminTransactions, setAdminTransactions] = useState<Transaction[]>([]);
  const [adminKycRecords, setAdminKycRecords] = useState<KYCRecord[]>([]);
  const [clientPaymentConfigs, setClientPaymentConfigs] = useState<Record<string, ClientPaymentConfig>>({});

  const isOperator =
    currentUser?.role === 'admin' || currentUser?.role === 'staff' || currentUser?.role === 'developer';

  // Deliberately no localStorage seed. Payment routing is read from the server
  // per client on the deposit page; rehydrating a stale copy here would let the
  // operator console show routing that no longer matches what clients are told.
  // The stale key is cleared so old values cannot resurface.
  useEffect(() => {
    try { localStorage.removeItem('apex_client_payment_configs'); } catch {}
  }, []);

  const refreshAdminData = useCallback(async () => {
    if (!isOperator) return;
    try {
      const [usersRes, txRes, kycRes] = await Promise.all([
        fetch('/api/admin/users', { credentials: 'same-origin' }),
        fetch('/api/admin/transactions', { credentials: 'same-origin' }),
        fetch('/api/admin/kyc', { credentials: 'same-origin' }),
      ]);

      const usersBody = await usersRes.json().catch(() => ({}));
      const txBody = await txRes.json().catch(() => ({}));
      const kycBody = await kycRes.json().catch(() => ({}));

      if (Array.isArray(usersBody?.users)) {
        // Convert at the WITHDRAWAL rate, not the mid. The mid is a reference
        // price nobody transacts at: a client depositing pays mid + spread and
        // a client withdrawing receives mid - spread. Showing the mid meant the
        // INR figure on the operator console matched neither side, and it hid
        // the spread — the platform's actual commission — entirely.
        //
        // Withdrawal is the honest one for a balance: it is what the client
        // would receive if they cashed out right now, i.e. our real liability.
        const fx = deriveFxRates(
          paymentSettings.usdToInrRate,
          paymentSettings.inrSpreadDeposit ?? 0,
          paymentSettings.inrSpreadWithdrawal ?? 0,
        );
        const rate = fx.withdrawal;
        setUsers(
          usersBody.users.map((u: any) => ({
            id: u.id,
            fullName: u.full_name,
            email: u.email,
            phone: u.phone ?? '',
            role: u.role,
            kycStatus: u.kyc_status,
            walletBalance: Number(u.wallet_balance || 0),
            walletBalanceINR: Number((Number(u.wallet_balance || 0) * rate).toFixed(2)),
            isActive: u.is_active,
            city: u.city ?? undefined,
            state: u.state ?? undefined,
            createdAt: u.created_at,
            updatedAt: u.updated_at,
          }))
        );
      }
      if (Array.isArray(txBody?.transactions)) setAdminTransactions(txBody.transactions);
      if (Array.isArray(kycBody?.records)) setAdminKycRecords(kycBody.records);
    } catch (err) {
      console.warn('Admin data refresh failed:', err);
    }
    // The spreads belong here too. Without them a spread change left every
    // balance on the console converted at the previous rate until something
    // else happened to trigger a refresh.
  }, [
    isOperator,
    paymentSettings.usdToInrRate,
    paymentSettings.inrSpreadDeposit,
    paymentSettings.inrSpreadWithdrawal,
  ]);

  useEffect(() => {
    void refreshAdminData();
  }, [refreshAdminData]);

  /** Shared shape for the four transaction decisions. */
  const decide = useCallback(
    async (
      transactionId: string,
      action: 'approve' | 'reject',
      extra: Record<string, unknown> = {}
    ): Promise<ActionResult> => {
      const res = await post('/api/admin/transactions', { transactionId, action, ...extra });
      if (!res.ok) return { success: false, error: res.data?.error || 'Action failed.' };
      await refreshAdminData();
      return { success: true, message: res.data?.message };
    },
    [refreshAdminData]
  );

  const setClientPaymentConfig = useCallback(async (config: ClientPaymentConfig): Promise<ActionResult> => {
    // Persisted server-side, behind settings:edit, and audited.
    //
    // This previously wrote to the OPERATOR's own localStorage and reported
    // success. The client's browser never saw it, so the routing change had no
    // effect at all while the operator was told it had saved — the worst shape
    // for a bug about where client money is sent.
    const res = await fetch('/api/admin/client-payment', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(config),
    });

    const data = await res.json().catch(() => ({}));

    // Report what the server actually did, not what we hoped it did.
    if (!res.ok || data?.ok === false) {
      const error = data?.error || 'Could not save payment routing.';
      showToast({ type: 'error', title: 'Not saved', message: error });
      return { success: false, error };
    }

    setClientPaymentConfigs((prev) => ({ ...prev, [config.userId]: config }));
    showToast({ type: 'success', title: 'Payment Routing Saved', message: data.message });
    return { success: true, message: data.message };
  }, [showToast]);

  const getClientPaymentConfig = useCallback((userId: string): ClientPaymentConfig | null => {
    return clientPaymentConfigs[userId] || null;
  }, [clientPaymentConfigs]);

  const closeClientTrade = useCallback(async (tradeId: string, userId: string): Promise<ActionResult> => {
    const res = await post('/api/admin/trades', { action: 'close', tradeId, userId });
    if (!res.ok) return { success: false, error: res.data?.error || 'Could not close position.' };
    showToast({ type: 'success', title: 'Position Closed', message: `Trade ${tradeId} closed by admin.` });
    await refreshAdminData();
    return { success: true, message: res.data?.message };
  }, [refreshAdminData, showToast]);

  const updateClientTrade = useCallback(async (tradeId: string, updates: Partial<TradeOrder>): Promise<ActionResult> => {
    const res = await post('/api/admin/trades', { action: 'update', tradeId, updates });
    if (!res.ok) return { success: false, error: res.data?.error || 'Could not update position.' };
    showToast({ type: 'success', title: 'Position Updated', message: `Trade parameters adjusted.` });
    await refreshAdminData();
    return { success: true, message: res.data?.message };
  }, [refreshAdminData, showToast]);

  const value: AdminContextValue = {
    users,
    adminTransactions,
    adminKycRecords,
    clientPaymentConfigs,
    refreshAdminData,

    approveDeposit: (id, amount) =>
      decide(id, 'approve', amount !== undefined ? { creditUSD: amount } : {}),
    rejectDeposit: (id, remarks) => decide(id, 'reject', { remarks }),
    approveWithdrawal: (id, payoutRef) => decide(id, 'approve', { remarks: payoutRef }),
    rejectWithdrawal: (id, remarks) => decide(id, 'reject', { remarks }),

    reviewKYC: async (recordId, status, notes) => {
      const res = await post('/api/admin/kyc', { recordId, status, notes });
      if (!res.ok) return { success: false, error: res.data?.error || 'Could not record the review.' };
      await refreshAdminData();
      return { success: true, message: res.data?.message };
    },

    manualVerifyUserKyc: async (userId, status, notes) => {
      const res = await post('/api/admin/kyc', { userId, status, notes });
      if (!res.ok) return { success: false, error: res.data?.error || 'Could not update verification status.' };
      await refreshAdminData();
      showToast({ type: 'success', title: 'KYC Status Updated', message: res.data?.message || `User marked as ${status}.` });
      return { success: true, message: res.data?.message };
    },

    adjustUserBalance: async (userId, deltaUSD, reason) => {
      const res = await post('/api/admin/users', { userId, action: 'adjust_balance', deltaUSD, reason });
      if (!res.ok) return { success: false, error: res.data?.error || 'Adjustment failed.' };
      await refreshAdminData();
      return { success: true, message: res.data?.message };
    },

    adminUpdateUserProfile: async (userId, data) => {
      const res = await post('/api/admin/users', { userId, action: 'update_profile', ...data });
      if (!res.ok) return { success: false, error: res.data?.error || 'Could not update the client.' };
      await refreshAdminData();
      const ignored: string[] | undefined = res.data?.ignored;
      return {
        success: true,
        message: ignored?.length
          ? `Saved. These fields cannot be edited here: ${ignored.join(', ')}.`
          : res.data?.message,
      };
    },

    setUserActive: async (userId, active) => {
      const res = await post('/api/admin/users', { userId, action: active ? 'reactivate' : 'suspend' });
      if (!res.ok) return { success: false, error: res.data?.error || 'Could not change the account status.' };
      await refreshAdminData();
      return { success: true, message: res.data?.message };
    },

    updatePaymentSettings: async (settings) => {
      const res = await patch('/api/settings', settings);
      if (!res.ok) return { success: false, error: res.data?.error || 'Could not save settings.' };
      await refreshSession();
      return { success: true, message: res.data?.message };
    },

    sendCustomEmailNotification: async (userId, subject, message) => {
      const res = await post('/api/send-email', { type: 'custom', userId, payload: { subject, message } });
      if (!res.ok) return { success: false, error: res.data?.error || 'Could not send the email.' };
      return {
        success: true,
        message: res.data?.mocked ? 'Email simulated (no provider key configured).' : 'Email sent.',
      };
    },

    setClientPaymentConfig,
    getClientPaymentConfig,
    closeClientTrade,
    updateClientTrade,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};

/**
 * Base app state plus operator actions, in one object.
 *
 * Admin pages previously destructured everything from useApp(); swapping that
 * call for useAdmin() keeps those pages unchanged apart from the hook name.
 */
export const useAdmin = () => {
  const app = useApp();
  const admin = useContext(AdminContext);
  if (!admin) throw new Error('useAdmin must be used within an AdminProvider');

  return {
    ...app,
    ...admin,
    // Admin pages expect the platform-wide queues under the familiar names.
    transactions: admin.adminTransactions,
    kycRecords: admin.adminKycRecords,
  };
};
