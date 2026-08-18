'use client';

import React, { useState } from 'react';
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Eye,
  X,
  FileText,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { KycDocumentImage } from '@/components/admin/KycDocumentImage';
import { useAdmin } from '@/lib/admin-store';
import { formatUSD, formatINR, formatDate } from '@/lib/utils';
import { Transaction } from '@/lib/types';

export default function AdminDepositsPage() {
  const { transactions, approveDeposit, rejectDeposit, paymentSettings } = useAdmin();
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  const deposits = transactions.filter((t) => t.type === 'deposit');

  const handleApprove = () => {
    if (!selectedTx) return;
    const grossUSD = Number(((selectedTx.amountINR || 0) / paymentSettings.usdToInrRate).toFixed(2));
    const commissionUSD = Number(((grossUSD * (paymentSettings.commissionPercent ?? 0)) / 100).toFixed(2));
    const netUSD = Number((grossUSD - commissionUSD).toFixed(2));

    void approveDeposit(selectedTx.id, netUSD);
    setSelectedTx(null);
  };

  const handleReject = () => {
    if (!selectedTx) return;
    rejectDeposit(selectedTx.id, rejectReason || 'UTR not verified in broker bank account.');
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
            Deposit Ledger & Approvals
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Verify 12-digit UTRs and approve domestic bank/UPI deposits for instant wallet margin credit.
          </p>
        </div>

        <div className="text-xs font-mono text-slate-500">
          Conversion Rate: 1 USD = ₹{paymentSettings.usdToInrRate} (Desk Fee: {(paymentSettings.commissionPercent ?? 0)}%)
        </div>
      </div>

      {/* Deposits List (Mobile Cards + Desktop Table) */}
      <div className="rounded-2xl bg-white dark:bg-[#0d121c] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {deposits.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 font-mono">
            No deposit submissions on record.
          </div>
        ) : (
          <>
            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {deposits.map((tx) => {
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
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300">
                            UTR: {tx.utrNumber || '—'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                          {formatINR(tx.amountINR || 0)}
                        </div>
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
                            ? 'bg-emerald-600 text-white shadow-xs active:scale-95'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {isPending ? 'Review / Approve →' : 'View Details'}
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
                    <th className="py-3 px-4">INR Amount</th>
                    <th className="py-3 px-4">12-Digit UTR</th>
                    <th className="py-3 px-4">Submitted</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {deposits.map((tx) => {
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
                        <td className="py-3.5 px-4 font-bold text-emerald-600 dark:text-[#00d674] text-sm">
                          {formatINR(tx.amountINR || 0)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-800 dark:text-slate-200 font-bold">{tx.utrNumber}</td>
                        <td className="py-3.5 px-4 text-slate-400 text-[11px]">{formatDate(tx.createdAt)}</td>
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
                                ? 'bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {isPending ? 'Review Deposit →' : 'View Ticket'}
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

      {/* Deposit Inspection & Approval Modal */}
      {selectedTx && !showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#0d121c] border border-slate-300 dark:border-slate-700 max-w-lg w-full space-y-4 shadow-2xl animate-scale-in text-xs font-mono max-h-[92vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white font-sans flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600 dark:text-[#00d674]" />
                Deposit Verification Ticket
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
                <span className="text-slate-500 font-sans">INR Paid:</span>
                <strong className="text-emerald-600 dark:text-[#00d674] text-sm">
                  {formatINR(selectedTx.amountINR || 0)}
                </strong>
              </div>
              <div className="flex justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 font-sans">12-Digit UTR:</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">{selectedTx.utrNumber || 'N/A'}</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 font-sans">USD Net Credit:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  ${((selectedTx.amountINR || 0) / paymentSettings.usdToInrRate * (1 - (paymentSettings.commissionPercent ?? 0) / 100)).toFixed(2)} USD
                </span>
              </div>
              <div className="flex justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 font-sans">Submitted On:</span>
                <span className="text-slate-700 dark:text-slate-300 font-sans">{formatDate(selectedTx.createdAt)}</span>
              </div>

              {/* Live Payment Screenshot */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 font-sans">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  <span>Attached Payment Proof:</span>
                  <span className={`text-[10px] ${selectedTx.proofImagePath ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                    {selectedTx.proofImagePath ? 'Screenshot Available' : 'No Image'}
                  </span>
                </div>
                {selectedTx.proofImagePath ? (
                  <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 h-48 bg-slate-100 dark:bg-slate-950 flex items-center justify-center">
                    <KycDocumentImage path={selectedTx.proofImagePath} alt="Payment Proof" purpose="proof" />
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 italic">User did not upload a screenshot.</p>
                )}
              </div>

              {selectedTx.adminRemarks && (
                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 font-sans">
                  {selectedTx.adminRemarks}
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
                  Reject Deposit
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all text-xs shadow-md shadow-emerald-500/20 active:scale-95"
                >
                  Approve & Credit Balance
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
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Reject Deposit Request</h3>
            <p className="text-slate-500">
              Provide reason for rejecting deposit UTR {selectedTx.utrNumber}:
            </p>

            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. UTR not found in bank statement, amount mismatch..."
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
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
