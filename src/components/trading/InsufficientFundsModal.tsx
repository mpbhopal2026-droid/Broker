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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs" onClick={onClose}>
      <div 
        className="relative w-full max-w-sm my-auto bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md p-4 sm:p-5 shadow-2xl text-zinc-950 dark:text-white space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-900">
          <div className="flex items-center gap-1.5 text-zinc-950 dark:text-white">
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Trading Gatekeeper</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Icon & Title */}
        <div className="text-center space-y-1.5 pt-1">
          <div className="w-12 h-12 mx-auto rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
            <Wallet className="w-6 h-6 text-zinc-950 dark:text-white" />
          </div>
          
          <h3 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-tight">
            Deposit Required
          </h3>
          
          <p className="text-xs text-zinc-500 font-sans leading-relaxed max-w-xs mx-auto">
            Live balance is <strong className="text-zinc-950 dark:text-white">$0.00 USD</strong>. Fund capital via domestic UPI or bank wire to execute live positions on <span className="font-bold">{symbol}</span>.
          </p>
        </div>

        {/* Feature Pills */}
        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-md bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[10px]">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-zinc-950 dark:text-white shrink-0" />
            <span className="text-zinc-700 dark:text-zinc-300 font-semibold">Instant UPI & QR</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-950 dark:text-white shrink-0" />
            <span className="text-zinc-700 dark:text-zinc-300 font-semibold">0% Broker Fee</span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={handleGoToDeposit}
            className="w-full py-2.5 px-3 rounded-md bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Proceed to Deposit</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {accountMode === 'live' && (
            <button
              type="button"
              onClick={handleSwitchToDemo}
              className="w-full py-2 px-3 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <FlaskConical className="w-3.5 h-3.5 text-zinc-500" />
              <span>Switch to Demo ($10,000)</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
