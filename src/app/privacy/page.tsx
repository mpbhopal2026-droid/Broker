'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft, Lock, FileText, CheckCircle2, Mail, Globe } from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';

export default function PublicPrivacyPolicyPage() {
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
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Public Legal Document</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Last Updated: August 2026 · Compliant with DPDP Act 2023 & International Data Protection Standards
          </p>
        </div>

        {/* Content Sections */}
        <div className="bg-white dark:bg-zinc-950 rounded-3xl p-6 sm:p-10 border border-slate-200/90 dark:border-zinc-800 shadow-2xs space-y-8 text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
          
          {/* Section 1: Overview */}
          <section className="space-y-2.5">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              1. Introduction & Scope
            </h2>
            <p>
              Global Forex (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is dedicated to safeguarding your personal data and ensuring transparent information practices. This Privacy Policy explains how we collect, store, process, and protect your information when you access our platform, mobile applications, and trading execution services.
            </p>
          </section>

          {/* Section 2: Information We Collect */}
          <section className="space-y-2.5">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              2. Information We Collect
            </h2>
            <p>We only collect information strictly required to deliver secure trading services:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-700 dark:text-zinc-300">
              <li><strong>Account Credentials:</strong> Email address, mobile telephone number, full legal name.</li>
              <li><strong>Authentication Data:</strong> OAuth identity tokens when you choose to sign in via Google Authentication or one-time verification passwords (OTP).</li>
              <li><strong>Identity Verification (KYC):</strong> Government identity numbers and verification documentation required under statutory financial regulations.</li>
              <li><strong>Trading & Ledger Records:</strong> Order executions, deposit transactions, withdrawal logs, and open market positions.</li>
            </ul>
          </section>

          {/* Section 3: Google User Data Disclosure */}
          <section className="space-y-2.5 p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-[#b7e4c7] dark:border-emerald-800/80">
            <h2 className="text-base font-bold text-[#00875a] dark:text-emerald-400 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              <span>3. Google API Services User Data Policy</span>
            </h2>
            <p className="text-slate-700 dark:text-zinc-300">
              When you use <strong>Google Sign-In</strong> to access Global Forex, we access only your primary Google account email address and basic profile name for authentication purposes. We do not access, store, or share your Google Drive, contacts, private browsing data, or any other Google service data. Your information is never transferred, monetized, or sold to third-party advertising networks.
            </p>
          </section>

          {/* Section 4: Security & Encryption */}
          <section className="space-y-2.5">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              4. Data Security & Storage Standard
            </h2>
            <p>
              All data transmissions are encrypted using Transport Layer Security (TLS 1.3). Sensitive identity and KYC fields are encrypted at rest using industry-standard <strong>AES-256 encryption</strong>. Access to production databases is strictly restricted through multi-factor authenticated role-based access controls.
            </p>
          </section>

          {/* Section 5: Your Rights */}
          <section className="space-y-2.5">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              5. Your Rights & Data Portability
            </h2>
            <p>
              Under applicable data protection laws, you retain the full right to:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-700 dark:text-zinc-300">
              <li>Request an export copy of your complete data ledger.</li>
              <li>Request correction or rectification of incomplete profile data.</li>
              <li>Request complete erasure and account closure, subject to statutory tax and financial retention laws.</li>
            </ul>
          </section>

          {/* Section 6: Contact & Grievance */}
          <section className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-zinc-900">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              6. Contact & Grievance Redressal
            </h2>
            <p>
              For any questions regarding this Privacy Policy or your personal data, contact our dedicated compliance desk:
            </p>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900 text-xs space-y-1 font-medium text-slate-700 dark:text-zinc-300">
              <p><strong>Compliance Officer:</strong> Data Protection & Privacy Desk</p>
              <p><strong>Email:</strong> <a href="mailto:support@globalforex.online" className="text-[#00875a] hover:underline">support@globalforex.online</a></p>
              <p><strong>Platform:</strong> Global Forex Trading Desk</p>
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
