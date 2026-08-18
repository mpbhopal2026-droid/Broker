'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Wallet, ArrowRight, X, ShieldCheck, Zap, FlaskConical } from 'lucide-react';
import { useApp } from '@/lib/store';

interface InsufficientFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredAmount?: number;
  symbol?: string;
  action?: 'BUY' | 'SELL';
}

export const InsufficientFundsModal: React.FC<InsufficientFundsModalProps> = ({
  isOpen,
  onClose,
  requiredAmount = 20,
  symbol = 'XAU/USD',
  action = 'BUY',
}) => {
  const router = useRouter();
  const { setAccountMode, accountMode } = useApp();

  if (!isOpen) return null;

  const handleGoToDeposit = () => {
    onClose();
    router.push('/funds?tab=deposit');
  };

  const handleSwitchToDemo = () => {
    setAccountMode('demo');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-md my-auto bg-[#0A0E17] border border-[#1F293D] rounded-3xl p-5 sm:p-6 shadow-2xl shadow-black/80 animate-scale-in text-white space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1F293D]">
          <div className="flex items-center gap-2 text-amber-400">
            <AlertCircle className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Trading Gatekeeper</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#121824] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Icon & Title */}
        <div className="text-center space-y-2 pt-1">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-amber-500/20 to-orange-500/10 border border-amber-500/30 flex items-center justify-center shadow-inner">
            <Wallet className="w-8 h-8 text-amber-400" />
          </div>
          
          <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
            Deposit Required to Trade
          </h3>
          
          <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
            Your live trading balance is <strong className="text-white font-mono">$0.00 USD</strong>. Fund your account with INR or UPI to execute real positions on <span className="text-sky-400 font-bold">{symbol}</span>.
          </p>
        </div>

        {/* Key Features Pill */}
        <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-[#121824] border border-[#1F293D] text-[11px]">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-slate-300">Instant UPI & QR</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="text-slate-300">0% Deposit Fees</span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            onClick={handleGoToDeposit}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all cursor-pointer"
          >
            <span>Proceed to Deposit (पैसे जमा करें)</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {accountMode === 'live' && (
            <button
              type="button"
              onClick={handleSwitchToDemo}
              className="w-full py-2.5 px-4 rounded-xl bg-[#121824] hover:bg-[#1A2232] border border-[#1F293D] text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              <FlaskConical className="w-3.5 h-3.5 text-amber-400" />
              <span>Practise on Demo Sandbox ($10,000)</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
