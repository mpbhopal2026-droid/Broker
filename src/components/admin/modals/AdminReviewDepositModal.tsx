'use client';

import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ShieldCheck,
  Loader2,
  DollarSign,
  CreditCard
} from 'lucide-react';
import { KycDocumentImage } from '@/components/admin/KycDocumentImage';
import { useAdmin } from '@/lib/admin-store';
import { useApp } from '@/lib/store';
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
  const { currentUser } = useApp();
  const { approveDeposit, rejectDeposit, deleteTransaction, paymentSettings, getClientPaymentConfig, showToast } = useAdmin();
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isDeveloper = currentUser?.role === 'developer';

  const inrAmount = deposit?.amountINR || (deposit ? deposit.amount * paymentSettings.usdToInrRate : 0);
  const rate = paymentSettings.usdToInrRate || 84.5;
  const commPercent = (paymentSettings.commissionPercent ?? 0) || 2.0;
  const grossUSD = inrAmount / rate;
  const commissionUSD = grossUSD * (commPercent / 100);
  const netUSD = grossUSD - commissionUSD;

  const [customCreditUSD, setCustomCreditUSD] = useState<string>(String(netUSD.toFixed(2)));

  // Sync state when deposit changes
  React.useEffect(() => {
    if (deposit) {
      const calcGross = (deposit.amountINR || deposit.amount * rate) / rate;
      const calcComm = calcGross * (commPercent / 100);
      setCustomCreditUSD(String((calcGross - calcComm).toFixed(2)));
    }
  }, [deposit, rate, commPercent]);

  if (!isOpen || !deposit) return null;

  const customConfig = getClientPaymentConfig(deposit.userId);
  const isCustomRouting = Boolean(customConfig && customConfig.isCustom && (customConfig.upiId || customConfig.accountNumber));
  const routingLabel = isCustomRouting
    ? (customConfig?.upiId ? `UPI: ${customConfig.upiId}` : `${customConfig?.bankName || 'Bank'}: ${customConfig?.accountNumber}`)
    : (deposit.paymentMode || paymentSettings.upiId || 'Primary Desk UPI');
  const routingHolder = isCustomRouting
    ? (customConfig?.accountHolder || 'Custom Client Desk')
    : (paymentSettings.accountHolder || 'Broker Desk Account');

  const handleApprove = () => {
    setIsLoading(true);
    const finalCredit = Number(customCreditUSD) || netUSD;
    setTimeout(() => {
      approveDeposit(deposit.id, finalCredit);
      setIsLoading(false);
      onClose();
      showToast({
        type: 'success',
        title: 'Deposit Approved',
        message: `Credited ${formatUSD(finalCredit)} to client ledger.`,
      });
    }, 500);
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
        type: 'info',
        title: 'Deposit Rejected',
        message: 'Rejection notice sent to client.',
      });
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0d121c] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Review Deposit Request</span>
            </h3>
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

          {/* Paid Destination Routing Box */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Client Paid Destination / Routing</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`font-bold font-mono text-xs ${isCustomRouting ? 'text-purple-600 dark:text-purple-400' : 'text-slate-900 dark:text-white'}`}>
                  {routingLabel}
                </span>
                {isCustomRouting && (
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                    VIP Custom
                  </span>
                )}
              </div>
            </div>
            <span className="text-[10px] text-slate-400 font-sans text-right">
              {routingHolder}
            </span>
          </div>

          {/* Net Credit Box & Custom Editable Input */}
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-950 dark:text-emerald-300 text-xs">USD Amount to Credit Client Ledger:</span>
              <span className="text-[10px] text-slate-500 font-mono">Calculated: ${netUSD.toFixed(2)}</span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500 font-mono">$</span>
              <input
                type="number"
                step="0.01"
                value={customCreditUSD}
                onChange={(e) => setCustomCreditUSD(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-lg pl-7 pr-3 py-1.5 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
              />
            </div>
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
                {isDeveloper && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm(`Are you sure you want to permanently delete this deposit record? (Developer action)`)) {
                        await deleteTransaction(deposit.id);
                        onClose();
                      }
                    }}
                    className="px-3 py-2.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold border border-rose-200 transition-colors"
                    title="Delete Record (Developer Only)"
                  >
                    Delete
                  </button>
                )}
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
