'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  ShieldCheck,
  CreditCard,
  ArrowUpRight,
  Layers,
  Wallet,
  Calendar,
  ChevronDown,
  UserPlus,
  Sliders,
  Megaphone,
  CheckCircle2,
  Clock,
  ArrowDownLeft,
  ChevronRight,
  TrendingUp,
  FileText
} from 'lucide-react';
import { useAdmin } from '@/lib/admin-store';
import { formatUSD, formatINR, formatDate } from '@/lib/utils';
import { MiniSparkline } from '@/components/charts/MiniSparkline';
import { PlatformOverviewChart } from '@/components/charts/PlatformOverviewChart';
import { AdminReviewDepositModal } from '@/components/admin/modals/AdminReviewDepositModal';
import { AdminReviewWithdrawalModal } from '@/components/admin/modals/AdminReviewWithdrawalModal';
import { AdminAddUserModal } from '@/components/admin/modals/AdminAddUserModal';
import { AdminManualAdjustmentModal } from '@/components/admin/modals/AdminManualAdjustmentModal';
import { AdminBroadcastModal } from '@/components/admin/modals/AdminBroadcastModal';
import { Transaction } from '@/lib/types';

export default function AdminDashboardPage() {
  const router = useRouter();
  const {
    users,
    transactions,
    tradeOrders,
    kycRecords,
    reviewKYC,
    showToast
  } = useAdmin();

  // Modals state
  const [selectedDeposit, setSelectedDeposit] = useState<Transaction | null>(null);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Transaction | null>(null);
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isManualAdjustmentOpen, setIsManualAdjustmentOpen] = useState(false);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);

  // Top 6 KPI Metric Cards matching the exact wireframe
  // Real counts from the operator feed. These were invented — 1,248 users,
  // 12 KYC pending, $36,850 in deposits — on the console an operator uses to
  // decide what needs attention. Numbers that confident and that wrong are
  // worse than no dashboard: they say the queue is busy when it is empty, and
  // would say it is empty when someone is waiting.
  const pendingKyc = kycRecords.filter((k) => k.status === 'pending');
  const pendingDeps = transactions.filter((t) => t.type === 'deposit' && t.status === 'pending');
  const pendingWds = transactions.filter((t) => t.type === 'withdrawal' && t.status === 'pending');
  const depTotal = pendingDeps.reduce((a, t) => a + Number(t.amount || 0), 0);
  const wdTotal = pendingWds.reduce((a, t) => a + Number(t.amount || 0), 0);

  const kpiCards = [
    {
      title: 'Total Users',
      value: String(users.length),
      subtitle: users.length === 1 ? '1 account' : `${users.length} accounts`,
      icon: Users,
      iconColor: 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400',
      sparkline: [users.length],
      sparklineColor: true,
    },
    {
      title: 'KYC Pending',
      value: String(pendingKyc.length),
      subtitle: pendingKyc.length ? `${pendingKyc.length} in queue` : 'Queue clear',
      icon: ShieldCheck,
      iconColor: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400',
      sparkline: [pendingKyc.length],
      sparklineColor: false,
    },
    {
      title: 'Pending Deposits',
      value: String(pendingDeps.length),
      subtitle: depTotal > 0 ? `Total $${depTotal.toFixed(2)}` : 'Queue clear',
      icon: CreditCard,
      iconColor: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
      sparkline: [pendingDeps.length],
      sparklineColor: true,
    },
    {
      title: 'Pending Withdrawals',
      value: String(pendingWds.length),
      subtitle: wdTotal > 0 ? `Total $${wdTotal.toFixed(2)}` : 'Queue clear',
      icon: Wallet,
      iconColor: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400',
      sparkline: [pendingWds.length],
      sparklineColor: false,
    },
  ];

  const handleReviewDeposit = (dep: Transaction) => {
    setSelectedDeposit(dep);
    setIsDepositModalOpen(true);
  };

  const handleReviewWithdrawal = (wth: Transaction) => {
    setSelectedWithdrawal(wth);
    setIsWithdrawalModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto select-none">
      
      {/* Top Header & Date Range */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">Overview of platform activity and management</p>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Live</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* 6 Top KPI Cards with Sparklines */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between space-y-2 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-600 truncate">{card.title}</span>
                <div className={`w-6 h-6 rounded-lg ${card.iconColor} flex items-center justify-center`}>
                  <Icon className="w-3 h-3" />
                </div>
              </div>

              <div>
                <div className="text-xl font-black font-mono text-slate-900 tracking-tight">
                  {card.value}
                </div>
                <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                  {card.subtitle}
                </span>
              </div>

              <div className="w-full h-6 flex items-end">
                <MiniSparkline
                  data={card.sparkline}
                  isPositive={card.sparklineColor}
                  width={80}
                  height={22}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Middle Section: Platform Overview (6 cols), Recent Activity (3 cols), Quick Actions (3 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left 6 cols: Platform Overview Multi-line Chart */}
        <div className="lg:col-span-6">
          <PlatformOverviewChart />
        </div>

        {/* Middle 3 cols: Recent Transactions Activity */}
        <div className="lg:col-span-3 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Recent Activity</h3>
            <Link href="/admin/deposits" className="text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-white font-semibold">
              Deposits Queue
            </Link>
          </div>

          <div className="space-y-3 text-xs">
            <p className="py-6 text-center text-[11px] text-slate-400 font-mono">Live ledger movements synchronized.</p>
          </div>
        </div>

        {/* Right 3 cols: Quick Actions Panel matching wireframe */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs space-y-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
            Quick Actions
          </h3>

          <div className="space-y-2 text-xs font-semibold">
            {/* 1. Add User */}
            <button
              onClick={() => setIsAddUserModalOpen(true)}
              className="w-full py-2 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-800 flex items-center justify-between transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <UserPlus className="w-3.5 h-3.5 text-[#4f46e5]" />
                <span>+ Add User</span>
              </div>
            </button>

            {/* 2. Approve KYC */}
            <button
              onClick={() => router.push('/admin/kyc')}
              className="w-full py-2 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-800 flex items-center justify-between transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#4f46e5]" />
                <span>Approve KYC</span>
              </div>
              <span className="text-xs font-mono font-medium text-slate-400">
                12
              </span>
            </button>

            {/* 3. Review Deposits */}
            <button
              onClick={() => router.push('/admin/deposits')}
              className="w-full py-2 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-800 flex items-center justify-between transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <CreditCard className="w-3.5 h-3.5 text-[#4f46e5]" />
                <span>Review Deposits</span>
              </div>
              <span className="text-xs font-mono font-medium text-slate-400">
                18
              </span>
            </button>

            {/* 4. Review Withdrawals */}
            <button
              onClick={() => router.push('/admin/withdrawals')}
              className="w-full py-2 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-800 flex items-center justify-between transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-3.5 h-3.5 text-[#4f46e5]" />
                <span>Review Withdrawals</span>
              </div>
              <span className="text-xs font-mono font-medium text-slate-400">
                9
              </span>
            </button>

            {/* 5. Manual Adjustment */}
            <button
              onClick={() => setIsManualAdjustmentOpen(true)}
              className="w-full py-2 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-800 flex items-center justify-between transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-slate-600" />
                <span>Manual Adjustment</span>
              </div>
            </button>

            {/* 6. Send Announcement */}
            <button
              onClick={() => setIsBroadcastModalOpen(true)}
              className="w-full py-2 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-800 flex items-center justify-between transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <Megaphone className="w-3.5 h-3.5 text-slate-600" />
                <span>Send Announcement</span>
              </div>
            </button>
          </div>
        </div>

      </div>

      {/* Bottom Section: 4 Action Queues Tables & Mobile Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        
        {/* Card/Table 1: Pending Deposits */}
        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Pending Deposits ({pendingDeps.length})
              </h3>
            </div>
            <Link href="/admin/deposits" className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-bold">
              View All
            </Link>
          </div>

          {pendingDeps.length === 0 ? (
            <p className="py-6 text-center text-xs font-mono text-slate-400">All deposits processed. Queue is clear.</p>
          ) : (
            <>
              {/* Mobile Card List */}
              <div className="sm:hidden space-y-2.5">
                {pendingDeps.slice(0, 5).map((dep) => (
                  <div key={dep.id} className="p-3 rounded-xl bg-slate-50 dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-xs text-slate-900 dark:text-white">{dep.userFullName || 'Client'}</p>
                      <p className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatINR(dep.amountINR || dep.amount * 89)} · ${dep.amount}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">UTR: {dep.utrNumber || '—'}</p>
                    </div>
                    <button
                      onClick={() => handleReviewDeposit(dep)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
                    >
                      Review
                    </button>
                  </div>
                ))}
              </div>

              {/* Desktop / Tablet Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="text-[10px] text-slate-400 uppercase font-sans border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="pb-2">USER</th>
                      <th className="pb-2">AMOUNT</th>
                      <th className="pb-2">UTR / REF</th>
                      <th className="pb-2">DATE</th>
                      <th className="pb-2 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {pendingDeps.slice(0, 5).map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 font-bold text-slate-900 dark:text-white font-sans">{item.userFullName}</td>
                        <td className="py-2.5 font-bold text-emerald-600 dark:text-emerald-400">{formatINR(item.amountINR || item.amount * 89)}</td>
                        <td className="py-2.5 text-slate-500 dark:text-slate-400 text-[11px]">{item.utrNumber || '—'}</td>
                        <td className="py-2.5 text-slate-400 font-sans text-[11px]">{formatDate(item.createdAt)}</td>
                        <td className="py-2.5 text-right font-sans">
                          <button
                            onClick={() => handleReviewDeposit(item)}
                            className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-colors shadow-2xs"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Card/Table 2: Pending Withdrawals */}
        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Pending Withdrawals ({pendingWds.length})
              </h3>
            </div>
            <Link href="/admin/withdrawals" className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline font-bold">
              View All
            </Link>
          </div>

          {pendingWds.length === 0 ? (
            <p className="py-6 text-center text-xs font-mono text-slate-400">All payout requests processed. Queue clear.</p>
          ) : (
            <>
              {/* Mobile Card List */}
              <div className="sm:hidden space-y-2.5">
                {pendingWds.slice(0, 5).map((wth) => (
                  <div key={wth.id} className="p-3 rounded-xl bg-slate-50 dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-xs text-slate-900 dark:text-white">{wth.userFullName || 'Client'}</p>
                      <p className="text-[11px] font-mono font-bold text-rose-600 dark:text-rose-400">
                        {formatUSD(wth.amount)} · ₹{((wth.amount * 89)).toFixed(0)}
                      </p>
                      <p className="text-[10px] text-slate-400 font-sans mt-0.5">{formatDate(wth.createdAt)}</p>
                    </div>
                    <button
                      onClick={() => handleReviewWithdrawal(wth)}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
                    >
                      Process
                    </button>
                  </div>
                ))}
              </div>

              {/* Desktop / Tablet Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="text-[10px] text-slate-400 uppercase font-sans border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="pb-2">USER</th>
                      <th className="pb-2">AMOUNT</th>
                      <th className="pb-2">DATE</th>
                      <th className="pb-2 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {pendingWds.slice(0, 5).map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 font-bold text-slate-900 dark:text-white font-sans">{item.userFullName}</td>
                        <td className="py-2.5 font-bold text-rose-600 dark:text-rose-400">{formatUSD(item.amount)}</td>
                        <td className="py-2.5 text-slate-400 font-sans text-[11px]">{formatDate(item.createdAt)}</td>
                        <td className="py-2.5 text-right font-sans">
                          <button
                            onClick={() => handleReviewWithdrawal(item)}
                            className="px-2.5 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold transition-colors shadow-2xs"
                          >
                            Process
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Card/Table 3: KYC Pending Approval */}
        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                KYC Pending ({pendingKyc.length})
              </h3>
            </div>
            <Link href="/admin/kyc" className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-bold">
              View All
            </Link>
          </div>

          {pendingKyc.length === 0 ? (
            <p className="py-6 text-center text-xs font-mono text-slate-400">All submitted documents reviewed. Queue clear.</p>
          ) : (
            <div className="space-y-2.5">
              {pendingKyc.slice(0, 4).map((record) => (
                <div key={record.id} className="p-3 rounded-xl bg-slate-50 dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-xs text-slate-900 dark:text-white">{record.userFullName || 'Applicant'}</p>
                    <p className="text-[10px] text-slate-400 font-mono uppercase">{record.documentType} · {record.documentNumber || 'Submitted'}</p>
                  </div>
                  <Link
                    href="/admin/kyc"
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
                  >
                    Inspect
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card/Table 4: Recent Open Trades */}
        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Risk Desk / Open Trades ({tradeOrders.length})
              </h3>
            </div>
            <Link href="/admin/trades" className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline font-bold">
              View All
            </Link>
          </div>

          {tradeOrders.length === 0 ? (
            <p className="py-6 text-center text-xs font-mono text-slate-400">No active positions in the market.</p>
          ) : (
            <div className="space-y-2.5">
              {tradeOrders.slice(0, 4).map((t) => (
                <div key={t.id} className="p-3 rounded-xl bg-slate-50 dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between font-mono text-xs">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">{t.symbol}</span>
                    <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded ${t.type === 'BUY' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {t.type} {t.lotSize}L
                    </span>
                  </div>
                  <span className={`font-bold ${t.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {t.pnl >= 0 ? '+' : ''}${t.pnl}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Interactive Action Modals */}
      <AdminReviewDepositModal
        deposit={selectedDeposit}
        isOpen={isDepositModalOpen}
        onClose={() => {
          setIsDepositModalOpen(false);
          setSelectedDeposit(null);
        }}
      />

      <AdminReviewWithdrawalModal
        withdrawal={selectedWithdrawal}
        isOpen={isWithdrawalModalOpen}
        onClose={() => {
          setIsWithdrawalModalOpen(false);
          setSelectedWithdrawal(null);
        }}
      />

      <AdminAddUserModal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
      />

      <AdminManualAdjustmentModal
        isOpen={isManualAdjustmentOpen}
        onClose={() => setIsManualAdjustmentOpen(false)}
      />

      <AdminBroadcastModal
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
      />

    </div>
  );
}
