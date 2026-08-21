'use client';

import React, { useState, useEffect } from 'react';
import {
  Save,
  X,
  User,
  MapPin,
  Building2,
  Wallet,
  ShieldCheck,
  Ban,
  CheckCircle2,
  QrCode,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  Lock,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Copy,
  Check,
  DollarSign,
  Trash2,
  FileText
} from 'lucide-react';
import { useAdmin } from '@/lib/admin-store';
import { useApp } from '@/lib/store';
import type { UserProfile, TradeOrder, ClientPaymentConfig } from '@/lib/types';
import { formatUSD, formatINR, formatDate } from '@/lib/utils';

export const ClientDetailPanel: React.FC<{ client: UserProfile; onClose: () => void }> = ({
  client,
  onClose,
}) => {
  const {
    adminUpdateUserProfile,
    setUserActive,
    getClientPaymentConfig,
    setClientPaymentConfig,
    manualVerifyUserKyc,
    adjustUserBalance,
    closeClientTrade,
    deleteUser,
    ledgerEntries,
    tradeOrders,
    kycRecords
  } = useAdmin();

  const { showToast, paymentSettings, currentUser } = useApp();

  const isDeveloper = currentUser?.role === 'developer' || currentUser?.role === 'admin';

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<'profile' | 'kyc' | 'wallet' | 'portfolio' | 'routing' | 'security'>('profile');

  // Form State for Profile
  const [savingProfile, setSavingProfile] = useState(false);
  const [form, setForm] = useState({
    fullName: client.fullName ?? '',
    phone: client.phone ?? '',
    address: client.address ?? '',
    city: client.city ?? '',
    state: client.state ?? '',
    postalCode: client.postalCode ?? '',
    accountTier: client.accountTier ?? 'Standard',
    tradingExperience: client.tradingExperience ?? '',
    riskTolerance: client.riskTolerance ?? '',
    bankAccountName: client.bankAccountName ?? '',
    bankName: client.bankName ?? '',
    bankAccountNumber: client.bankAccountNumber ?? '',
    bankIfsc: client.bankIfsc ?? '',
    userUpiId: client.userUpiId ?? '',
  });

  // KYC Override State
  const [kycStatus, setKycStatus] = useState<'approved' | 'rejected' | 'pending' | 'unverified'>(
    (client.kycStatus as any) || 'unverified'
  );
  const [kycNotes, setKycNotes] = useState('');
  const [savingKyc, setSavingKyc] = useState(false);
  const [copiedDoc, setCopiedDoc] = useState(false);

  // Balance Adjuster State
  const [adjustAmount, setAdjustAmount] = useState<number>(100);
  const [adjustReason, setAdjustReason] = useState('Manual Ledger Adjustment');
  const [adjustingBalance, setAdjustingBalance] = useState(false);

  // Portfolio State
  const [trades, setTrades] = useState<TradeOrder[]>([]);
  const [loadingTrades, setLoadingTrades] = useState(false);
  const [closingTradeId, setClosingTradeId] = useState('');

  // VIP Deposit Routing State
  const [isCustomRouting, setIsCustomRouting] = useState(false);
  const [routingBankName, setRoutingBankName] = useState('');
  const [routingAccountHolder, setRoutingAccountHolder] = useState('');
  const [routingAccountNumber, setRoutingAccountNumber] = useState('');
  const [routingIfsc, setRoutingIfsc] = useState('');
  const [routingUpiId, setRoutingUpiId] = useState('');
  const [routingQrUrl, setRoutingQrUrl] = useState('');
  const [routingNotes, setRoutingNotes] = useState('');
  const [savingRouting, setSavingRouting] = useState(false);

  // Security / Actions State
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);
  const [confirmDeleteText, setConfirmDeleteText] = useState('');

  // Initial Load for Payment Routing & Trades
  useEffect(() => {
    const existingRouting = getClientPaymentConfig(client.id);
    if (existingRouting) {
      setIsCustomRouting(existingRouting.isCustom);
      setRoutingBankName(existingRouting.bankName || '');
      setRoutingAccountHolder(existingRouting.accountHolder || '');
      setRoutingAccountNumber(existingRouting.accountNumber || '');
      setRoutingIfsc(existingRouting.ifscCode || '');
      setRoutingUpiId(existingRouting.upiId || '');
      setRoutingQrUrl(existingRouting.qrImageUrl || '');
      setRoutingNotes(existingRouting.notes || '');
    } else {
      setIsCustomRouting(false);
      setRoutingAccountHolder(client.fullName || '');
    }
  }, [client, getClientPaymentConfig]);

  const fetchClientTrades = async () => {
    setLoadingTrades(true);
    try {
      const res = await fetch(`/api/admin/trades?userId=${client.id}`, { credentials: 'same-origin' });
      const data = await res.json();
      if (data?.trades) {
        setTrades(
          data.trades.map((t: any) => ({
            id: t.id,
            userId: t.user_id,
            symbol: t.symbol,
            pairName: t.pair_name,
            type: t.side,
            entryPrice: Number(t.entry_price),
            currentPrice: Number(t.entry_price),
            lotSize: Number(t.lot_size),
            margin: Number(t.margin),
            leverage: t.leverage,
            stopLoss: t.stop_loss ? Number(t.stop_loss) : undefined,
            takeProfit: t.take_profit ? Number(t.take_profit) : undefined,
            pnl: Number(t.pnl || 0),
            pnlPercentage: 0,
            status: t.status,
            openedAt: t.opened_at,
            closedAt: t.closed_at ?? undefined,
          }))
        );
      }
    } catch {
      const userTrades = tradeOrders.filter((t) => t.userId === client.id);
      setTrades(userTrades);
    } finally {
      setLoadingTrades(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'portfolio') {
      void fetchClientTrades();
    }
  }, [activeTab, client.id]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  // 1. Save Profile Details
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    const res = await adminUpdateUserProfile(client.id, form as Partial<UserProfile>);
    setSavingProfile(false);
    showToast(
      res.success
        ? { type: 'success', title: 'Profile Updated', message: res.message ?? 'Client details saved.' }
        : { type: 'error', title: 'Update Failed', message: res.error ?? 'Could not save profile.' }
    );
  };

  // 2. Save KYC Override
  const handleSaveKyc = async () => {
    setSavingKyc(true);
    const res = await manualVerifyUserKyc(client.id, kycStatus, kycNotes);
    setSavingKyc(false);
    if (res.success) {
      showToast({ type: 'success', title: 'KYC Status Updated', message: `Compliance status set to ${kycStatus.toUpperCase()}.` });
    } else {
      showToast({ type: 'error', title: 'KYC Update Failed', message: res.error || 'Could not update KYC status.' });
    }
  };

  // 3. Balance Adjustment
  const handleAdjustBalance = async (isCredit: boolean) => {
    if (!adjustAmount || adjustAmount <= 0) {
      showToast({ type: 'error', title: 'Invalid Amount', message: 'Enter a positive numeric USD amount.' });
      return;
    }
    setAdjustingBalance(true);
    const delta = isCredit ? Math.abs(adjustAmount) : -Math.abs(adjustAmount);
    const res = await adjustUserBalance(client.id, delta, adjustReason);
    setAdjustingBalance(false);
    if (res.success) {
      showToast({
        type: 'success',
        title: isCredit ? 'Balance Credited' : 'Balance Debited',
        message: `${isCredit ? 'Added' : 'Deducted'} $${Math.abs(adjustAmount).toFixed(2)} (${adjustReason}).`,
      });
      setAdjustAmount(100);
    } else {
      showToast({ type: 'error', title: 'Adjustment Failed', message: res.error || 'Could not update balance.' });
    }
  };

  // 4. Save Custom Deposit Routing
  const handleSaveRouting = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRouting(true);
    const config: ClientPaymentConfig = {
      userId: client.id,
      isCustom: isCustomRouting,
      bankName: routingBankName.trim(),
      accountHolder: routingAccountHolder.trim(),
      accountNumber: routingAccountNumber.trim(),
      ifscCode: routingIfsc.trim(),
      upiId: routingUpiId.trim(),
      qrImageUrl: routingQrUrl.trim(),
      notes: routingNotes.trim(),
    };
    const res = await setClientPaymentConfig(config);
    setSavingRouting(false);
    if (res.success) {
      showToast({ type: 'success', title: 'Payment Routing Saved', message: isCustomRouting ? 'Custom VIP deposit channels active for this client.' : 'Client reset to default broker desk channels.' });
    } else {
      showToast({ type: 'error', title: 'Routing Save Failed', message: res.error || 'Could not update routing.' });
    }
  };

  // 5. Toggle Active/Suspend
  const handleToggleStatus = async () => {
    setTogglingStatus(true);
    const newStatus = !client.isActive;
    const res = await setUserActive(client.id, newStatus);
    setTogglingStatus(false);
    showToast(
      res.success
        ? {
            type: 'success',
            title: newStatus ? 'Account Reactivated' : 'Account Suspended',
            message: newStatus ? 'Client can now sign in and trade.' : 'Client has been blocked and signed out.',
          }
        : { type: 'error', title: 'Action Failed', message: res.error ?? 'Could not update status.' }
    );
  };

  // 6. Delete Account
  const handleDeleteUser = async () => {
    if (confirmDeleteText.trim() !== client.email.trim()) {
      showToast({ type: 'error', title: 'Confirmation Mismatch', message: 'Type the exact email to confirm permanent purge.' });
      return;
    }
    setDeletingUser(true);
    const res = await deleteUser(client.id);
    setDeletingUser(false);
    if (res.success) {
      showToast({ type: 'info', title: 'Client Purged', message: `${client.fullName} (${client.email}) was completely deleted.` });
      onClose();
    } else {
      showToast({ type: 'error', title: 'Delete Failed', message: res.error || 'Could not delete client.' });
    }
  };

  const userLedger = ledgerEntries.filter((l) => l.user_id === client.id || (l as any).userId === client.id);
  const userKycRecord = kycRecords.find((k) => k.userId === client.id);
  const openTrades = trades.filter((t) => t.status === 'OPEN');

  const initials = (client.fullName || client.email || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn select-none">
      <div className="w-full max-w-4xl my-auto bg-white dark:bg-[#0f172a] rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[94vh] overflow-hidden animate-scale-in text-slate-900 dark:text-slate-100 font-sans">
        
        {/* TOP HEADER */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-[#111827]/90 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-1">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white font-bold text-base flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                  {client.fullName || 'Client'}
                </h2>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  client.isActive !== false
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${client.isActive !== false ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                  {client.isActive !== false ? 'Active' : 'Suspended'}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-300 uppercase">
                  {client.accountTier || 'Standard'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate mt-0.5">
                {client.email} {client.phone ? `• ${client.phone}` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-200/60 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FINANCIAL SUMMARY STRIP */}
        <div className="px-4 sm:px-6 py-3 bg-slate-100/80 dark:bg-[#161f30] border-b border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0 text-xs font-sans">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Wallet Balance</div>
            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1 mt-0.5">
              <Wallet className="w-3.5 h-3.5" />
              {formatUSD(client.walletBalance ?? 0)}
              <span className="text-[10px] font-normal text-slate-400">
                (≈ {formatINR((client.walletBalance ?? 0) * paymentSettings.usdToInrRate)})
              </span>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">KYC Status</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`font-bold uppercase text-[11px] flex items-center gap-1 ${
                client.kycStatus === 'approved'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : client.kycStatus === 'pending'
                  ? 'text-amber-500'
                  : 'text-slate-400'
              }`}>
                <ShieldCheck className="w-3.5 h-3.5" />
                {client.kycStatus || 'Not Submitted'}
              </span>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Open Positions</div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-200 font-mono mt-0.5 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
              {openTrades.length} Active Trades
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Registered Date</div>
            <div className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1 mt-0.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {client.createdAt ? formatDate(client.createdAt) : '—'}
            </div>
          </div>
        </div>

        {/* 6 UNIFIED NAVIGATION TABS */}
        <div className="px-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1 overflow-x-auto shrink-0 bg-white dark:bg-[#0f172a] scrollbar-none">
          {[
            { id: 'profile', label: 'Profile & Identity', icon: User },
            { id: 'kyc', label: 'KYC & Compliance', icon: ShieldCheck },
            { id: 'wallet', label: 'Wallet & Balances', icon: Wallet },
            { id: 'portfolio', label: `Portfolio (${openTrades.length})`, icon: TrendingUp },
            { id: 'routing', label: 'VIP Deposit Routing', icon: QrCode },
            { id: 'security', label: 'Access & Danger Zone', icon: Lock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`py-3 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* SCROLLABLE BODY CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* TAB 1: PROFILE & IDENTITY */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-5 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                  <User className="w-4 h-4 text-emerald-500" />
                  <span>Personal Identification & Contact</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Full Legal Name
                    </label>
                    <input
                      value={form.fullName}
                      onChange={set('fullName')}
                      placeholder="As on Government ID"
                      className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Phone Number
                    </label>
                    <input
                      value={form.phone}
                      onChange={set('phone')}
                      placeholder="+91 98765 43210"
                      className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Account Tier
                    </label>
                    <select
                      value={form.accountTier}
                      onChange={set('accountTier')}
                      className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Standard">Standard Trader</option>
                      <option value="Pro">Pro Trader</option>
                      <option value="VIP">VIP Institutional</option>
                      <option value="Raw Spread">Raw Spread VIP</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Trading Experience
                    </label>
                    <input
                      value={form.tradingExperience}
                      onChange={set('tradingExperience')}
                      placeholder="e.g. 1-3 years"
                      className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Risk Tolerance
                    </label>
                    <input
                      value={form.riskTolerance}
                      onChange={set('riskTolerance')}
                      placeholder="e.g. Moderate / High"
                      className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  <span>Residential Address</span>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Street Address
                  </label>
                  <input
                    value={form.address}
                    onChange={set('address')}
                    placeholder="House / Flat no, Road name"
                    className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">City</label>
                    <input
                      value={form.city}
                      onChange={set('city')}
                      placeholder="Mumbai"
                      className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">State</label>
                    <input
                      value={form.state}
                      onChange={set('state')}
                      placeholder="Maharashtra"
                      className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">PIN / Postal Code</label>
                    <input
                      value={form.postalCode}
                      onChange={set('postalCode')}
                      placeholder="400001"
                      className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Bank Account */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                  <Building2 className="w-4 h-4 text-purple-500" />
                  <span>Withdrawal Bank Account & UPI</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Account Holder</label>
                    <input
                      value={form.bankAccountName}
                      onChange={set('bankAccountName')}
                      placeholder="As per bank passbook"
                      className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Bank Name</label>
                    <input
                      value={form.bankName}
                      onChange={set('bankName')}
                      placeholder="e.g. HDFC Bank"
                      className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Account Number</label>
                    <input
                      value={form.bankAccountNumber}
                      onChange={set('bankAccountNumber')}
                      placeholder="501000..."
                      className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">IFSC Code</label>
                    <input
                      value={form.bankIfsc}
                      onChange={set('bankIfsc')}
                      placeholder="HDFC0001234"
                      className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white font-mono uppercase focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Client UPI ID</label>
                  <input
                    value={form.userUpiId}
                    onChange={set('userUpiId')}
                    placeholder="client@upi"
                    className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-500/20 active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {savingProfile ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Save Profile Changes</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: KYC & COMPLIANCE */}
          {activeTab === 'kyc' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>KYC Compliance Override</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                    client.kycStatus === 'approved'
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                      : client.kycStatus === 'pending'
                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}>
                    Current: {client.kycStatus || 'Unverified'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['approved', 'pending', 'rejected', 'unverified'] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setKycStatus(status)}
                      className={`p-3 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                        kycStatus === status
                          ? status === 'approved'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20'
                            : status === 'pending'
                            ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20'
                            : status === 'rejected'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-500/20'
                            : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <span className="capitalize">{status}</span>
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Compliance Officer Review Remarks
                  </label>
                  <input
                    value={kycNotes}
                    onChange={(e) => setKycNotes(e.target.value)}
                    placeholder="e.g. Identity verified against UIDAI / PAN portal on 2026-08-22."
                    className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleSaveKyc}
                    disabled={savingKyc}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-500/20 active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {savingKyc ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Apply KYC Override</span>
                  </button>
                </div>
              </div>

              {/* Document Reference Info */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span>Submitted Identity Records</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Aadhaar Reference</span>
                      <strong className="font-mono text-xs">{client.aadhaarNumber || 'Not Provided'}</strong>
                    </div>
                    {client.aadhaarNumber && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(client.aadhaarNumber || '');
                          setCopiedDoc(true);
                          setTimeout(() => setCopiedDoc(false), 2000);
                        }}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                        title="Copy Aadhaar Number"
                      >
                        {copiedDoc ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">PAN Reference</span>
                      <strong className="font-mono text-xs uppercase">{client.panNumber || 'Not Provided'}</strong>
                    </div>
                    {client.panNumber && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(client.panNumber || '');
                          setCopiedDoc(true);
                          setTimeout(() => setCopiedDoc(false), 2000);
                        }}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                        title="Copy PAN Number"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {userKycRecord && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                    Submitted on <strong>{formatDate(userKycRecord.submittedAt)}</strong> with {userKycRecord.documentType} ({userKycRecord.filePaths?.length ?? 0} photos attached).
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: WALLET & BALANCES */}
          {activeTab === 'wallet' && (
            <div className="space-y-5 animate-fadeIn">
              {/* Balance Modifier */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                    <span>Instant Ledger Adjustment</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Current Balance</span>
                    <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">{formatUSD(client.walletBalance)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      USD Amount ($)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={adjustAmount}
                      onChange={(e) => setAdjustAmount(Number(e.target.value))}
                      placeholder="100.00"
                      className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Reason / Reference Note
                    </label>
                    <input
                      value={adjustReason}
                      onChange={(e) => setAdjustReason(e.target.value)}
                      placeholder="e.g. Deposit reconciliation / Trading credit"
                      className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    disabled={adjustingBalance}
                    onClick={() => handleAdjustBalance(true)}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    <span>Credit +${adjustAmount.toFixed(2)} to Wallet</span>
                  </button>

                  <button
                    type="button"
                    disabled={adjustingBalance}
                    onClick={() => handleAdjustBalance(false)}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md shadow-rose-500/20 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Debit -${adjustAmount.toFixed(2)} from Wallet</span>
                  </button>
                </div>
              </div>

              {/* Ledger History List */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-500" />
                  <span>Client Ledger History ({userLedger.length})</span>
                </div>

                {userLedger.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs font-mono">No ledger movements recorded for this user.</div>
                ) : (
                  <div className="divide-y divide-slate-200/60 dark:divide-slate-800/60 max-h-56 overflow-y-auto">
                    {userLedger.map((item) => (
                      <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">{item.reason}</div>
                          <span className="text-[10px] text-slate-400 font-mono">{formatDate(item.created_at || (item as any).createdAt)}</span>
                        </div>
                        <div className="text-right font-mono">
                          <span className={`font-bold ${item.direction === 'credit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {item.direction === 'credit' ? '+' : '-'}${Number(item.amount).toFixed(2)}
                          </span>
                          <div className="text-[10px] text-slate-400">Balance: ${Number(item.balance_after ?? (item as any).balanceAfter ?? 0).toFixed(2)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: PORTFOLIO & TRADES */}
          {activeTab === 'portfolio' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  <span>Active Open Positions ({openTrades.length})</span>
                </div>
                <button
                  type="button"
                  onClick={fetchClientTrades}
                  disabled={loadingTrades}
                  className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingTrades ? 'animate-spin' : ''}`} />
                  <span>Refresh Trades</span>
                </button>
              </div>

              {trades.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 text-slate-400 text-xs font-mono">
                  No active trade orders or open positions for this client.
                </div>
              ) : (
                <div className="space-y-3">
                  {trades.map((trade) => {
                    const isBuy = trade.type.toUpperCase() === 'BUY';
                    const isClosing = closingTradeId === trade.id;
                    return (
                      <div
                        key={trade.id}
                        className="p-4 rounded-2xl bg-slate-50 dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              isBuy ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                            }`}>
                              {trade.type}
                            </span>
                            <strong className="text-xs font-bold text-slate-900 dark:text-white font-mono">{trade.symbol}</strong>
                            <span className="text-[11px] text-slate-400 font-mono">Lots: {trade.lotSize}</span>
                          </div>

                          <div className="text-right font-mono">
                            <span className={`text-xs font-bold ${trade.pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-slate-400 block">Margin: ${trade.margin.toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono p-2 rounded-xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
                          <div>
                            <span className="text-slate-400 block text-[9px]">ENTRY</span>
                            <span>{trade.entryPrice.toFixed(4)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px]">LEVERAGE</span>
                            <span>{trade.leverage || '1:100'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px]">STOP LOSS</span>
                            <span>{trade.stopLoss ? trade.stopLoss.toFixed(4) : '—'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px]">TAKE PROFIT</span>
                            <span>{trade.takeProfit ? trade.takeProfit.toFixed(4) : '—'}</span>
                          </div>
                        </div>

                        {trade.status === 'OPEN' && (
                          <div className="flex gap-2 justify-end pt-1">
                            <button
                              type="button"
                              disabled={isClosing}
                              onClick={async () => {
                                setClosingTradeId(trade.id);
                                await closeClientTrade(trade.id, client.id);
                                setClosingTradeId('');
                                void fetchClientTrades();
                              }}
                              className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                            >
                              {isClosing ? 'Closing Position…' : 'Close Position (Market)'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: VIP DEPOSIT ROUTING */}
          {activeTab === 'routing' && (
            <form onSubmit={handleSaveRouting} className="space-y-5 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2.5">
                <QrCode className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Dedicated Client Deposit Channels:</strong> You can assign a custom private bank account and dedicated UPI ID specifically for this client. When enabled, this client will ONLY see these private payment channels on their deposit page.
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-900 dark:text-white">Enable Dedicated VIP Channel</div>
                    <p className="text-[11px] text-slate-500">Overrides global broker deposit desk settings for this client.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isCustomRouting}
                    onChange={(e) => setIsCustomRouting(e.target.checked)}
                    className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                  />
                </div>

                {isCustomRouting && (
                  <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Dedicated UPI ID
                        </label>
                        <input
                          value={routingUpiId}
                          onChange={(e) => setRoutingUpiId(e.target.value)}
                          placeholder="client.vip@hdfcbank"
                          className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Custom QR Code Image URL
                        </label>
                        <input
                          value={routingQrUrl}
                          onChange={(e) => setRoutingQrUrl(e.target.value)}
                          placeholder="https://... / image path"
                          className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Custom Bank Name
                        </label>
                        <input
                          value={routingBankName}
                          onChange={(e) => setRoutingBankName(e.target.value)}
                          placeholder="ICICI Private Banking"
                          className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Custom Account Holder Name
                        </label>
                        <input
                          value={routingAccountHolder}
                          onChange={(e) => setRoutingAccountHolder(e.target.value)}
                          placeholder="Global Forex Institutional Custody"
                          className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Custom Account Number
                        </label>
                        <input
                          value={routingAccountNumber}
                          onChange={(e) => setRoutingAccountNumber(e.target.value)}
                          placeholder="00123987465"
                          className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Custom IFSC Code
                        </label>
                        <input
                          value={routingIfsc}
                          onChange={(e) => setRoutingIfsc(e.target.value)}
                          placeholder="ICIC0000001"
                          className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white font-mono uppercase focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                        Internal Desk Routing Notes
                      </label>
                      <input
                        value={routingNotes}
                        onChange={(e) => setRoutingNotes(e.target.value)}
                        placeholder="e.g. VIP client assigned to Desk 2 escrow account."
                        className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingRouting}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-500/20 active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {savingRouting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Save VIP Deposit Routing</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 6: ACCESS & DANGER ZONE */}
          {activeTab === 'security' && (
            <div className="space-y-5 animate-fadeIn">
              {/* Account Suspension Control */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Account Access State</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Suspension revokes active sessions and blocks sign-in immediately.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleToggleStatus}
                  disabled={togglingStatus}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer ${
                    client.isActive !== false
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-rose-100'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {togglingStatus ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : client.isActive !== false ? (
                    <Ban className="w-3.5 h-3.5" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>{client.isActive !== false ? 'Suspend Account' : 'Reactivate Account'}</span>
                </button>
              </div>

              {/* Danger Zone: Permanent Purge */}
              {isDeveloper && (
                <div className="p-5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-400">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Permanent Account Purge (Developer Action)</span>
                  </div>
                  <p className="text-xs text-rose-600/90 dark:text-rose-300/90 leading-relaxed">
                    Completely deletes this client from database tables, wipes wallet balances (${client.walletBalance.toFixed(2)}), clears trade positions, deposit histories, KYC files, and revokes Supabase Auth credentials. The user will have to sign up from scratch.
                  </p>

                  <div className="pt-2 space-y-2">
                    <label className="block text-[11px] font-bold text-rose-800 dark:text-rose-300">
                      Type <code className="px-1.5 py-0.5 rounded bg-rose-200/60 dark:bg-rose-900/60 font-mono">{client.email}</code> to confirm deletion:
                    </label>
                    <input
                      value={confirmDeleteText}
                      onChange={(e) => setConfirmDeleteText(e.target.value)}
                      placeholder={client.email}
                      className="w-full bg-white dark:bg-[#0f172a] border border-rose-300 dark:border-rose-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      disabled={deletingUser || confirmDeleteText.trim() !== client.email.trim()}
                      onClick={handleDeleteUser}
                      className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md shadow-rose-500/20 active:scale-95 disabled:opacity-40 flex items-center gap-2 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{deletingUser ? 'Purging Client…' : 'Purge Client Permanently'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FIXED FOOTER */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-[#111827]/90 flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-400 font-mono">
            User ID: <span className="font-semibold text-slate-600 dark:text-slate-300">{client.id}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs transition-all hover:opacity-90 cursor-pointer"
          >
            Close Dossier
          </button>
        </div>

      </div>
    </div>
  );
};
