'use client';

import React from 'react';
import { FlaskConical, Wallet } from 'lucide-react';
import { useApp } from '@/lib/store';
import { formatUSD } from '@/lib/utils';

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
    <div className="flex items-center gap-1.5 font-mono">
      {/* Sleek Minimalist Toggle */}
      <div
        className="flex items-center p-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
        role="group"
        aria-label="Account mode"
      >
        <button
          type="button"
          onClick={handleSwitchToDemo}
          aria-pressed={isDemo}
          title={!canUseDemo ? 'Demo mode is disabled by developer policy' : 'Practice with virtual demo balance'}
          className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1.5 ${
            isDemo
              ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-bold'
              : !canUseDemo
              ? 'opacity-40 cursor-not-allowed text-zinc-400'
              : 'text-zinc-500 hover:text-zinc-950 dark:hover:text-white'
          }`}
        >
          <FlaskConical className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Demo</span>
        </button>

        <button
          type="button"
          onClick={handleSwitchToLive}
          aria-pressed={!isDemo}
          className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1.5 ${
            !isDemo
              ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-bold'
              : 'text-zinc-500 hover:text-zinc-950 dark:hover:text-white'
          }`}
        >
          <Wallet className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Live</span>
        </button>
      </div>

      {/* Money Showcase Window */}
      <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-950 dark:text-white tabular-nums">
        <span>{formatUSD(balance)}</span>
      </div>
    </div>
  );
};

/** Clean, minimal notice strip matching the theme */
export const DemoModeBanner: React.FC = () => {
  const { isDemo, currentUser } = useApp();
  if (!isDemo || !currentUser) return null;

  return (
    <div className="hidden sm:block bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 py-1 flex items-center justify-center gap-2 text-[11px] font-mono text-zinc-600 dark:text-zinc-400">
        <FlaskConical className="w-3.5 h-3.5 text-zinc-500 shrink-0" aria-hidden="true" />
        <span className="font-bold text-zinc-950 dark:text-white">DEMO PRACTICE ENVIRONMENT</span>
        <span>— Virtual ledger funds. Real domestic settlement disabled.</span>
      </div>
    </div>
  );
};
