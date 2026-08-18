'use client';

import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  Loader2,
  Building2,
  Send,
  AlertTriangle
} from 'lucide-react';
import { useAdmin } from '@/lib/admin-store';
import { formatUSD, formatINR } from '@/lib/utils';
import { Transaction } from '@/lib/types';

interface AdminReviewWithdrawalModalProps {
  withdrawal: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AdminReviewWithdrawalModal: React.FC<AdminReviewWithdrawalModalProps> = ({
  withdrawal,
  isOpen,
  onClose,
}) => {
  const { approveWithdrawal, rejectWithdrawal, paymentSettings, showToast } = useAdmin();
  const [impsRefId, setImpsRefId] = useState('IMPS' + Math.floor(1000000000 + Math.random() * 9000000000));
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !withdrawal) return null;

  const usdAmount = withdrawal.amount;
  const inrAmount = withdrawal.amountINR || usdAmount * paymentSettings.usdToInrRate;

  const handleApprove = () => {
    if (!impsRefId) {
      showToast({ type: 'error', title: 'IMPS Ref Required', message: 'Enter bank settlement reference.' });
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      approveWithdrawal(withdrawal.id, impsRefId);
      setIsLoading(false);
      onClose();
      showToast({
        type: 'success',
        title: 'Withdrawal Dispatched',
        message: `Settled ${formatUSD(usdAmount)} (Ref: ${impsRefId}).`,
      });
    }, 800);
  };

  const handleReject = () => {
    if (!rejectReason) {
      showToast({ type: 'error', title: 'Reason Required', message: 'Provide rejection explanation.' });
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      rejectWithdrawal(withdrawal.id, rejectReason);
      setIsLoading(false);
      setIsRejecting(false);
      onClose();
      showToast({
        type: 'warning',
        title: 'Withdrawal Rejected & Refunded',
        message: `Amount refunded to user wallet balance.`,
      });
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-lg my-auto shadow-2xl overflow-hidden animate-scale-in max-h-[94vh] flex flex-col">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="min-w-0 pr-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">Process Payout #{withdrawal.id.slice(0, 8)}</h3>
            <p className="text-[11px] sm:text-xs text-slate-500 font-mono truncate">Client: {withdrawal.userFullName || withdrawal.userId}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto flex-1">
          
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Requested USD Amount</span>
              <span className="text-base font-black font-mono text-slate-900 dark:text-white">{formatUSD(usdAmount)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">INR Settlement Payable</span>
              <span className="text-base font-black font-mono text-slate-900 dark:text-white">{formatINR(inrAmount)}</span>
            </div>
          </div>

          {/* Destination Bank Account Info */}
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
            <span className="font-bold text-slate-800 dark:text-slate-200 block text-[11px] uppercase tracking-wider">Beneficiary Bank Account</span>
            <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
              <div>
                <span className="text-[10px] text-slate-400 block">Bank Name</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">HDFC Bank Ltd</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Account Holder</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{withdrawal.userFullName || 'Client'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Account Number</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">918239019283</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">IFSC Code</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">HDFC0000128</span>
              </div>
            </div>
          </div>

          {/* IMPS Reference Input */}
          {!isRejecting ? (
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">Bank IMPS / NEFT Settlement Reference ID *</label>
              <input
                type="text"
                value={impsRefId}
                onChange={(e) => setImpsRefId(e.target.value)}
                placeholder="e.g. IMPS5829102948"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-600"
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">Rejection Explanation</label>
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Beneficiary IFSC code invalid or account name mismatch"
                className="w-full bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-900 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
              />
            </div>
          )}

          {/* Action CTAs */}
          <div className="flex items-center gap-2 pt-2 shrink-0">
            {!isRejecting ? (
              <>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isLoading}
                  className="flex-1 py-2.5 rounded-xl bg-slate-950 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-950 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 active:scale-95"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Approve & Record Payout</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsRejecting(true)}
                  className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-rose-600 text-xs font-semibold border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors active:scale-95"
                >
                  Reject & Refund
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={isLoading}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  <span>Confirm Refund to Wallet</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsRejecting(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold active:scale-95"
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
