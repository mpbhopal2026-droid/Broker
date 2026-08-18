'use client';

import React, { useState } from 'react';
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
  Phone,
  Mail,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  Lock,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { useAdmin } from '@/lib/admin-store';
import { useApp } from '@/lib/store';
import { deriveFxRates } from '@/lib/pricing';
import type { UserProfile } from '@/lib/types';
import { formatUSD, formatDate } from '@/lib/utils';
import { AdminManualKycModal } from '@/components/admin/modals/AdminManualKycModal';

export const ClientDetailPanel: React.FC<{ client: UserProfile; onClose: () => void }> = ({
  client,
  onClose,
}) => {
  const { adminUpdateUserProfile, setUserActive, setClientPaymentConfig } = useAdmin();
  const { showToast, paymentSettings } = useApp();

  const [activeTab, setActiveTab] = useState<'profile' | 'banking' | 'routing' | 'security'>('profile');
  const [saving, setSaving] = useState(false);
  const [showKycModal, setShowKycModal] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  const fx = deriveFxRates(
    paymentSettings.usdToInrRate,
    paymentSettings.inrSpreadDeposit ?? 0,
    paymentSettings.inrSpreadWithdrawal ?? 0,
  );

  const [form, setForm] = useState({
    fullName: client.fullName ?? '',
    phone: client.phone ?? '',
    address: client.address ?? '',
    city: client.city ?? '',
    state: client.state ?? '',
    postalCode: client.postalCode ?? '',
    bankAccountName: client.bankAccountName ?? '',
    bankName: client.bankName ?? '',
    bankAccountNumber: client.bankAccountNumber ?? '',
    bankIfsc: client.bankIfsc ?? '',
    userUpiId: client.userUpiId ?? '',
  });

  const [payUpi, setPayUpi] = useState('');
  const [savingRouting, setSavingRouting] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await adminUpdateUserProfile(client.id, form as Partial<UserProfile>);
    setSaving(false);
    showToast(
      res.success
        ? { type: 'success', title: 'Profile Updated', message: res.message ?? 'Client changes saved successfully.' }
        : { type: 'error', title: 'Update Failed', message: res.error ?? 'Could not save client profile.' },
    );
  };

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
            message: newStatus ? 'Client can now sign in and trade.' : 'Client has been signed out and blocked.',
          }
        : { type: 'error', title: 'Action Failed', message: res.error ?? 'Could not update status.' },
    );
  };

  const handleSetRouting = async () => {
    if (!payUpi.trim()) return;
    setSavingRouting(true);
    const res = await setClientPaymentConfig({
      userId: client.id,
      upiId: payUpi.trim(),
      accountHolder: 'Global Forex Custody',
    } as never);
    setSavingRouting(false);
    if (res.success) {
      setPayUpi('');
      showToast({ type: 'success', title: 'Routing Configured', message: `Custom deposit UPI linked to ${client.fullName || client.email}.` });
    } else {
      showToast({ type: 'error', title: 'Routing Failed', message: res.error ?? 'Could not update deposit routing.' });
    }
  };

  // Initials for avatar
  const initials = (client.fullName || client.email || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="w-full max-w-4xl my-auto bg-white dark:bg-[#0f172a] rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[94vh] overflow-hidden animate-scale-in">
        
        {/* TOP HEADER */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#111827]/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 pr-1">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white font-bold text-sm sm:text-base flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                  {client.fullName || 'Unnamed Client'}
                </h2>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${
                  client.isActive !== false
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${client.isActive !== false ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                  {client.isActive !== false ? 'Active Client' : 'Suspended'}
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-800 text-[9px] sm:text-[10px] font-mono text-slate-600 dark:text-slate-300 uppercase">
                  {client.role || 'client'}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-mono truncate mt-0.5">
                {client.email} {client.phone ? `• ${client.phone}` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-200/60 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* FINANCIAL SUMMARY STRIP */}
        <div className="px-6 py-3.5 bg-slate-100/70 dark:bg-[#161f30] border-b border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 shrink-0 text-xs">
          <div className="space-y-0.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Wallet Balance</div>
            <div className="text-sm font-bold text-slate-900 dark:text-white font-mono flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5 text-emerald-500" />
              {formatUSD(client.walletBalance ?? 0)}
            </div>
          </div>

          <div className="space-y-0.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">KYC Verification</div>
            <div className="flex items-center gap-2">
              <span className={`font-bold uppercase text-[11px] flex items-center gap-1 ${
                client.kycStatus === 'approved'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : client.kycStatus === 'pending'
                  ? 'text-amber-500'
                  : 'text-slate-400'
              }`}>
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                {client.kycStatus || 'Not Submitted'}
              </span>
              <button
                type="button"
                onClick={() => setShowKycModal(true)}
                className="px-2 py-0.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold transition-colors"
              >
                Inspect
              </button>
            </div>
          </div>

          <div className="space-y-0.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Effective Fx Rates</div>
            <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200 font-mono">
              In: ₹{Number(fx.deposit).toFixed(2)} | Out: ₹{Number(fx.withdrawal).toFixed(2)}
            </div>
          </div>

          <div className="space-y-0.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Member Since</div>
            <div className="text-[11px] font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {client.createdAt ? formatDate(client.createdAt) : '—'}
            </div>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="px-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto shrink-0 bg-white dark:bg-[#0f172a]">
          {[
            { id: 'profile', label: 'Identity & Address', icon: User },
            { id: 'banking', label: 'Payout & Bank Account', icon: Building2 },
            { id: 'routing', label: 'Custom Deposit Routing', icon: QrCode },
            { id: 'security', label: 'Account Security & Access', icon: Lock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`py-3.5 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Identity Box */}
              <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800/80 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                  <User className="w-4 h-4 text-emerald-500" />
                  <span>Personal Identification</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                      Full Legal Name
                    </label>
                    <input
                      value={form.fullName}
                      onChange={set('fullName')}
                      placeholder="As on PAN / Aadhaar"
                      className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                      Phone Number
                    </label>
                    <input
                      value={form.phone}
                      onChange={set('phone')}
                      placeholder="+91 98765 43210"
                      className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Address Box */}
              <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800/80 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  <span>Residential Address</span>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                      Street Address & Landmark
                    </label>
                    <input
                      value={form.address}
                      onChange={set('address')}
                      placeholder="Flat / Building, Road name, Area"
                      className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                        City
                      </label>
                      <input
                        value={form.city}
                        onChange={set('city')}
                        placeholder="Mumbai"
                        className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                        State / Province
                      </label>
                      <input
                        value={form.state}
                        onChange={set('state')}
                        placeholder="Maharashtra"
                        className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                        PIN / Postal Code
                      </label>
                      <input
                        value={form.postalCode}
                        onChange={set('postalCode')}
                        placeholder="400001"
                        className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'banking' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5">
                <Building2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Client Withdrawal Destination:</strong> Payouts for this client are settled into the bank account and UPI details specified below. Ensure details match verified KYC documents.
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800/80 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                  <CreditCard className="w-4 h-4 text-purple-500" />
                  <span>Bank Account Information</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                      Account Holder Name
                    </label>
                    <input
                      value={form.bankAccountName}
                      onChange={set('bankAccountName')}
                      placeholder="Name as registered with bank"
                      className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                      Bank Name
                    </label>
                    <input
                      value={form.bankName}
                      onChange={set('bankName')}
                      placeholder="e.g. HDFC Bank, ICICI Bank"
                      className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                      Account Number
                    </label>
                    <input
                      value={form.bankAccountNumber}
                      onChange={set('bankAccountNumber')}
                      placeholder="e.g. 50100293847162"
                      className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                      IFSC Code
                    </label>
                    <input
                      value={form.bankIfsc}
                      onChange={set('bankIfsc')}
                      placeholder="HDFC0001234"
                      className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono uppercase focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                    User UPI ID / VPA
                  </label>
                  <input
                    value={form.userUpiId}
                    onChange={set('userUpiId')}
                    placeholder="client@okaxis / client@icici"
                    className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'routing' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800/80 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                  <QrCode className="w-4 h-4 text-emerald-500" />
                  <span>Dedicated UPI Deposit Override</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Route deposits made by this specific client to a dedicated corporate UPI handle instead of the platform default.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <input
                    value={payUpi}
                    onChange={(e) => setPayUpi(e.target.value)}
                    placeholder="e.g. desk.vip@hdfcbank"
                    className="flex-1 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleSetRouting}
                    disabled={!payUpi.trim() || savingRouting}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-40 transition-all flex items-center justify-center gap-2 shrink-0 shadow-sm"
                  >
                    {savingRouting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Set Custom Route</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Account Status */}
              <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Account Access State</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Suspension revokes all active sessions immediately and blocks OTP sign-in.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleStatus}
                    disabled={togglingStatus}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm ${
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
              </div>

              {/* KYC Control */}
              <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">KYC Manual Verification Desk</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Manually review, approve, reject, or request re-upload of client identity documents.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowKycModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-700 transition-all flex items-center gap-2 shrink-0"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Open KYC Inspector</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* FIXED FOOTER WITH SAVE BUTTON */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-[#111827]/90 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-200/70 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-7 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-md shadow-emerald-500/20 active:scale-95 flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Saving Client Profile…</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Client Details</span>
              </>
            )}
          </button>
        </div>

      </div>

      {showKycModal && (
        <AdminManualKycModal
          user={client}
          onClose={() => setShowKycModal(false)}
        />
      )}
    </div>
  );
};
