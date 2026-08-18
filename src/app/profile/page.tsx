'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  User,
  Building,
  ShieldCheck,
  Download,
  CheckCircle2,
  Lock,
  Edit2,
  Save,
  ChevronRight
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { formatUSD, formatINR } from '@/lib/utils';

export default function ProfilePage() {
  const { currentUser, updateUserProfile, paymentSettings, transactions, kycRecords, showToast } = useApp();

  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [bankName, setBankName] = useState(currentUser?.bankName ?? '');
  const [bankAccountNumber, setBankAccountNumber] = useState(currentUser?.bankAccountNumber ?? '');
  const [bankIfsc, setBankIfsc] = useState(currentUser?.bankIfsc ?? '');
  const [userUpiId, setUserUpiId] = useState(currentUser?.userUpiId || '');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile({
      fullName,
      phone,
      bankName,
      bankAccountNumber,
      bankIfsc,
      userUpiId,
    });
    setIsEditing(false);
  };

  const handleExportData = () => {
    if (!currentUser) return;
    const payload = {
      complianceStandard: 'Digital Personal Data Protection (DPDP) Act, 2023',
      userProfile: currentUser,
      kycRecords: kycRecords.filter((k) => k.userId === currentUser.id),
      transactionLedger: transactions.filter((t) => t.userId === currentUser.id),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GlobalForex_${currentUser.fullName.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast({ type: 'success', title: 'Data Exported', message: 'Downloaded account and ledger archive.' });
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Profile & Accounts
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your personal profile, linked bank details for payouts, and DPDP privacy rights.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsEditing(!isEditing)}
          className="px-3.5 py-2 rounded-xl bg-slate-950 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 shrink-0"
        >
          <Edit2 className="w-3.5 h-3.5" />
          <span>{isEditing ? 'Cancel' : 'Edit Profile'}</span>
        </button>
      </div>

      {/* Profile Overview Card */}
      <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-950 dark:bg-emerald-600 text-white flex items-center justify-center text-lg sm:text-xl font-bold shrink-0">
            {currentUser?.fullName?.charAt(0) || 'U'}
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">{currentUser?.fullName}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{currentUser?.email} • {currentUser?.phone}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {currentUser?.accountTier || 'Pro Tier'}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                KYC {currentUser?.kycStatus?.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <Link
          href="/kyc"
          className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between gap-2 transition-colors"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>KYC Verification</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
        </Link>
      </div>

      {/* Edit Form / Read-Only Details */}
      {isEditing ? (
        <form onSubmit={handleSave} className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4 text-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
            Edit Profile Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-xs">Full Legal Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium text-sm focus:outline-none focus:border-slate-400 dark:focus:border-slate-700"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-xs">Phone Number</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium text-sm focus:outline-none focus:border-slate-400 dark:focus:border-slate-700"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-xs">Bank Name</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium text-sm focus:outline-none focus:border-slate-400 dark:focus:border-slate-700"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-xs">Account Number</label>
              <input
                type="text"
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium text-sm focus:outline-none focus:border-slate-400 dark:focus:border-slate-700"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-xs">IFSC Code</label>
              <input
                type="text"
                value={bankIfsc}
                onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium text-sm uppercase focus:outline-none focus:border-slate-400 dark:focus:border-slate-700"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-xs">UPI ID</label>
              <input
                type="text"
                value={userUpiId}
                onChange={(e) => setUserUpiId(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium text-sm focus:outline-none focus:border-slate-400 dark:focus:border-slate-700"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="py-2.5 px-6 rounded-xl bg-slate-950 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white font-bold text-xs shadow-2xs transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
          
          {/* Linked Bank Card */}
          <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <Building className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span>Linked Payout Bank Account</span>
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Bank:</span>
                <strong className="text-slate-900 dark:text-white">{currentUser?.bankName ?? ''}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Account No:</span>
                <strong className="text-slate-900 dark:text-white">{currentUser?.bankAccountNumber ?? ''}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">IFSC:</span>
                <strong className="text-slate-900 dark:text-white">{currentUser?.bankIfsc ?? ''}</strong>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">UPI ID:</span>
                <strong className="text-slate-900 dark:text-white">{currentUser?.userUpiId || '—'}</strong>
              </div>
            </div>
          </div>

          {/* Privacy & DPDP Data Export */}
          <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <Lock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span>DPDP Act 2023 Data Portal</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Download a complete, machine-readable JSON archive of your personal details, KYC verification files, and financial ledger records.
              </p>
            </div>

            <button
              onClick={handleExportData}
              className="w-full py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Export My Ledger & KYC Data</span>
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
