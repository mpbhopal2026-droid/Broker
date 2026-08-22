'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  ExternalLink,
  Eye,
  X
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { formatINR, formatDate } from '@/lib/utils';
import { Transaction } from '@/lib/types';

export default function TransactionsPage() {
  const { currentUser, transactions } = useApp();
  const [filterType, setFilterType] = useState<'all' | 'deposit' | 'withdrawal'>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewTx, setPreviewTx] = useState<Transaction | null>(null);

  const userTransactions = currentUser
    ? transactions.filter((t) => currentUser.role === 'admin' || t.userId === currentUser.id)
    : [];

  const filtered = userTransactions.filter((tx) => {
    if (filterType !== 'all' && tx.type !== filterType) return false;
    if (filterStatus !== 'all' && tx.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchUtr = tx.utrNumber?.toLowerCase().includes(q);
      const matchUser = tx.userFullName?.toLowerCase().includes(q) || tx.userEmail?.toLowerCase().includes(q);
      const matchMode = tx.paymentMode?.toLowerCase().includes(q);
      return matchUtr || matchUser || matchMode;
    }
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Clock className="w-6 h-6 text-sky-400" />
            Financial Transaction Ledger
          </h1>
          <p className="text-xs text-slate-400">
            Immutable log of deposits, UTR verifications, and broker withdrawal disbursements
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/deposit"
            className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all"
          >
            <ArrowDownLeft className="w-4 h-4" /> Deposit
          </Link>
          <Link
            href="/withdraw"
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs border border-slate-700 flex items-center gap-1.5 transition-all"
          >
            <ArrowUpRight className="w-4 h-4 text-sky-400" /> Withdraw
          </Link>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by UTR or user..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {(['all', 'deposit', 'withdrawal'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all shrink-0 ${
                filterType === type
                  ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40 shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              {type}
            </button>
          ))}

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none shrink-0"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Ledger Table & Mobile Cards */}
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-xs">
            No matching transactions found in your ledger.
          </div>
        ) : (
          <>
            {/* Mobile Card List (sm:hidden) */}
            <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800 p-2 space-y-2">
              {filtered.map((tx) => {
                const isDeposit = tx.type === 'deposit';
                const isCompleted = tx.status === 'completed';
                const isPending = tx.status === 'pending';

                return (
                  <div
                    key={tx.id}
                    onClick={() => setPreviewTx(tx)}
                    className="p-3.5 bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-2 cursor-pointer active:scale-98 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isDeposit
                              ? 'bg-emerald-500/15 text-[#00875a] dark:text-emerald-400 border border-emerald-500/30'
                              : 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/30'
                          }`}
                        >
                          {isDeposit ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          {isDeposit ? 'Deposit' : 'Withdrawal'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatDate(tx.createdAt)}
                        </span>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                          isCompleted
                            ? 'bg-[#e6f4ea] text-[#00875a] border border-[#b7e4c7]'
                            : isPending
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="min-w-0 pr-2">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block truncate">
                          {tx.paymentMode || (isDeposit ? 'Instant UPI QR' : 'Bank Payout')}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono truncate block">
                          {tx.utrNumber ? `UTR: ${tx.utrNumber}` : tx.withdrawalDetails ? `${tx.withdrawalDetails.bankName} ••••` : 'Verified Ledger'}
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-sm font-black font-mono ${isDeposit ? 'text-[#00875a]' : 'text-slate-900 dark:text-white'}`}>
                          {isDeposit ? '+' : '-'}{formatINR(tx.amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table (hidden sm:block) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/90 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Date / Time</th>
                    {currentUser?.role === 'admin' && <th className="py-3.5 px-4">Client</th>}
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Amount (INR)</th>
                    <th className="py-3.5 px-4">Mode / UTR Reference</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                  {filtered.map((tx) => {
                    const isDeposit = tx.type === 'deposit';
                    const isCompleted = tx.status === 'completed';
                    const isPending = tx.status === 'pending';

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                          {formatDate(tx.createdAt)}
                        </td>
                        
                        {currentUser?.role === 'admin' && (
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-900 dark:text-white text-xs">{tx.userFullName || 'User'}</p>
                            <p className="text-[10px] text-slate-400">{tx.userEmail}</p>
                          </td>
                        )}

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isDeposit
                                ? 'bg-emerald-500/15 text-[#00875a] dark:text-emerald-400 border border-emerald-500/30'
                                : 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/30'
                            }`}
                          >
                            {isDeposit ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                            {isDeposit ? 'Deposit' : 'Withdrawal'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white text-sm">
                          {formatINR(tx.amount)}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-900 dark:text-slate-200">{tx.paymentMode || 'Bank Transfer'}</span>
                            <span className="text-slate-400 truncate max-w-[180px]">
                              {tx.utrNumber ? `UTR: ${tx.utrNumber}` : tx.withdrawalDetails ? `${tx.withdrawalDetails.bankName} - ${tx.withdrawalDetails.accountNumber}` : '—'}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              isCompleted
                                ? 'bg-[#e6f4ea] text-[#00875a] border border-[#b7e4c7]'
                                : isPending
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setPreviewTx(tx)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer"
                            title="View receipt"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Transaction Details Modal */}
      {previewTx && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-3xl border border-slate-700 bg-slate-900 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                Transaction Receipt Details
              </h3>
              <button
                onClick={() => setPreviewTx(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between p-2 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Transaction ID:</span>
                <span className="font-mono text-slate-200">{previewTx.id}</span>
              </div>
              <div className="flex justify-between p-2 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Type:</span>
                <span className="font-bold text-white uppercase">{previewTx.type}</span>
              </div>
              <div className="flex justify-between p-2 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Amount:</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  {formatINR(previewTx.amount)}
                </span>
              </div>
              <div className="flex justify-between p-2 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Status:</span>
                <span className="font-bold text-sky-400 uppercase">{previewTx.status}</span>
              </div>
              {previewTx.utrNumber && (
                <div className="flex justify-between p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400">UTR / Reference:</span>
                  <span className="font-mono text-white">{previewTx.utrNumber}</span>
                </div>
              )}
              {previewTx.adminRemarks && (
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
                  <strong className="text-slate-400 block mb-0.5">Admin Remarks:</strong>
                  {previewTx.adminRemarks}
                </div>
              )}

              {/* Proof Image */}
              {previewTx.proofImagePath && (
                <div className="pt-2">
                  <span className="text-[11px] text-slate-400 block mb-1.5">Submitted Screenshot Proof:</span>
                  <div className="rounded-2xl overflow-hidden border border-slate-700 h-48 bg-slate-950">
                    <img
                      src={previewTx.proofImagePath}
                      alt="Transfer Proof"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setPreviewTx(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
            >
              Close Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
