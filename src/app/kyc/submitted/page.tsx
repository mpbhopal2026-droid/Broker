'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Building2,
  Lock,
} from 'lucide-react';
import { useApp } from '@/lib/store';

export default function KycSubmittedSuccessPage() {
  const router = useRouter();
  const { currentUser, refreshSession, showToast } = useApp();
  const [checkingStatus, setCheckingStatus] = useState(false);

  const kycStatus = currentUser?.kycStatus || 'pending';

  // Automatically redirect if already approved
  useEffect(() => {
    if (kycStatus === 'approved') {
      router.push('/dashboard');
      return;
    }

    const interval = setInterval(() => {
      void refreshSession();
    }, 12000);
    return () => clearInterval(interval);
  }, [kycStatus, refreshSession, router]);

  const handleManualRefresh = async () => {
    setCheckingStatus(true);
    await refreshSession();
    setTimeout(() => {
      setCheckingStatus(false);
      showToast({ type: 'info', title: 'Status Checked', message: 'Your latest verification status is up to date.' });
    }, 500);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-8 sm:py-12 bg-[#f8fafc] text-slate-900 overflow-x-hidden">
      <div className="w-full max-w-2xl space-y-6 min-w-0">
        
        {/* Main Card Container */}
        <div className="bg-white p-6 sm:p-10 rounded-3xl sm:rounded-[32px] border border-slate-200/90 shadow-2xl shadow-slate-200/60 space-y-8 text-center min-w-0 w-full overflow-hidden relative">
          
          {/* Top Brand Logo */}
          <div className="text-center space-y-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/logo-full.svg" alt="GLOBAL FOREX" width={200} height={60} className="h-14 sm:h-16 w-auto mx-auto" />
            <p className="text-xs text-slate-400 font-medium">
              Statutory KYC clearance & domestic payout registration
            </p>
          </div>

          {/* Hero Radar Pulsing Animation */}
          <div className="space-y-4 relative z-10">
            <div className="relative inline-flex items-center justify-center">
              {/* Animated outer aura */}
              <div className="absolute w-24 h-24 rounded-full bg-emerald-400/20 animate-ping opacity-60 pointer-events-none" />
              <div className="absolute w-20 h-20 rounded-full bg-emerald-500/25 animate-pulse pointer-events-none" />
              
              {/* Core Shield Box */}
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-[#044e2f] border-2 border-white shadow-xl shadow-emerald-900/30 flex items-center justify-center text-white">
                <ShieldCheck className="w-8 h-8 stroke-[2.2]" />
              </div>
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-emerald-100/90 text-emerald-800 border border-emerald-300/80 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                <span>Verification In Progress</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Your Documents Have Been Dispatched!
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Your Aadhaar, PAN, and settlement bank details have been safely received. Our compliance officers are performing statutory verification.
              </p>
            </div>
          </div>

          {/* Progress Timeline */}
          <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-5 text-left space-y-3.5 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-600" />
                Turnaround Estimate
              </span>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                ~15 to 30 Minutes
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-700">
              <span className="font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Identity Proofs (Aadhaar & PAN)
              </span>
              <span className="text-[11px] text-emerald-600 font-medium">Uploaded & Verified</span>
            </div>

            <div className="flex items-center justify-between text-slate-700">
              <span className="font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Domestic Settlement Bank Account
              </span>
              <span className="text-[11px] text-emerald-600 font-medium">Registered</span>
            </div>

            <div className="flex items-center justify-between text-slate-900">
              <span className="font-bold flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-[10px] font-bold">
                  ●
                </span>
                Compliance Audit & Clearance
              </span>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 animate-pulse">
                Active Review
              </span>
            </div>

            <div className="pt-1">
              <div className="h-2 rounded-full bg-emerald-100 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-[#05603a] w-3/4 rounded-full animate-pulse" />
              </div>
            </div>
          </div>

          {/* Registered Details Box */}
          <div className="p-4 rounded-2xl bg-white border border-emerald-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-left shadow-sm">
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">Account Name</span>
              <span className="font-bold text-slate-800 truncate block">{currentUser?.fullName || 'Client'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">Settlement Bank</span>
              <span className="font-bold text-slate-800 truncate block">{currentUser?.bankName || 'Domestic Bank'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">Account Number</span>
              <span className="font-bold text-slate-800 truncate block font-mono">
                •••• {currentUser?.bankAccountNumber ? currentUser.bankAccountNumber.slice(-4) : '••••'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">IFSC Code</span>
              <span className="font-bold text-slate-800 truncate block font-mono">
                {currentUser?.bankIfsc || '••••••••'}
              </span>
            </div>
          </div>

          {/* Primary CTA: PROCEED TO DASHBOARD */}
          <div className="space-y-3 pt-2">
            <Link
              href="/dashboard"
              className="w-full py-4 px-6 rounded-xl bg-[#05603a] hover:bg-[#044e2f] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xl shadow-emerald-950/20 active:scale-98 cursor-pointer"
            >
              <span>Proceed to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <div className="flex items-center justify-center gap-4 text-xs text-slate-500 pt-1">
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={checkingStatus}
                className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checkingStatus ? 'animate-spin' : ''}`} />
                <span>{checkingStatus ? 'Checking...' : 'Refresh Status'}</span>
              </button>

              <span>•</span>

              <Link
                href="/trade"
                className="text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Explore Terminal</span>
              </Link>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
