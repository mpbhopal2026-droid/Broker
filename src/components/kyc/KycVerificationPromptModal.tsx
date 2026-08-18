'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  X,
  ArrowRight,
  Zap,
  Lock,
  Building2,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { useApp } from '@/lib/store';

export const KycVerificationPromptModal: React.FC = () => {
  const pathname = usePathname();
  const { currentUser, isLoaded, isAuthenticated } = useApp();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isAuthenticated || !currentUser) return;

    // Do not show on auth pages, admin pages, or KYC page itself
    if (
      pathname.startsWith('/admin') ||
      pathname.startsWith('/developer') ||
      pathname === '/kyc' ||
      pathname === '/login' ||
      pathname === '/register' ||
      pathname === '/offline'
    ) {
      setIsOpen(false);
      return;
    }

    // Only prompt if user is NOT approved
    if (currentUser.kycStatus !== 'approved') {
      const dismissed = typeof window !== 'undefined' ? sessionStorage.getItem('kyc_prompt_dismissed') : null;
      if (!dismissed) {
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    } else {
      setIsOpen(false);
    }
  }, [isLoaded, isAuthenticated, currentUser, pathname]);

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('kyc_prompt_dismissed', 'true');
    }
    setIsOpen(false);
  };

  if (!isOpen || !currentUser || currentUser.kycStatus === 'approved') {
    return null;
  }

  const isPending = currentUser.kycStatus === 'pending';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs select-none animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white dark:bg-[#0f172a] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header Banner */}
        <div className="relative bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white overflow-hidden">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 backdrop-blur-md flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-white stroke-[2.5]" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-100 bg-white/20 px-2 py-0.5 rounded-md">
                  Action Recommended
                </span>
                <h2 className="text-base sm:text-lg font-bold leading-tight mt-0.5">
                  {isPending ? 'KYC Under Review' : 'Complete KYC Verification'}
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Close modal"
              className="p-2 rounded-full bg-black/20 hover:bg-black/40 text-white/80 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-slate-700 dark:text-slate-200">
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {isPending ? (
              <>
                Your application has been received and is in the compliance queue. If you wish to review your submitted details or upload new documents, visit the verification center.
              </>
            ) : (
              <>
                Verify your government ID (PAN & Aadhaar) and settlement bank account to unlock live order execution, 200x institutional leverage, and instant INR withdrawals.
              </>
            )}
          </p>

          {/* Key Advantages Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 space-y-1">
              <div className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">Live Execution</p>
              <p className="text-[10px] text-slate-400">Trade real market liquidity with 200x leverage</p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 space-y-1">
              <div className="w-7 h-7 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">Fast INR Payouts</p>
              <p className="text-[10px] text-slate-400">Direct settlement to verified bank & UPI</p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 space-y-1">
              <div className="w-7 h-7 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">AML Compliant</p>
              <p className="text-[10px] text-slate-400">Protected under India DPDP Act 2023</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
            <Link
              href="/kyc"
              onClick={() => setIsOpen(false)}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <span>{isPending ? 'View Application Status' : 'Start Verification (2 Mins)'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              type="button"
              onClick={handleDismiss}
              className="w-full sm:w-auto py-3 px-5 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-xs transition-colors"
            >
              Remind Me Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
