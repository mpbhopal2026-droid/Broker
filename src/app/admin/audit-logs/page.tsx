'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, ArrowRight, ShieldCheck, Terminal } from 'lucide-react';

export default function AdminAuditLogsRedirectPage() {
  const router = useRouter();

  return (
    <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
        <Lock className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
          Audit Trail Relocated
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          System Audit Trail is now in Developer Console
        </h1>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Security and compliance audit trails have been moved to the Developer Command Console to maintain strict operational segregation of duties.
        </p>
      </div>

      <div className="pt-2">
        <Link
          href="/developer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition-all shadow-md cursor-pointer"
        >
          <Terminal className="w-4 h-4 text-emerald-500" />
          <span>Open Developer Audit Console</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
