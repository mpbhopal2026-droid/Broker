'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Shield,
  Download,
  CheckCircle2,
  FileJson,
  Lock,
  ChevronLeft
} from 'lucide-react';
import { useApp } from '@/lib/store';

export default function PrivacyPage() {
  const { currentUser, transactions, kycRecords, logout, showToast } = useApp();
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleExportData = () => {
    if (!currentUser) return;
    const exportPayload = {
      complianceStandard: 'Digital Personal Data Protection (DPDP) Act, 2023 (India)',
      exportTimestamp: new Date().toISOString(),
      principalProfile: currentUser,
      kycRecords: kycRecords.filter(k => k.userId === currentUser.id),
      transactionLedger: transactions.filter(t => t.userId === currentUser.id),
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Global Forex_Data_Export_${currentUser.fullName.replace(/\s+/g, '_')}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    showToast({ type: 'success', title: 'Data Exported', message: 'Downloaded complete machine-readable archive.' });
    setTimeout(() => setDownloadSuccess(false), 4000);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      
      {/* Header */}
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 mb-1">
          <Link href="/profile" className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 font-semibold">
            <ChevronLeft className="w-3.5 h-3.5" /> Back to Profile
          </Link>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          DPDP Act 2023 Privacy Portal
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Exercise statutory rights under India's Digital Personal Data Protection Act, 2023.
        </p>
      </div>

      {/* Rights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        
        {/* Right to Access */}
        <div className="p-6 rounded-xl bg-white dark:bg-[#0d121c] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-9 h-9 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Download className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Right to Access Personal Data</h2>
            <p className="text-slate-500 leading-relaxed">
              Download a machine-readable JSON archive containing all your stored identity information, KYC records, and ledger history.
            </p>
          </div>

          <button
            onClick={handleExportData}
            className="w-full py-2.5 rounded-lg bg-slate-900 dark:bg-emerald-500 hover:bg-slate-800 text-white dark:text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>{downloadSuccess ? 'Downloaded!' : 'Export JSON Archive'}</span>
          </button>
        </div>

        {/* Right to Grievance Redressal */}
        <div className="p-6 rounded-xl bg-white dark:bg-[#0d121c] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Grievance & Consent Officer</h2>
            <p className="text-slate-500 leading-relaxed">
              Contact our designated Data Protection Officer for statutory consent withdrawal or correction requests.
            </p>
          </div>

          <Link
            href="/help"
            className="w-full py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center justify-center"
          >
            Contact Privacy Officer
          </Link>
        </div>

      </div>

    </div>
  );
}
