'use client';

import React, { useState } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Building,
  CreditCard,
  Briefcase,
  Layers,
  FileText,
  DollarSign,
  ShieldCheck
} from 'lucide-react';
import { useAdmin } from '@/lib/admin-store';
import { formatUSD, formatINR, formatDate } from '@/lib/utils';
import { UserProfile } from '@/lib/types';
import { ClientDetailPanel } from '@/components/admin/ClientDetailPanel';

import { AdminClientPortfolioModal } from '@/components/admin/modals/AdminClientPortfolioModal';
import { AdminClientPaymentConfigModal } from '@/components/admin/modals/AdminClientPaymentConfigModal';
import { AdminManualKycModal } from '@/components/admin/modals/AdminManualKycModal';
import { useApp } from '@/lib/store';

export default function AdminUsersPage() {
  const { currentUser } = useApp();
  const {
    users,
    kycRecords,
    transactions,
    tradeOrders,
    ledgerEntries,
    adjustUserBalance,
    deleteUser,
    paymentSettings
  } = useAdmin();

  const isStaff = currentUser?.role === 'staff';
  const isDeveloper = currentUser?.role === 'developer' || currentUser?.role === 'admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [manageUser, setManageUser] = useState<UserProfile | null>(null);
  const [portfolioUser, setPortfolioUser] = useState<UserProfile | null>(null);
  const [paymentConfigUser, setPaymentConfigUser] = useState<UserProfile | null>(null);
  const [verifyKycUser, setVerifyKycUser] = useState<UserProfile | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState<number>(100);
  const [adjustReason, setAdjustReason] = useState('Manual Ledger Correction');

  // Standard Admin Console strictly manages retail client accounts
  const clientAccounts = users.filter((u) => u.role === 'client' || !u.role);

  const filteredUsers = clientAccounts.filter(
    (u) =>
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone.includes(searchQuery)
  );

  const selectedUserTrades = tradeOrders.filter((t) => t.userId === selectedUser?.id);
  const selectedUserTransactions = transactions.filter((t) => t.userId === selectedUser?.id);
  const selectedUserLedger = ledgerEntries.filter((l) => l.userId === selectedUser?.id);
  const selectedUserKyc = kycRecords.find((k) => k.userId === selectedUser?.id);

  const handleAdjustBalance = (e: React.FormEvent, isCredit: boolean) => {
    e.preventDefault();
    if (!selectedUser) return;
    const delta = isCredit ? Math.abs(adjustAmount) : -Math.abs(adjustAmount);
    adjustUserBalance(selectedUser.id, delta, adjustReason);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Client Registry ({users.length})
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Search clients, inspect personal profiles, KYC documents, open positions, and configure custom deposit accounts.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, email, phone..."
            className="w-full bg-white dark:bg-[#0d121c] border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
          />
        </div>
      </div>

      {/* Users List (Mobile Cards + Desktop Table) */}
      <div className="rounded-2xl bg-white dark:bg-[#0d121c] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        
        {/* Mobile User Card List */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs font-mono">No clients matching your query.</div>
          ) : (
            filteredUsers.map((user) => (
              <div key={user.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong className="text-xs sm:text-sm text-slate-900 dark:text-white font-bold truncate">{user.fullName}</strong>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${
                        user.kycStatus === 'approved'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                          : user.kycStatus === 'pending'
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}>
                        {user.kycStatus || 'unverified'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">{user.email}</p>
                    {user.phone && <p className="text-[10px] text-slate-400 font-mono">{user.phone}</p>}
                  </div>

                  <div className="text-right font-mono shrink-0">
                    <div className="text-[10px] text-slate-400">Balance</div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{formatUSD(user.walletBalance)}</div>
                  </div>
                </div>

                {/* Quick Action Chips */}
                <div className="grid grid-cols-5 gap-1 pt-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setVerifyKycUser(user)}
                    className="py-2 px-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-bold text-center active:scale-95 transition-all flex items-center justify-center gap-0.5"
                  >
                    <ShieldCheck className="w-3 h-3" />
                    <span>KYC</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPortfolioUser(user)}
                    className="py-2 px-1 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold text-center active:scale-95 transition-all truncate"
                  >
                    Portfolio
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentConfigUser(user)}
                    className="py-2 px-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold text-center active:scale-95 transition-all truncate"
                  >
                    Deposit
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedUser(user)}
                    className="py-2 px-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-center active:scale-95 transition-all"
                  >
                    Profile
                  </button>
                  {isDeveloper && (
                    <button
                      type="button"
                      onClick={() => setUserToDelete(user)}
                      className="py-2 px-1 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-600 border border-rose-200 dark:border-rose-800 font-bold text-center active:scale-95 transition-all"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 dark:bg-[#080d14] text-slate-500 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase font-sans">
              <tr>
                <th className="py-3 px-4">Client Name</th>
                <th className="py-3 px-4">Email / Phone</th>
                <th className="py-3 px-4">KYC Status</th>
                <th className="py-3 px-4">Wallet Balance</th>
                <th className="py-3 px-4">Account Tier</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
                >
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white font-sans">
                    {user.fullName}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">
                    <div>{user.email}</div>
                    <div className="text-[10px] text-slate-400">{user.phone}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      user.kycStatus === 'approved'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-[#00d674]'
                        : user.kycStatus === 'pending'
                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}>
                      {user.kycStatus}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white text-sm">
                    {formatUSD(user.walletBalance)}
                  </td>
                  <td className="py-3.5 px-4 font-sans text-slate-600 dark:text-slate-300">
                    {user.accountTier || 'Standard'}
                  </td>
                  <td className="py-3.5 px-4 text-right font-sans space-x-1.5 whitespace-nowrap">
                    <button
                      onClick={() => setVerifyKycUser(user)}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-colors inline-flex items-center gap-1 ${
                        user.kycStatus === 'approved'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-[#00d674] border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                          : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:bg-amber-100'
                      }`}
                    >
                      <ShieldCheck className="w-3 h-3" />
                      <span>Verify KYC</span>
                    </button>
                    <button
                      onClick={() => setPortfolioUser(user)}
                      className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[11px] font-bold hover:bg-purple-100 transition-colors"
                    >
                      Portfolio
                    </button>
                    <button
                      onClick={() => setPaymentConfigUser(user)}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] font-bold hover:bg-blue-100 transition-colors"
                    >
                      Deposit Setup
                    </button>
                    <button
                      onClick={() => setManageUser(user)}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[11px] font-bold hover:opacity-90 transition-opacity"
                    >
                      Manage
                    </button>
                    <button
                      onClick={() => setSelectedUser(user)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-[11px] font-semibold"
                    >
                      Profile
                    </button>
                    {isDeveloper && (
                      <button
                        onClick={() => setUserToDelete(user)}
                        className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-600 border border-rose-200 dark:border-rose-800 text-[11px] font-bold transition-colors"
                        title="Permanently Delete User (Developer Only)"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AdminClientPortfolioModal
        user={portfolioUser}
        isOpen={Boolean(portfolioUser)}
        onClose={() => setPortfolioUser(null)}
      />

      <AdminClientPaymentConfigModal
        user={paymentConfigUser}
        isOpen={Boolean(paymentConfigUser)}
        onClose={() => setPaymentConfigUser(null)}
      />

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="p-6 rounded-3xl bg-white dark:bg-[#0d121c] border border-rose-300 dark:border-rose-900/60 max-w-md w-full space-y-4 shadow-2xl animate-scale-in text-xs font-sans">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Permanently Delete Client?
                </h3>
                <p className="text-xs text-slate-500">
                  This action is irreversible.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 space-y-1.5 text-rose-900 dark:text-rose-200 text-xs">
              <p>
                You are about to completely purge <strong>{userToDelete.fullName}</strong> (<code>{userToDelete.email}</code>).
              </p>
              <p className="text-[11px] text-rose-700 dark:text-rose-300">
                • Wipes wallet balance (${userToDelete.walletBalance.toFixed(2)})<br />
                • Deletes all trade orders & positions<br />
                • Deletes all deposit & withdrawal history<br />
                • Purges uploaded KYC documents & active sessions<br />
                • <strong>Completely removes authentication credentials so the user must re-register from scratch</strong>
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true);
                  await deleteUser(userToDelete.id);
                  setDeleting(false);
                  setUserToDelete(null);
                  if (selectedUser?.id === userToDelete.id) setSelectedUser(null);
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all shadow-md shadow-rose-500/20 active:scale-95 disabled:opacity-50"
              >
                {deleting ? 'Deleting User…' : 'Yes, Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete User Profile Inspection Drawer / Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#0d121c] border border-slate-300 dark:border-slate-700 max-w-2xl w-full space-y-5 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto text-xs">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Client File: {selectedUser.fullName}
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">
                  {selectedUser.email} • {selectedUser.phone}
                </p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] font-sans">Wallet Margin</span>
                <strong className="text-emerald-600 dark:text-[#00d674] text-sm">{formatUSD(selectedUser.walletBalance)}</strong>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] font-sans">INR Equivalent</span>
                <strong className="text-slate-900 dark:text-white text-sm">{formatINR(selectedUser.walletBalance * paymentSettings.usdToInrRate)}</strong>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[10px] font-sans">KYC Status</span>
                  <strong className="text-slate-900 dark:text-white uppercase text-xs">{selectedUser.kycStatus}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => setVerifyKycUser(selectedUser)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold shadow-xs flex items-center gap-1"
                >
                  <ShieldCheck className="w-3 h-3" />
                  <span>Verify / Edit</span>
                </button>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] font-sans">Active Trades</span>
                <strong className="text-purple-600 dark:text-purple-400 text-sm">
                  {selectedUserTrades.filter((t) => t.status === 'OPEN').length}
                </strong>
              </div>
            </div>

            {/* Linked Bank Details */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 font-mono">
              <span className="text-xs font-bold font-sans text-slate-900 dark:text-white block mb-1">
                Linked Beneficiary Bank Account
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>Bank: <strong className="text-slate-900 dark:text-white font-sans">{selectedUser.bankName || 'HDFC Bank'}</strong></div>
                <div>Account: <strong className="text-slate-900 dark:text-white">{selectedUser.bankAccountNumber || '— not provided —'}</strong></div>
                <div>IFSC: <strong className="text-slate-900 dark:text-white">{selectedUser.bankIfsc || '— not provided —'}</strong></div>
                <div>UPI ID: <strong className="text-slate-900 dark:text-white">{selectedUser.userUpiId || 'rohan@okhdfcbank'}</strong></div>
              </div>
            </div>

            {/* Manual Balance Adjuster */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <span className="text-xs font-bold font-sans text-slate-900 dark:text-white block">
                Direct Ledger Adjustment (Audited)
              </span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(Number(e.target.value))}
                  placeholder="Amount in USD..."
                  className="bg-white dark:bg-[#070b12] border border-slate-300 dark:border-slate-700 rounded-lg p-2 font-mono"
                />
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Reason for adjustment..."
                  className="bg-white dark:bg-[#070b12] border border-slate-300 dark:border-slate-700 rounded-lg p-2"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={(e) => handleAdjustBalance(e, true)}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                >
                  + Credit ${adjustAmount} USD
                </button>
                <button
                  type="button"
                  onClick={(e) => handleAdjustBalance(e, false)}
                  className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
                >
                  - Debit ${adjustAmount} USD
                </button>
              </div>
            </div>

            {/* Recent Positions for this User */}
            <div className="space-y-2">
              <span className="text-xs font-bold font-sans text-slate-900 dark:text-white block">
                Trade Positions ({selectedUserTrades.length})
              </span>
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                <table className="w-full text-left font-mono text-[11px]">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-sans text-[10px]">
                    <tr>
                      <th className="p-2">Asset</th>
                      <th className="p-2">Side</th>
                      <th className="p-2">Size</th>
                      <th className="p-2">P&L</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {selectedUserTrades.map((t) => (
                      <tr key={t.id}>
                        <td className="p-2 font-bold text-slate-900 dark:text-white">{t.symbol}</td>
                        <td className="p-2">{t.type}</td>
                        <td className="p-2">{t.lotSize}</td>
                        <td className={`p-2 font-bold ${t.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {t.pnl >= 0 ? '+' : ''}${t.pnl}
                        </td>
                        <td className="p-2 uppercase text-[10px]">{t.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      {manageUser && (
        <ClientDetailPanel client={manageUser} onClose={() => setManageUser(null)} />
      )}

      {verifyKycUser && (
        <AdminManualKycModal
          user={verifyKycUser}
          onClose={() => setVerifyKycUser(null)}
        />
      )}

    </div>
  );
}
