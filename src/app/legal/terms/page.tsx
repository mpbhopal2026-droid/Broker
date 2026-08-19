'use client';

import React from 'react';
import Link from 'next/link';
import { FileText, ArrowLeft, ShieldCheck, AlertTriangle } from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';

export default function PublicTermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-black text-slate-900 dark:text-white font-sans flex flex-col justify-between selection:bg-[#e6f4ea] selection:text-[#00875a]">
      
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-slate-200/80 dark:border-zinc-800 px-4 sm:px-8 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <BrandLogo size="sm" />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-semibold text-slate-600 hover:text-[#00875a] flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </Link>
            <Link
              href="/login"
              className="px-3.5 py-1.5 rounded-xl bg-[#00875a] hover:bg-[#00704a] text-white text-xs font-bold transition-all shadow-xs"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Main Document Body */}
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-10 sm:py-14 space-y-8 flex-1">
        
        {/* Title Header */}
        <div className="space-y-2 pb-6 border-b border-slate-200 dark:border-zinc-800">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e6f4ea] text-[#00875a] text-xs font-bold">
            <FileText className="w-3.5 h-3.5" />
            <span>Public Legal Document</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Terms of Service
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Effective Date: August 2026 · Platform Terms of Use & Client Agreement
          </p>
        </div>

        {/* Content Sections */}
        <div className="bg-white dark:bg-zinc-950 rounded-3xl p-6 sm:p-10 border border-slate-200/90 dark:border-zinc-800 shadow-2xs space-y-8 text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
          
          {/* Section 1: Acceptance */}
          <section className="space-y-2.5">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing, browsing, registering for, or using the Global Forex platform, web applications, or liquidity services, you confirm that you have read, understood, and agreed to be bound by these Terms of Service. If you do not agree to these terms, you must not access the platform.
            </p>
          </section>

          {/* Section 2: Eligibility */}
          <section className="space-y-2.5">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              2. Eligibility & Account Security
            </h2>
            <p>
              To open an account on Global Forex:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-700 dark:text-zinc-300">
              <li>You must be at least 18 years of age and legally competent to enter into binding financial agreements.</li>
              <li>You are responsible for maintaining the confidentiality of your authentication credentials (including your email access, phone SMS credentials, and OTP verification codes).</li>
              <li>You agree to provide true, accurate, and complete information during registration and identity verification (KYC).</li>
            </ul>
          </section>

          {/* Section 3: Risk Disclaimer */}
          <section className="space-y-2.5 p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/80">
            <h2 className="text-base font-bold text-amber-800 dark:text-amber-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>3. Financial Risk Disclosure</span>
            </h2>
            <p className="text-amber-900 dark:text-amber-300">
              Trading Foreign Exchange (Forex), Commodities, Cryptocurrencies, and Contracts for Difference (CFDs) carries a high level of risk to your capital. Prices fluctuate rapidly based on global market liquidity and macroeconomic events. You should only trade with funds that you can afford to lose.
            </p>
          </section>

          {/* Section 4: Deposits & Withdrawals */}
          <section className="space-y-2.5">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              4. Deposits, Clearing & Withdrawal Settlement
            </h2>
            <p>
              All deposits made via authorized UPI, IMPS, or bank transfer gateways are credited to your ledger upon automated or operator clearing. Withdrawals are processed back to the verified domestic bank account matching the user's KYC documentation to prevent third-party fraud.
            </p>
          </section>

          {/* Section 5: Permitted Platform Use */}
          <section className="space-y-2.5">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              5. Permitted Platform Use & Prohibitions
            </h2>
            <p>
              Users shall not engage in market manipulation, unauthorized latency arbitrage, automated script abuse that overloads execution servers, or money laundering activities. Any accounts engaged in abusive conduct are subject to immediate suspension.
            </p>
          </section>

          {/* Section 6: Contact */}
          <section className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-zinc-900">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              6. Governing Law & Support Contact
            </h2>
            <p>
              For legal inquiries, dispute resolution, or support assistance, reach our compliance team at:
            </p>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900 text-xs space-y-1 font-medium text-slate-700 dark:text-zinc-300">
              <p><strong>Legal Desk:</strong> Global Forex Legal & Compliance</p>
              <p><strong>Email:</strong> <a href="mailto:support@globalforex.online" className="text-[#00875a] hover:underline">support@globalforex.online</a></p>
              <p><strong>Website:</strong> Global Forex Platform</p>
            </div>
          </section>

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 py-6 px-4 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} Global Forex. All rights reserved.</p>
      </footer>

    </div>
  );
}
