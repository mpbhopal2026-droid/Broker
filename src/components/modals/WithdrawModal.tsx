'use client';

import React, { useState } from 'react';
import {
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Building2,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { formatUSD, formatINR } from '@/lib/utils';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, submitWithdrawal, showToast, paymentSettings } = useApp();

  const [amountUSD, setAmountUSD] = useState('300');
  const [bankAccount, setBankAccount] = useState(currentUser?.bankAccountNumber || '918239019283');
  const [ifsc, setIfsc] = useState(currentUser?.bankIfsc ?? '');
  const [accountHolder, setAccountHolder] = useState(currentUser?.bankAccountName ?? currentUser?.fullName ?? '');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const numAmount = parseFloat(amountUSD) || 0;
  const balance = currentUser?.walletBalance || 0;
  const inrEquivalent = numAmount * (paymentSettings.withdrawalRate || paymentSettings.usdToInrRate || 84.5);
  const isKycApproved = currentUser?.kycStatus === 'approved';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isKycApproved) {
      showToast({ type: 'warning', title: 'KYC Required', message: 'KYC Verification is required before withdrawing funds.' });
      return;
    }
    if (numAmount <= 0 || numAmount > balance) {
      showToast({ type: 'error', title: 'Invalid Amount', message: `Maximum available: ${formatUSD(balance)}` });
      return;
    }

    setIsLoading(true);

    // Await the real result. This previously ran inside a setTimeout and
    // reported success unconditionally, so a rejected withdrawal — insufficient
    // balance, KYC not approved, invalid IFSC — still showed the client a
    // confirmation while nothing had been recorded.
    const result = await submitWithdrawal(numAmount, {
      accountNumber: bankAccount,
      ifscCode: ifsc,
      // From the client's verified profile. Hardcoding a bank name here would
      // mis-label every payout instruction.
      bankName: currentUser?.bankName || '',
      accountHolder,
    });

    setIsLoading(false);

    if (!result.success) {
      showToast({ type: 'error', title: 'Withdrawal failed', message: result.error });
      return;
    }

    setIsSubmitted(true);
    showToast({
      type: 'success',
      title: 'Withdrawal requested',
      message: result.message || 'Funds are on hold pending payout approval.',
    });
  };

  const handleResetAndClose = () => {
    setIsSubmitted(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-in">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Withdraw Funds</h3>
            <p className="text-xs text-slate-500">Direct settlement to your registered bank account</p>
          </div>
          <button
            onClick={handleResetAndClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isSubmitted ? (
          /* Success Screen */
          <div className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-lg">Withdrawal Queued</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Your withdrawal of <strong className="text-slate-900">{formatUSD(numAmount)}</strong> (≈ {formatINR(inrEquivalent)}) is queued for IMPS settlement to Account ending in ••••{bankAccount.slice(-4)}.
              </p>
            </div>
            <button
              onClick={handleResetAndClose}
              className="w-full py-2.5 rounded-lg bg-slate-950 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          /* Form Screen */
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
            
            {/* Balance Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-medium uppercase block">Available Trading Balance</span>
                <span className="text-lg font-black font-mono text-slate-900">{formatUSD(balance)}</span>
              </div>
              {isKycApproved ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-3 h-3" />
                  KYC Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  <AlertCircle className="w-3 h-3" />
                  KYC Unverified
                </span>
              )}
            </div>

            {/* Form Fields */}
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Withdrawal Amount (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">$</span>
                  <input
                    type="number"
                    value={amountUSD}
                    onChange={(e) => setAmountUSD(e.target.value)}
                    max={balance}
                    min="10"
                    required
                    className="w-full bg-white border border-slate-200 rounded-lg pl-7 pr-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-400"
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>Settlement in INR: <strong className="font-mono text-slate-800 font-bold">{formatINR(inrEquivalent)}</strong></span>
                  <button
                    type="button"
                    onClick={() => setAmountUSD(balance.toString())}
                    className="text-slate-950 font-bold hover:underline"
                  >
                    Max
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Beneficiary Account Number
                </label>
                <input
                  type="text"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  IFSC Code
                </label>
                <input
                  type="text"
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-400"
                />
              </div>
            </div>

            {/* Submit CTA */}
            <button
              type="submit"
              disabled={isLoading || !isKycApproved}
              className="w-full py-2.5 rounded-lg bg-slate-950 text-white text-xs font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Payout Request...</span>
                </>
              ) : (
                <>
                  <span>Submit Withdrawal Request</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

          </form>
        )}

      </div>
    </div>
  );
};
