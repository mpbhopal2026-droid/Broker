'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  ShieldCheck,
  CreditCard,
  Clock,
  Layers,
  ArrowRight,
  TrendingUp,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Building,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Eye,
  Sliders,
  DollarSign
} from 'lucide-react';
import { useAdmin } from '@/lib/admin-store';
import { useApp } from '@/lib/store';
import { formatUSD, formatINR, formatDate } from '@/lib/utils';
import { ClientDetailPanel } from '@/components/admin/ClientDetailPanel';
import { AdminReviewDepositModal } from '@/components/admin/modals/AdminReviewDepositModal';
import { AdminReviewWithdrawalModal } from '@/components/admin/modals/AdminReviewWithdrawalModal';
import { AdminManualKycModal } from '@/components/admin/modals/AdminManualKycModal';
import type { UserProfile, Transaction, KYCRecord, TradeOrder } from '@/lib/types';

export default function StaffOperationsPage() {
  const router = useRouter();
  const { currentUser, paymentSettings } = useApp();
  const {
    users,
    transactions,
    kycRecords,
    tradeOrders,
  } = useAdmin();

  // Active Queue Tab
  const [activeQueueTab, setActiveQueueTab] = useState<'kyc' | 'deposits' | 'withdrawals' | 'trades'>('deposits');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Items for Action Modals
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedDeposit, setSelectedDeposit] = useState<Transaction | null>(null);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Transaction | null>(null);
  const [selectedKycUser, setSelectedKycUser] = useState<UserProfile | null>(null);

  // Filter queues
  const pendingDeposits = transactions.filter((t) => t.type === 'deposit' && t.status === 'pending');
  const pendingWithdrawals = transactions.filter((t) => t.type === 'withdrawal' && t.status === 'pending');
  const pendingKycUsers = users.filter((u) => u.kycStatus === 'pending');
  const openTrades = tradeOrders.filter((t) => t.status === 'OPEN');
  const clientUsers = users.filter((u) => u.role === 'client' || !u.role);

  const filteredUsers = clientUsers.filter(
    (u) =>
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone?.includes(searchQuery)
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Top Header & Operator Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Staff Operations Duty
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Operator: <strong className="text-slate-700 dark:text-slate-200">{currentUser?.fullName || currentUser?.email}</strong>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Staff Operations Desk
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time client management, pending compliance verifications, capital clearance, and trade supervision.
          </p>
        </div>

        {/* Global Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Quick search client name, email, phone..."
            className="w-full bg-white dark:bg-[#0d121c] border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* 5 Core Operational Workflows (Key Metric Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        
        {/* 1. Users & Portfolio */}
        <Link
          href="/admin/users"
          className="p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-slate-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-slate-900 transition-colors">
              <Users className="w-4 h-4" />
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
              {clientUsers.length}
            </div>
            <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mt-0.5">
              Users & Portfolios
            </div>
          </div>
        </Link>

        {/* 2. KYC Queue */}
        <Link
          href="/admin/kyc"
          className="p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <ShieldCheck className="w-4 h-4" />
            </div>
            {pendingKycUsers.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 animate-pulse">
                {pendingKycUsers.length} Pending
              </span>
            )}
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
              {pendingKycUsers.length}
            </div>
            <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mt-0.5">
              KYC Queue
            </div>
          </div>
        </Link>

        {/* 3. Deposit Clearing */}
        <Link
          href="/admin/deposits"
          className="p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <CreditCard className="w-4 h-4" />
            </div>
            {pendingDeposits.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 animate-pulse">
                {pendingDeposits.length} Action
              </span>
            )}
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
              {pendingDeposits.length}
            </div>
            <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mt-0.5">
              Deposit Clearing
            </div>
          </div>
        </Link>

        {/* 4. Withdrawal Clearance */}
        <Link
          href="/admin/withdrawals"
          className="p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <Clock className="w-4 h-4" />
            </div>
            {pendingWithdrawals.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                {pendingWithdrawals.length} Action
              </span>
            )}
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
              {pendingWithdrawals.length}
            </div>
            <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mt-0.5">
              Payout Queue
            </div>
          </div>
        </Link>

        {/* 5. Trade Ledger */}
        <Link
          href="/admin/trades"
          className="p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all group flex flex-col justify-between col-span-2 sm:col-span-1"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Layers className="w-4 h-4" />
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
              {openTrades.length}
            </div>
            <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mt-0.5">
              Trade Ledger
            </div>
          </div>
        </Link>

      </div>

      {/* Main Operational Workspace (Tabbed Action Queue) */}
      <div className="rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        
        {/* Workspace Queue Navigation */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#111827]/70 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveQueueTab('deposits')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeQueueTab === 'deposits'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Deposits Clearance ({pendingDeposits.length})</span>
            </button>

            <button
              onClick={() => setActiveQueueTab('kyc')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeQueueTab === 'kyc'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>KYC Submissions ({pendingKycUsers.length})</span>
            </button>

            <button
              onClick={() => setActiveQueueTab('withdrawals')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeQueueTab === 'withdrawals'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Payout Requests ({pendingWithdrawals.length})</span>
            </button>

            <button
              onClick={() => setActiveQueueTab('trades')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeQueueTab === 'trades'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Active Trade Positions ({openTrades.length})</span>
            </button>
          </div>

          <Link
            href={
              activeQueueTab === 'deposits'
                ? '/admin/deposits'
                : activeQueueTab === 'kyc'
                ? '/admin/kyc'
                : activeQueueTab === 'withdrawals'
                ? '/admin/withdrawals'
                : '/admin/trades'
            }
            className="text-xs font-bold text-emerald-600 dark:text-[#00d674] hover:underline flex items-center gap-1 shrink-0"
          >
            <span>Open Dedicated Queue</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        {/* 1. DEPOSITS QUEUE */}
        {activeQueueTab === 'deposits' && (
          <div className="p-4 sm:p-6">
            {pendingDeposits.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs font-mono">
                ✅ No pending deposit slips awaiting clearance.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {pendingDeposits.map((tx) => (
                  <div key={tx.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-xs sm:text-sm text-slate-900 dark:text-white font-bold">{tx.userFullName || 'Client'}</strong>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-50 dark:bg-amber-950/60 text-amber-600">
                          Pending Bank Review
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {tx.userEmail} {tx.utrNumber ? `• UTR: ${tx.utrNumber}` : ''}
                      </p>
                      <span className="text-[10px] text-slate-400 font-mono">Submitted {formatDate(tx.createdAt)}</span>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
                      <div className="text-right font-mono">
                        <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">+{formatUSD(tx.amount)}</div>
                        <div className="text-[10px] text-slate-400">₹{(tx.amount * paymentSettings.usdToInrRate).toLocaleString('en-IN')}</div>
                      </div>

                      <button
                        onClick={() => setSelectedDeposit(tx)}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        Inspect & Clear
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. KYC SUBMISSIONS */}
        {activeQueueTab === 'kyc' && (
          <div className="p-4 sm:p-6">
            {pendingKycUsers.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs font-mono">
                ✅ All submitted identity documents are verified.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {pendingKycUsers.map((u) => (
                  <div key={u.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-xs sm:text-sm text-slate-900 dark:text-white font-bold">{u.fullName}</strong>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-50 dark:bg-amber-950/60 text-amber-600">
                          Awaiting Document Verification
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {u.email} {u.phone ? `• ${u.phone}` : ''}
                      </p>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono mt-1">
                        <span>Aadhaar: <strong>{u.aadhaarNumber || '—'}</strong></span>
                        <span>PAN: <strong>{u.panNumber || '—'}</strong></span>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedKycUser(u)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition-all shadow-xs cursor-pointer self-end sm:self-center"
                    >
                      Review KYC Documents
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. WITHDRAWAL REQUESTS */}
        {activeQueueTab === 'withdrawals' && (
          <div className="p-4 sm:p-6">
            {pendingWithdrawals.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs font-mono">
                ✅ No pending payout requests awaiting clearance.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {pendingWithdrawals.map((tx) => (
                  <div key={tx.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-xs sm:text-sm text-slate-900 dark:text-white font-bold">{tx.userFullName || 'Client'}</strong>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-50 dark:bg-rose-950/60 text-rose-600">
                          Pending Payout Approval
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">{tx.userEmail}</p>
                      {tx.withdrawalDetails && (
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Bank: {tx.withdrawalDetails.bankName} • A/C: {tx.withdrawalDetails.accountNumber} • IFSC: {tx.withdrawalDetails.ifscCode}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
                      <div className="text-right font-mono">
                        <div className="text-sm font-bold text-rose-600 dark:text-rose-400">-{formatUSD(tx.amount)}</div>
                        <div className="text-[10px] text-slate-400">₹{(tx.amount * paymentSettings.usdToInrRate).toLocaleString('en-IN')}</div>
                      </div>

                      <button
                        onClick={() => setSelectedWithdrawal(tx)}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        Inspect & Settle
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. ACTIVE TRADE POSITIONS */}
        {activeQueueTab === 'trades' && (
          <div className="p-4 sm:p-6 overflow-x-auto">
            {openTrades.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs font-mono">
                No active client market trades open right now.
              </div>
            ) : (
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800 font-sans">
                  <tr>
                    <th className="py-2.5 px-4">Symbol</th>
                    <th className="py-2.5 px-4">Side</th>
                    <th className="py-2.5 px-4">Lots</th>
                    <th className="py-2.5 px-4">Entry</th>
                    <th className="py-2.5 px-4">Margin</th>
                    <th className="py-2.5 px-4">Unrealized P&L</th>
                    <th className="py-2.5 px-4 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {openTrades.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{t.symbol}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          t.type.toUpperCase() === 'BUY' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                        }`}>
                          {t.type}
                        </span>
                      </td>
                      <td className="py-3 px-4">{t.lotSize}</td>
                      <td className="py-3 px-4">{t.entryPrice.toFixed(4)}</td>
                      <td className="py-3 px-4">${t.margin.toFixed(2)}</td>
                      <td className={`py-3 px-4 font-bold ${t.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-right text-[11px]">{formatDate(t.openedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

      </div>

      {/* Client Quick Search & Management Section */}
      <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Client Portfolio & Account Dossier Search</h3>
          </div>
          <Link href="/admin/users" className="text-xs font-bold text-emerald-600 dark:text-[#00d674] hover:underline">
            View Full Registry →
          </Link>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
          {filteredUsers.slice(0, 8).map((user) => (
            <div key={user.id} className="py-3 flex items-center justify-between text-xs gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <strong className="text-slate-900 dark:text-white font-bold truncate">{user.fullName}</strong>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${
                    user.kycStatus === 'approved'
                      ? 'bg-emerald-50 text-emerald-600'
                      : user.kycStatus === 'pending'
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {user.kycStatus || 'unverified'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono truncate">{user.email} {user.phone ? `• ${user.phone}` : ''}</p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="font-bold text-slate-900 dark:text-white font-mono">{formatUSD(user.walletBalance)}</span>
                <button
                  onClick={() => setSelectedUser(user)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  Manage Dossier
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Modals */}
      {selectedUser && (
        <ClientDetailPanel client={selectedUser} onClose={() => setSelectedUser(null)} />
      )}

      {selectedDeposit && (
        <AdminReviewDepositModal
          deposit={selectedDeposit}
          isOpen={Boolean(selectedDeposit)}
          onClose={() => setSelectedDeposit(null)}
        />
      )}

      {selectedWithdrawal && (
        <AdminReviewWithdrawalModal
          withdrawal={selectedWithdrawal}
          isOpen={Boolean(selectedWithdrawal)}
          onClose={() => setSelectedWithdrawal(null)}
        />
      )}

      {selectedKycUser && (
        <AdminManualKycModal
          user={selectedKycUser}
          onClose={() => setSelectedKycUser(null)}
        />
      )}

    </div>
  );
}
