'use client';

import React from 'react';
import { Settings, Moon, Sun, Shield, Lock, Smartphone, CheckCircle2 } from 'lucide-react';
import { useApp } from '@/lib/store';

export default function SettingsPage() {
  const { currentUser, theme, setTheme, updateUserProfile, showToast } = useApp();

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      
      {/* Header */}
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Settings & Preferences
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Customize your trading workspace theme, security safeguards, and notifications.
        </p>
      </div>

      {/* 1. Appearance */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
          Appearance & Theme
        </h2>
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={() => setTheme('light')}
            className={`p-3 rounded-xl border text-left flex items-center justify-between text-xs font-bold transition-all ${
              theme === 'light'
                ? 'border-slate-900 bg-slate-50 text-slate-900 shadow-2xs'
                : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-500" />
              <span>Light Workspace</span>
            </div>
            {theme === 'light' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          </button>

          <button
            onClick={() => setTheme('dark')}
            className={`p-3 rounded-xl border text-left flex items-center justify-between text-xs font-bold transition-all ${
              theme === 'dark'
                ? 'border-emerald-500 bg-slate-900 text-white shadow-2xs'
                : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-sky-400" />
              <span>Dark Institutional</span>
            </div>
            {theme === 'dark' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* 2. Security */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
          Security & Verification
        </h2>
        <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 text-xs">
          <div>
            <strong className="text-slate-900 dark:text-white block font-bold">Two-Factor Authentication (2FA)</strong>
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">Require OTP verification upon signing in and requesting payouts.</span>
          </div>
          <button
            onClick={() => {
              const current = currentUser?.twoFactorOtpEnabled ?? true;
              updateUserProfile({ twoFactorOtpEnabled: !current });
            }}
            className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
              currentUser?.twoFactorOtpEnabled ?? true
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-[#00d674] border-emerald-200 dark:border-emerald-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
            }`}
          >
            {currentUser?.twoFactorOtpEnabled ?? true ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        <div className="flex items-center justify-between py-2 text-xs">
          <div>
            <strong className="text-slate-900 dark:text-white block font-bold">Account Tier</strong>
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">Trading margin limits and leverage tier.</span>
          </div>
          <span className="px-2.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300 text-[11px]">
            {currentUser?.accountTier || 'Pro Member'}
          </span>
        </div>
      </div>

    </div>
  );
}
