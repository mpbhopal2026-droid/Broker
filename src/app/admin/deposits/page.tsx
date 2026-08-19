'use client';

import React, { useState, useEffect } from 'react';
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
  const { transactions, approveDeposit, rejectDeposit, deleteTransaction, paymentSettings, getClientPaymentConfig } = useAdmin();
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [customCreditUSD, setCustomCreditUSD] = useState<string>('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  const deposits = transactions.filter((t) => t.type === 'deposit');

  const getRoutingInfo = (tx: Transaction) => {
    const custom = getClientPaymentConfig(tx.userId);
    if (custom && custom.isCustom && (custom.upiId || custom.accountNumber)) {
      return {
        isCustom: true,
        label: custom.upiId ? `UPI: ${custom.upiId}` : `${custom.bankName || 'Bank'}: ${custom.accountNumber}`,
        holder: custom.accountHolder || 'Custom Client Account',
      };
    }
    return {
      isCustom: false,
      label: tx.paymentMode || paymentSettings.upiId || 'Primary Desk UPI',
      holder: paymentSettings.accountHolder || 'Broker Desk',
    };
  };

  useEffect(() => {
    if (selectedTx) {
      const grossUSD = Number(((selectedTx.amountINR || 0) / paymentSettings.usdToInrRate).toFixed(2));
      const commissionUSD = Number(((grossUSD * (paymentSettings.commissionPercent ?? 0)) / 100).toFixed(2));
      const netUSD = Number((grossUSD - commissionUSD).toFixed(2));
      setCustomCreditUSD(String(netUSD || selectedTx.amount || 0));
    }
  }, [selectedTx, paymentSettings]);

  const handleApprove = () => {
    if (!selectedTx) return;
    const finalUSD = Number(customCreditUSD) || Number(((selectedTx.amountINR || 0) / paymentSettings.usdToInrRate).toFixed(2));
    void approveDeposit(selectedTx.id, finalUSD);
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
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-fade-in text-slate-900 dark:text-slate-100">
      
      {/* Page Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2 font-sans">
            <CreditCard className="w-6 h-6 text-emerald-600 dark:text-[#00d674]" />
            Deposit Ledger & Approvals
          </h1>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Audit and verify incoming domestic INR transfers, inspect client-specific payment destinations, and credit capital ledgers.
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
                const routing = getRoutingInfo(tx);

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

                    {/* Paid Destination Routing in Mobile Card */}
                    <div className="flex items-center gap-1.5 text-[11px] font-mono p-2 rounded-lg bg-slate-50 dark:bg-slate-900/70 border border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400 font-sans text-[10px] uppercase font-bold">Paid To:</span>
                      <span className={`font-semibold truncate ${routing.isCustom ? 'text-purple-600 dark:text-purple-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                        {routing.label}
                      </span>
                      {routing.isCustom && (
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 shrink-0">
                          Custom VIP
                        </span>
                      )}
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
                    <th className="py-3 px-4">Paid Destination / Routing</th>
                    <th className="py-3 px-4">Submitted</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {deposits.map((tx) => {
                    const isPending = tx.status === 'pending';
                    const isCompleted = tx.status === 'completed';
                    const routing = getRoutingInfo(tx);

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
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className={`font-bold font-mono text-xs ${
                                routing.isCustom ? 'text-purple-600 dark:text-purple-400' : 'text-slate-800 dark:text-slate-200'
                              }`}>
                                {routing.label}
                              </span>
                              {routing.isCustom && (
                                <span className="px-1.5 py-0.2 rounded text-[8px] font-bold uppercase bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                                  Custom
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-sans">
                              {routing.isCustom ? `VIP Routing (${routing.holder})` : `Default Desk (${routing.holder})`}
                            </span>
                          </div>
                        </td>
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
                        <td className="py-3.5 px-4 text-right font-sans whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {isPending ? (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTx(tx);
                                  }}
                                  className="px-2.5 py-1 rounded-md bg-[#00875a] hover:bg-[#00704a] text-white text-xs font-bold transition-all shadow-xs"
                                >
                                  Review
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTx(tx);
                                    setShowRejectModal(true);
                                  }}
                                  className="px-2.5 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold transition-colors"
                                >
                                  Reject
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTx(tx);
                                }}
                                className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200"
                              >
                                View Ticket
                              </button>
                            )}

                            {/* Delete Transaction Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Are you sure you want to permanently delete deposit record UTR ${tx.utrNumber || tx.id}?`)) {
                                  void deleteTransaction(tx.id);
                                }
                              }}
                              className="p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 transition-colors"
                              title="Delete Deposit Record"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
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
              {(() => {
                const modalRouting = getRoutingInfo(selectedTx);
                return (
                  <div className="flex justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 items-center">
                    <span className="text-slate-500 font-sans">Paid Destination (UPI/Bank):</span>
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className={`font-bold font-mono ${modalRouting.isCustom ? 'text-purple-600 dark:text-purple-400' : 'text-slate-900 dark:text-white'}`}>
                          {modalRouting.label}
                        </span>
                        {modalRouting.isCustom && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                            Custom VIP
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-sans block">
                        Holder: {modalRouting.holder}
                      </span>
                    </div>
                  </div>
                );
              })()}
              <div className="flex justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 font-sans">Submitted On:</span>
                <span className="text-slate-700 dark:text-slate-300 font-sans">{formatDate(selectedTx.createdAt)}</span>
              </div>

              {/* Editable USD Amount to Credit */}
              {selectedTx.status === 'pending' && (
                <div className="p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-2 font-sans">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-bold text-slate-900 dark:text-white">
                      USD Amount to Credit Client Ledger:
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Rate: ₹{paymentSettings.usdToInrRate} / USD
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500 font-mono">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={customCreditUSD}
                      onChange={(e) => setCustomCreditUSD(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-lg pl-7 pr-3 py-2 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <button
                      type="button"
                      onClick={() => {
                        const grossUSD = Number(((selectedTx.amountINR || 0) / paymentSettings.usdToInrRate).toFixed(2));
                        const commUSD = Number(((grossUSD * (paymentSettings.commissionPercent ?? 0)) / 100).toFixed(2));
                        setCustomCreditUSD(String((grossUSD - commUSD).toFixed(2)));
                      }}
                      className="px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-300"
                    >
                      With Fee (${((selectedTx.amountINR || 0) / paymentSettings.usdToInrRate * (1 - (paymentSettings.commissionPercent ?? 0) / 100)).toFixed(2)})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const grossUSD = Number(((selectedTx.amountINR || 0) / paymentSettings.usdToInrRate).toFixed(2));
                        setCustomCreditUSD(String(grossUSD.toFixed(2)));
                      }}
                      className="px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-300"
                    >
                      Zero Fee (${((selectedTx.amountINR || 0) / paymentSettings.usdToInrRate).toFixed(2)})
                    </button>
                  </div>
                </div>
              )}

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
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800 font-sans">
                <div className="flex gap-2">
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
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Are you sure you want to permanently delete this deposit record?`)) {
                      void deleteTransaction(selectedTx.id);
                      setSelectedTx(null);
                    }
                  }}
                  className="w-full py-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold transition-colors"
                >
                  Delete Deposit Record
                </button>
              </div>
            ) : (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between font-sans text-xs">
                <span className="text-slate-400">
                  Status: <strong className="uppercase text-slate-700 dark:text-slate-300">{selectedTx.status}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Are you sure you want to permanently delete this deposit record?`)) {
                      void deleteTransaction(selectedTx.id);
                      setSelectedTx(null);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold transition-colors"
                >
                  Delete Record
                </button>
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
