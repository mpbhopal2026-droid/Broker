'use client';

import React, { useState } from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  Building,
  AlertCircle,
  X,
  CreditCard
} from 'lucide-react';
import { useAdmin } from '@/lib/admin-store';
import { formatUSD, formatINR, formatDate } from '@/lib/utils';
import { Transaction } from '@/lib/types';

export default function AdminWithdrawalsPage() {
  const { transactions, approveWithdrawal, rejectWithdrawal, paymentSettings } = useAdmin();
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [payoutRef, setPayoutRef] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  const withdrawals = transactions.filter((t) => t.type === 'withdrawal');

  const handleApprove = () => {
    if (!selectedTx) return;
    approveWithdrawal(selectedTx.id, payoutRef || `IMPS${Date.now().toString().slice(-6)}`);
    setSelectedTx(null);
    setPayoutRef('');
  };

  const handleReject = () => {
    if (!selectedTx) return;
    rejectWithdrawal(selectedTx.id, rejectReason || 'Incorrect bank account details or IFSC mismatch.');
    setShowRejectModal(false);
    setSelectedTx(null);
    setRejectReason('');
  };

  return (
    <div className="space-y-6 max-w-5xl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Withdrawal Settlements Queue
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review client payout requests, transfer INR to beneficiary accounts, and record IMPS reference numbers.
          </p>
        </div>

        <div className="text-xs font-mono text-slate-500">
          Average Settlement SLA: 15-30 Minutes
        </div>
      </div>

      {/* Withdrawals List (Mobile Cards + Desktop Table) */}
      <div className="rounded-2xl bg-white dark:bg-[#0d121c] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {withdrawals.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 font-mono">
            No withdrawal payout requests on record.
          </div>
        ) : (
          <>
            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {withdrawals.map((tx) => {
                const isPending = tx.status === 'pending';
                const isCompleted = tx.status === 'completed';

                return (
                  <div
                    key={tx.id}
                    onClick={() => setSelectedTx(tx)}
                    className="p-4 space-y-3 active:bg-slate-50 dark:active:bg-slate-900/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <strong className="text-xs sm:text-sm text-slate-900 dark:text-white font-bold block">{tx.userFullName || 'Client'}</strong>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {tx.withdrawalDetails?.bankName || 'Bank'} · {tx.withdrawalDetails?.accountNumber ? `...${tx.withdrawalDetails.accountNumber.slice(-4)}` : 'UPI'}
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400 font-mono">
                          {formatUSD(tx.amount)}
                        </div>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                          ₹{((tx.amount * paymentSettings.usdToInrRate)).toFixed(0)}
                        </p>
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-mono mt-0.5 ${
                          isCompleted
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                            : isPending
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                        }`}>
                          {tx.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
                      <span className="text-slate-400 font-mono">{formatDate(tx.createdAt)}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTx(tx);
                        }}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                          isPending
                            ? 'bg-rose-600 text-white shadow-xs active:scale-95'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {isPending ? 'Process Payout →' : 'View Details'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 dark:bg-[#080d14] text-slate-500 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase font-sans">
                  <tr>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">USD Amount</th>
                    <th className="py-3 px-4">INR Equivalent</th>
                    <th className="py-3 px-4">Beneficiary Bank Info</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {withdrawals.map((tx) => {
                    const isPending = tx.status === 'pending';
                    const isCompleted = tx.status === 'completed';

                    return (
                      <tr
                        key={tx.id}
                        onClick={() => setSelectedTx(tx)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-4 font-sans font-bold text-slate-900 dark:text-white">
                          {tx.userFullName}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white text-sm">
                          {formatUSD(tx.amount)}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-emerald-600 dark:text-[#00d674]">
                          {formatINR(tx.amount * paymentSettings.usdToInrRate)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-sans">
                          <span className="font-bold text-slate-700 dark:text-slate-200 block">
                            {tx.withdrawalDetails?.bankName} ({tx.withdrawalDetails?.accountNumber})
                          </span>
                          <span className="text-[11px] font-mono">{tx.withdrawalDetails?.ifscCode}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            isCompleted
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-[#00d674]'
                              : isPending
                              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-sans">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTx(tx);
                            }}
                            className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                              isPending
                                ? 'bg-slate-900 dark:bg-sky-500 text-white dark:text-slate-950'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {isPending ? 'Process Payout →' : 'View Ticket'}
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

      {/* Payout Processing Modal */}
      {selectedTx && !showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#0d121c] border border-slate-300 dark:border-slate-700 max-w-md w-full space-y-4 shadow-2xl animate-scale-in text-xs font-mono">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white font-sans flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
                Settlement Payout Ticket
              </h3>
              <button
                onClick={() => setSelectedTx(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 font-sans">User:</span>
                <span className="font-bold text-slate-900 dark:text-white font-sans">{selectedTx.userFullName}</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 font-sans">Amount (USD):</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">{formatUSD(selectedTx.amount)}</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 font-sans">INR Net to Transfer:</span>
                <strong className="text-emerald-600 dark:text-[#00d674] text-sm">
                  {formatINR(selectedTx.amount * paymentSettings.usdToInrRate)}
                </strong>
              </div>

              {/* Beneficiary Details Box */}
              <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-slate-400 font-sans text-[10px] uppercase font-bold block">
                  Beneficiary Account Info:
                </span>
                <div>Account Name: <strong className="text-slate-900 dark:text-white font-sans">{selectedTx.userFullName}</strong></div>
                <div>Bank: <strong className="text-slate-900 dark:text-white font-sans">{selectedTx.withdrawalDetails?.bankName}</strong></div>
                <div>Account No: <strong className="text-slate-900 dark:text-white">{selectedTx.withdrawalDetails?.accountNumber}</strong></div>
                <div>IFSC: <strong className="text-slate-900 dark:text-white">{selectedTx.withdrawalDetails?.ifscCode}</strong></div>
                {selectedTx.withdrawalDetails?.upiId && (
                  <div>UPI ID: <strong className="text-slate-900 dark:text-white">{selectedTx.withdrawalDetails.upiId}</strong></div>
                )}
              </div>

              {selectedTx.status === 'pending' && (
                <div className="space-y-1 pt-1 font-sans">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    IMPS / Bank Payout Reference Number:
                  </label>
                  <input
                    type="text"
                    value={payoutRef}
                    onChange={(e) => setPayoutRef(e.target.value)}
                    placeholder={`e.g. IMPS${Date.now().toString().slice(-8)}`}
                    className="w-full bg-white dark:bg-[#070b12] border border-slate-300 dark:border-slate-700 rounded-lg p-2 font-mono text-xs text-slate-900 dark:text-white"
                  />
                </div>
              )}
            </div>

            {selectedTx.status === 'pending' ? (
              <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 font-sans">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(true)}
                  className="flex-1 py-2.5 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold transition-all text-xs"
                >
                  Reject Payout
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all text-xs shadow-md shadow-emerald-500/20 active:scale-95"
                >
                  Mark as Paid & Completed
                </button>
              </div>
            ) : (
              <div className="pt-2 text-center text-slate-400 font-sans text-xs">
                This transaction has already been resolved ({selectedTx.status}).
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedTx && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#0d121c] border border-rose-300 dark:border-rose-900/50 max-w-md w-full space-y-4 shadow-2xl animate-scale-in text-xs font-sans">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Reject Withdrawal Payout</h3>
            <p className="text-slate-500">
              Provide reason for rejecting ${selectedTx.amount} USD withdrawal (the funds will be refunded back to client margin wallet):
            </p>

            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Invalid bank account number / Beneficiary name mismatch..."
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-slate-900 dark:text-white text-xs"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="py-1.5 px-3.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="py-1.5 px-4 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold"
              >
                Confirm Rejection & Refund
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
