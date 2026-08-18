'use client';

import React from 'react';
import { FlaskConical, Wallet } from 'lucide-react';
import { useApp } from '@/lib/store';
import { formatUSD } from '@/lib/utils';

/**
 * Professional White & Black Demo / Live switch in the header with Dark Mode support.
 */
export const AccountModeSwitch: React.FC = () => {
  const { accountMode, setAccountMode, isDemo, canUseDemo, demo, currentUser, showToast } = useApp();

  if (!currentUser) return null;

  const balance = isDemo ? (demo?.equity ?? demo?.balance ?? 0) : currentUser.walletBalance;

  const handleSwitchToDemo = () => {
    if (!canUseDemo) {
      showToast({
        type: 'info',
        title: 'Demo Mode Disabled',
        message: 'Demo account is restricted for your profile or disabled by developer feature policy.',
      });
      return;
    }
    setAccountMode('demo');
  };

  const handleSwitchToLive = () => {
    if (currentUser.kycStatus !== 'approved') {
      showToast({
        type: 'info',
        title: 'Verification required',
        message: 'Live trading opens once your KYC is approved.',
      });
      return;
    }
    setAccountMode('live');
  };

  return (
    <div className="flex items-center gap-2">
      {/* Sleek Minimalist Toggle */}
      <div
        className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
        role="group"
        aria-label="Account mode"
      >
        <button
          type="button"
          onClick={handleSwitchToDemo}
          aria-pressed={isDemo}
          title={!canUseDemo ? 'Demo mode is disabled by developer policy' : 'Practice with virtual demo balance'}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
            isDemo
              ? 'bg-slate-950 dark:bg-slate-800 text-white shadow-2xs font-bold'
              : !canUseDemo
              ? 'opacity-40 cursor-not-allowed text-slate-400'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
          }`}
        >
          <FlaskConical className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Demo</span>
        </button>

        <button
          type="button"
          onClick={handleSwitchToLive}
          aria-pressed={!isDemo}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
            !isDemo
              ? 'bg-slate-950 dark:bg-slate-800 text-white shadow-2xs font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
          }`}
        >
          <Wallet className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Live</span>
        </button>
      </div>

      {/* Money Showcase Window */}
      <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white shadow-2xs">
        <span>{formatUSD(balance)}</span>
        <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">
          {isDemo ? 'virtual' : 'real'}
        </span>
      </div>
    </div>
  );
};

/** Clean, minimal notice strip matching the theme */
export const DemoModeBanner: React.FC = () => {
  const { isDemo, currentUser } = useApp();
  if (!isDemo || !currentUser) return null;

  return (
    <div className="hidden sm:block bg-slate-50 dark:bg-[#0b0f17] border-b border-slate-200 dark:border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center justify-center gap-2 text-xs text-slate-600 dark:text-slate-400">
        <FlaskConical className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" aria-hidden="true" />
        <span className="font-bold text-slate-800 dark:text-slate-200">DEMO MODE</span>
        <span className="text-slate-500 dark:text-slate-400">
          — Practicing with virtual funds. Demo profits cannot be withdrawn.
        </span>
      </div>
    </div>
  );
};
