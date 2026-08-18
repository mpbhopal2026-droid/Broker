'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/store';
import { Sparkles, ShieldCheck, ArrowRight, CheckCircle2, TrendingUp, Lock } from 'lucide-react';

interface OnboardingChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingChoiceModal: React.FC<OnboardingChoiceModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const { setAccountMode, currentUser, showToast, logClientEvent } = useApp();

  if (!isOpen) return null;

  const handleSelectDemo = () => {
    setAccountMode('demo');
    logClientEvent('SWITCH_TO_DEMO', 'UI', 'User selected Demo Trading during onboarding');
    showToast({
      type: 'success',
      title: 'Demo Mode Activated',
      message: '$1,000.00 prebuilt demo balance is ready for trading.',
    });
    onClose();
    router.push('/dashboard');
  };

  const handleSelectKYC = () => {
    logClientEvent('KYC_FORM_OPENED', 'KYC', 'User selected Live KYC during onboarding');
    onClose();
    router.push('/kyc');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        
        {/* Top Glow & Header */}
        <div className="p-6 sm:p-8 text-center space-y-2 border-b border-slate-100 dark:border-slate-800/80 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900/80 dark:to-[#0f172a]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Welcome to Global Forex</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Choose Your Trading Journey
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {currentUser?.fullName ? `Welcome, ${currentUser.fullName}! ` : ''}
            Select how you would like to get started today. You can always change modes anytime.
          </p>
        </div>

        {/* Two Path Choice Grid */}
        <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Option A: Demo Account ($1,000) */}
          <div
            onClick={handleSelectDemo}
            className="group relative cursor-pointer flex flex-col justify-between p-5 sm:p-6 rounded-2xl border-2 border-emerald-500/30 dark:border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-950/10 hover:border-emerald-500 dark:hover:border-emerald-400 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800 shadow-xs">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-extrabold tracking-wide uppercase">
                  Instant
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Demo Account
                </h3>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  $1,000.00
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Prebuilt virtual balance for zero-risk practice.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Real-time candlestick charts</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Up to 200x margin execution</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Demo deposit & withdrawal testing</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleSelectDemo}
              className="mt-6 w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <span>Start Demo Trading</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Option B: Live Institutional Account (KYC Required) */}
          <div
            onClick={handleSelectKYC}
            className="group relative cursor-pointer flex flex-col justify-between p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-900 dark:hover:border-white transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-xs">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold tracking-wide uppercase border border-slate-200 dark:border-slate-700">
                  SEBI Compliant
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                  Live Institutional
                </h3>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  INR & USD
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Real account. KYC required before deposit.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-900 dark:text-white shrink-0" />
                  <span>Instant UPI & NetBanking deposit</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-900 dark:text-white shrink-0" />
                  <span>Fast bank account payouts</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>5-step quick identity verification</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleSelectKYC}
              className="mt-6 w-full py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <span>Complete KYC for Live</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-400">
            Regulated Indian broker platform. Demo funds carry zero financial risk.
          </p>
        </div>

      </div>
    </div>
  );
};
