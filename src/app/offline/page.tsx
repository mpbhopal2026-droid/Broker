'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { WifiOff, RefreshCw, ArrowRight, ShieldCheck } from 'lucide-react';

export default function OfflinePage() {
  const [checking, setChecking] = useState(false);

  const handleRetry = () => {
    setChecking(true);
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-50 dark:bg-[#0b0f17] text-slate-900 dark:text-white select-none">
      <div className="w-full max-w-md bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-10 text-center space-y-6 shadow-xl">
        <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-900/50">
          <WifiOff className="w-8 h-8 animate-pulse" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            You Are Currently Offline
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            We cannot reach our trading clearance servers. Please check your mobile data or Wi-Fi connection.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-xs text-left space-y-2 text-slate-600 dark:text-slate-300">
          <p className="font-bold text-slate-900 dark:text-white">Troubleshooting Tips:</p>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
            <li>Check if your device has Airplane mode on.</li>
            <li>Toggle your Wi-Fi or mobile data off and on.</li>
            <li>Once reconnected, your open trades and balances will sync automatically.</li>
          </ul>
        </div>

        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={handleRetry}
            disabled={checking}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Checking Connection...' : 'Try Reconnecting Now'}</span>
          </button>

          <Link
            href="/dashboard"
            className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <span>Return to Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
