'use client';

import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ShieldCheck,
  Loader2,
  DollarSign
} from 'lucide-react';
import { KycDocumentImage } from '@/components/admin/KycDocumentImage';
import { useAdmin } from '@/lib/admin-store';
import { formatUSD, formatINR } from '@/lib/utils';
import { Transaction } from '@/lib/types';

interface AdminReviewDepositModalProps {
  deposit: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AdminReviewDepositModal: React.FC<AdminReviewDepositModalProps> = ({
  deposit,
  isOpen,
  onClose,
}) => {
  const { approveDeposit, rejectDeposit, deleteTransaction, paymentSettings, showToast } = useAdmin();
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !deposit) return null;

  const inrAmount = deposit.amountINR || deposit.amount * paymentSettings.usdToInrRate;
  const rate = paymentSettings.usdToInrRate || 84.5;
  const commPercent = (paymentSettings.commissionPercent ?? 0) || 2.0;
  const grossUSD = inrAmount / rate;
  const commissionUSD = grossUSD * (commPercent / 100);
  const netUSD = grossUSD - commissionUSD;

  const handleApprove = () => {
    setIsLoading(true);
    setTimeout(() => {
      approveDeposit(deposit.id);
      setIsLoading(false);
      onClose();
      showToast({
        type: 'success',
        title: 'Deposit Approved',
        message: `Credited ${formatUSD(netUSD)} to client ledger.`,
      });
    }, 800);
  };

  const handleReject = () => {
    if (!rejectReason) {
      showToast({
        type: 'error',
        title: 'Reason Required',
        message: 'Please provide a statutory rejection reason.',
      });
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      rejectDeposit(deposit.id, rejectReason);
      setIsLoading(false);
      setIsRejecting(false);
      onClose();
      showToast({
        type: 'warning',
        title: 'Deposit Rejected',
        message: `Marked as rejected: ${rejectReason}`,
      });
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-lg my-auto shadow-2xl overflow-hidden animate-scale-in max-h-[94vh] flex flex-col">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="min-w-0 pr-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">Review Deposit #{deposit.id.slice(0, 8)}</h3>
            <p className="text-[11px] sm:text-xs text-slate-500 font-mono truncate">Client: {deposit.userFullName || deposit.userId}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
          
          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Declared INR Amount</span>
              <span className="text-base font-black font-mono text-slate-900 dark:text-white">{formatINR(inrAmount)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">UTR / TXN Reference</span>
              <span className="text-sm font-bold font-mono text-slate-900 dark:text-white">{deposit.utrNumber || '— not provided —'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Exchange Rate</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">₹{rate.toFixed(2)} / USD</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Fee ({commPercent}%)</span>
              <span className="font-mono text-rose-600 dark:text-rose-400">-${commissionUSD.toFixed(2)} USD</span>
            </div>
          </div>

          {/* Net Credit Box */}
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
            <span className="font-bold text-emerald-950 dark:text-emerald-300">Net USD Margin Credited to User:</span>
            <span className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-400">+{formatUSD(netUSD)}</span>
          </div>

          {/* Payment Screenshot Proof */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 dark:text-slate-200">Attached Payment Screenshot:</span>
              <span className={`text-[10px] font-bold flex items-center gap-1 ${
                deposit.proofImagePath ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
              }`}>
                <CheckCircle2 className="w-3 h-3" />
                {deposit.proofImagePath ? 'Screenshot Available' : 'No Image Attached'}
              </span>
            </div>
            {deposit.proofImagePath ? (
              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 h-52 bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                <KycDocumentImage path={deposit.proofImagePath} alt="Payment Proof" purpose="proof" />
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic">User did not attach a payment screenshot.</p>
            )}
          </div>

          {/* Rejection Form */}
          {isRejecting && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-[11px] font-semibold text-slate-700">Mandatory Rejection Reason</label>
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. UTR not reflected in broker bank statement"
                className="w-full bg-white border border-rose-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-rose-500"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 pt-2">
            {!isRejecting ? (
              <>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isLoading}
                  className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Approve & Credit USD</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsRejecting(true)}
                  className="px-4 py-2.5 rounded-lg bg-white hover:bg-slate-50 text-rose-600 text-xs font-semibold border border-slate-200 shadow-2xs transition-colors"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (confirm(`Are you sure you want to permanently delete this deposit record?`)) {
                      await deleteTransaction(deposit.id);
                      onClose();
                    }
                  }}
                  className="px-3 py-2.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold border border-rose-200 transition-colors"
                  title="Delete Record"
                >
                  Delete
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={isLoading}
                  className="flex-1 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  <span>Confirm Rejection</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsRejecting(false)}
                  className="px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
              </>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
