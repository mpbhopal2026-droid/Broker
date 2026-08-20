'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  CreditCard,
  User,
  RefreshCw,
  Edit3,
  Lock,
  ChevronRight,
  ArrowUpRight,
} from 'lucide-react';
import { useApp } from '@/lib/store';

export default function DashboardVerificationPage() {
  const { currentUser, refreshSession, showToast, updateUserProfile } = useApp();

  const [checkingStatus, setCheckingStatus] = useState(false);
  const [lastCheckedTime, setLastCheckedTime] = useState<string>('Just now');
  const [isEditingBank, setIsEditingBank] = useState(false);

  // Bank edit state
  const [bankName, setBankName] = useState(currentUser?.bankName ?? '');
  const [bankAccountNumber, setBankAccountNumber] = useState(currentUser?.bankAccountNumber ?? '');
  const [bankIfsc, setBankIfsc] = useState(currentUser?.bankIfsc ?? '');
  const [userUpiId, setUserUpiId] = useState(currentUser?.userUpiId ?? '');
  const [savingBank, setSavingBank] = useState(false);

  const kycStatus = currentUser?.kycStatus || 'not_submitted';

  // Real-time polling if in pending review
  useEffect(() => {
    if (kycStatus !== 'pending') return;
    const interval = setInterval(() => {
      void refreshSession();
      setLastCheckedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 15000);
    return () => clearInterval(interval);
  }, [kycStatus, refreshSession]);

  const handleManualRefresh = async () => {
    setCheckingStatus(true);
    try {
      await refreshSession();
      setLastCheckedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      showToast({ type: 'info', title: 'Status Refreshed', message: 'Your latest verification status has been fetched.' });
    } catch {
      showToast({ type: 'error', title: 'Check Failed', message: 'Could not reach verification server.' });
    } finally {
      setTimeout(() => setCheckingStatus(false), 500);
    }
  };

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBank(true);
    try {
      await updateUserProfile({
        bankName,
        bankAccountNumber,
        bankIfsc: bankIfsc.toUpperCase().trim(),
        userUpiId: userUpiId.trim(),
      });
      setIsEditingBank(false);
      showToast({ type: 'success', title: 'Bank Details Updated', message: 'Your payout account has been updated.' });
    } catch {
      showToast({ type: 'error', title: 'Update Failed', message: 'Could not update bank details.' });
    } finally {
      setSavingBank(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 min-w-0 py-2 sm:py-4">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Identity & Security Verification
            </h1>
            
            {/* Status Pill */}
            {kycStatus === 'approved' && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Tier-1 Verified
              </span>
            )}
            {kycStatus === 'pending' && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300 dark:border-amber-800 flex items-center gap-1.5 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400" />
                Audit In Progress
              </span>
            )}
            {kycStatus === 'rejected' && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-300 dark:border-rose-800 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Action Required
              </span>
            )}
            {kycStatus === 'not_submitted' && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                Not Submitted
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Statutory KYC compliance standards and settlement bank account management.
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={checkingStatus}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-98 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkingStatus ? 'animate-spin text-emerald-600' : ''}`} />
            <span>{checkingStatus ? 'Checking…' : 'Refresh Status'}</span>
          </button>

          {kycStatus !== 'approved' && (
            <Link
              href="/kyc"
              className="px-4 py-2 rounded-xl bg-[#05603a] hover:bg-[#044e2f] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950/20 active:scale-98"
            >
              <span>{kycStatus === 'pending' ? 'View Submission Dossier' : 'Submit Verification'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Main Grid: Status & Documents | Payout Bank & Security */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: VERIFICATION STATUS (8 COLS) */}
        <div className="lg:col-span-8 space-y-6">

          {/* STATUS REALITY: PENDING */}
          {kycStatus === 'pending' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-emerald-200/90 dark:border-slate-800 p-6 space-y-6 shadow-sm relative overflow-hidden">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-[#044e2f] flex items-center justify-center text-white shadow-md">
                    <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Desk Clearance In Progress
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Estimated turnaround: ~15 to 30 minutes. Last synced: {lastCheckedTime}.
                    </p>
                  </div>
                </div>

                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                  Active Audit
                </span>
              </div>

              {/* Progress Pipeline */}
              <div className="p-4.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-3 text-xs">
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                  <span className="font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    Aadhaar & PAN Documents
                  </span>
                  <span className="text-[11px] font-medium text-emerald-600">Verhoeff Validated</span>
                </div>

                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                  <span className="font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    Domestic Settlement Bank Account
                  </span>
                  <span className="text-[11px] font-medium text-emerald-600">Double-Verified</span>
                </div>

                <div className="flex items-center justify-between text-slate-900 dark:text-white">
                  <span className="font-bold flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 text-[10px] font-bold">
                      ●
                    </span>
                    Compliance Officer Audit & Whitelisting
                  </span>
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 animate-pulse">
                    In Review
                  </span>
                </div>

                <div className="pt-2">
                  <div className="h-2 rounded-full bg-emerald-100 dark:bg-slate-700 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-[#05603a] w-3/4 rounded-full animate-pulse" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
                <span>Withdrawals and institutional trading tiers will activate upon clearance.</span>
                <button
                  type="button"
                  onClick={handleManualRefresh}
                  className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold shrink-0 cursor-pointer"
                >
                  Check Live Clearance
                </button>
              </div>
            </div>
          )}

          {/* STATUS REALITY: APPROVED */}
          {kycStatus === 'approved' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-emerald-200/90 dark:border-slate-800 p-6 space-y-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-[#044e2f] flex items-center justify-center text-white shadow-md">
                    <CheckCircle2 className="w-7 h-7 stroke-[2.3]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Institutional KYC Clearance Approved
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Your identity credentials and domestic settlement bank account are fully verified.
                    </p>
                  </div>
                </div>

                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Tier-1 Verified
                </span>
              </div>

              {/* Limits & Capabilities Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Daily Payout Limit</span>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">₹50,00,000 / $60,000</p>
                  <span className="text-[10px] text-emerald-600 font-medium">Instant RTGS / IMPS</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Trading Gateways</span>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">100% Unrestricted</p>
                  <span className="text-[10px] text-emerald-600 font-medium">All FX & CFD Pairs</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Settlement Safeguard</span>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Strict Name Match</p>
                  <span className="text-[10px] text-emerald-600 font-medium">Zero-Leakage Guarantee</span>
                </div>
              </div>
            </div>
          )}

          {/* STATUS REALITY: REJECTED */}
          {kycStatus === 'rejected' && (
            <div className="bg-rose-50/50 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-900/50 p-6 space-y-5">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-md shrink-0">
                  <AlertCircle className="w-6 h-6 stroke-[2.3]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Verification Requires Resubmission
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    The compliance desk could not verify your documents due to photo clarity or a name mismatch with your bank records.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href="/kyc"
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs inline-flex items-center gap-2 shadow-md shadow-rose-950/20 transition-all active:scale-98"
                >
                  <span>Resubmit Document Proofs</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}

          {/* SETTLEMENT BANK ACCOUNT DETAILS CARD */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Payout Settlement Bank Account
                </h3>
              </div>

              {!isEditingBank && (
                <button
                  type="button"
                  onClick={() => setIsEditingBank(true)}
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Update Details</span>
                </button>
              )}
            </div>

            {isEditingBank ? (
              <form onSubmit={handleSaveBank} className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Bank Name</label>
                    <input
                      type="text"
                      required
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. HDFC Bank, State Bank of India"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Account Number</label>
                    <input
                      type="text"
                      required
                      value={bankAccountNumber}
                      onChange={(e) => setBankAccountNumber(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter account number"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">IFSC Code</label>
                    <input
                      type="text"
                      required
                      maxLength={11}
                      value={bankIfsc}
                      onChange={(e) => setBankIfsc(e.target.value.toUpperCase().slice(0, 11))}
                      placeholder="e.g. HDFC0001234"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white uppercase tracking-wider focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Personal UPI ID (Optional)</label>
                    <input
                      type="text"
                      value={userUpiId}
                      onChange={(e) => setUserUpiId(e.target.value)}
                      placeholder="e.g. name@okaxis"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingBank(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingBank}
                    className="px-5 py-2 rounded-xl bg-[#05603a] hover:bg-[#044e2f] text-white text-xs font-bold shadow-md shadow-emerald-950/20 active:scale-98 disabled:opacity-50"
                  >
                    {savingBank ? 'Saving…' : 'Save Payout Details'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Account Name</span>
                  <span className="font-bold text-slate-900 dark:text-white truncate block">
                    {currentUser?.fullName || 'Client'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Bank Name</span>
                  <span className="font-bold text-slate-900 dark:text-white truncate block">
                    {currentUser?.bankName || 'Domestic Bank'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Account Number</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono block">
                    •••• {currentUser?.bankAccountNumber ? currentUser.bankAccountNumber.slice(-4) : '••••'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">IFSC Code</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono block">
                    {currentUser?.bankIfsc || '••••••••'}
                  </span>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: TRUST & SECURITY GUIDELINES (4 COLS) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Security Standards Card */}
          <div className="bg-gradient-to-b from-[#f0fdf4] to-[#f8fafc] dark:from-slate-900 dark:to-slate-800/80 rounded-2xl border border-emerald-100 dark:border-slate-800 p-5 sm:p-6 space-y-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              <Lock className="w-4 h-4 text-emerald-600" />
              <span>Compliance Protocols</span>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800 dark:text-slate-200">256-Bit Cryptographic Vault</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  All submitted identity proofs and banking coordinates are stored in encrypted cold storage.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-slate-800 dark:text-slate-200">Strict Ownership Matching</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Payouts are strictly routed to the account holder name matching your government ID.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-slate-800 dark:text-slate-200">Fast-Track Support Desk</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Need priority clearance for urgent trades? Contact our 24/7 compliance concierge.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/60">
              <Link
                href="/help"
                className="text-xs text-emerald-700 dark:text-emerald-400 font-bold hover:underline flex items-center justify-between"
              >
                <span>Compliance Support Concierge</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
