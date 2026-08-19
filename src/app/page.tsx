'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  TrendingUp,
  Headphones,
  Zap,
  ArrowRight,
  ChevronRight,
  Globe,
  Lock,
  BarChart3,
  CheckCircle2,
  ExternalLink,
  Layers
} from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';

export default function PublicLandingPage() {
  const liveBenchmarks = [
    { symbol: 'XAU/USD', name: 'Gold Spot', price: '2,436.95', delta: '+0.83%', isUp: true, icon: '🪙' },
    { symbol: 'EUR/USD', name: 'Euro / USD', price: '1.0861', delta: '+0.02%', isUp: true, icon: '🇪🇺' },
    { symbol: 'GBP/USD', name: 'British Pound', price: '1.2739', delta: '+0.28%', isUp: true, icon: '🇬🇧' },
    { symbol: 'BTC/USD', name: 'Bitcoin Spot', price: '64,686.90', delta: '+1.45%', isUp: true, icon: '₿' },
    { symbol: 'USD/INR', name: 'US Dollar / INR', price: '84.056', delta: '+0.01%', isUp: true, icon: '🇺🇸' },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-black text-slate-900 dark:text-white font-sans flex flex-col justify-between selection:bg-[#e6f4ea] selection:text-[#00875a]">
      
      {/* ═══════════════════════════════════════════════════════════════
          PUBLIC HEADER / NAVIGATION BAR
         ═══════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-slate-200/80 dark:border-zinc-800 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <BrandLogo size="md" />
          </Link>

          {/* Center Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-600 dark:text-zinc-400">
            <Link href="#markets" className="hover:text-[#00875a] transition-colors">
              Markets
            </Link>
            <Link href="#features" className="hover:text-[#00875a] transition-colors">
              Features
            </Link>
            <Link href="#security" className="hover:text-[#00875a] transition-colors">
              Security
            </Link>
            <Link href="/privacy" className="hover:text-[#00875a] transition-colors">
              Privacy Policy
            </Link>
            <Link href="/legal/terms" className="hover:text-[#00875a] transition-colors">
              Terms of Service
            </Link>
          </nav>

          {/* Right Action CTAs */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-zinc-300 hover:text-[#00875a] transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-xl bg-[#00875a] hover:bg-[#00704a] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════
          MAIN HERO SECTION
         ═══════════════════════════════════════════════════════════════ */}
      <main className="flex-1 space-y-16 sm:space-y-24 py-12 sm:py-20 px-4 sm:px-8">
        
        <div className="max-w-5xl mx-auto text-center space-y-6">
          
          {/* Tagline Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#e6f4ea] dark:bg-emerald-950/60 border border-[#b7e4c7] dark:border-emerald-800 text-[#00875a] dark:text-emerald-400 text-xs font-bold shadow-2xs animate-fade-in">
            <Zap className="w-3.5 h-3.5" />
            <span>Next-Generation Institutional Trading Desk</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.08]">
            Trade <span className="text-[#00875a]">Global.</span><br />
            Grow <span className="text-[#00875a]">Consistently.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed font-normal">
            Powerful multi-asset execution, tight spreads from 0.0 pips, bank-grade custody, and instant domestic settlements.
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-[#00875a] hover:bg-[#00704a] text-white text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <span>Open Trading Account</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/login"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-800 text-sm font-bold shadow-xs transition-all flex items-center justify-center gap-2"
            >
              <span>Access Live Terminal</span>
              <ExternalLink className="w-4 h-4 text-slate-400" />
            </Link>
          </div>

        </div>

        {/* ═══════════════════════════════════════════════════════════════
            LIVE BENCHMARK QUOTE TICKER STRIP
           ═══════════════════════════════════════════════════════════════ */}
        <div id="markets" className="max-w-6xl mx-auto">
          <div className="text-center mb-6">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Live Institutional Quotes
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {liveBenchmarks.map((item) => (
              <Link
                key={item.symbol}
                href="/login"
                className="bg-white dark:bg-zinc-950 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-4 hover:border-[#00875a] transition-all shadow-2xs hover:shadow-xs group"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-base">{item.icon}</span>
                  <strong className="text-xs font-bold text-slate-900 dark:text-white block group-hover:text-[#00875a] transition-colors">
                    {item.symbol}
                  </strong>
                </div>
                <div className="text-sm font-black text-slate-900 dark:text-white">
                  ${item.price}
                </div>
                <div className="text-[11px] font-bold text-[#00875a] mt-0.5">
                  {item.delta}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            3 CORE PLATFORM PILLARS
           ═══════════════════════════════════════════════════════════════ */}
        <div id="features" className="max-w-6xl mx-auto space-y-8 pt-8">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Engineered for Precision & Speed
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Institutional-grade trading infrastructure built for modern retail and pro traders.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Pillar 1 */}
            <div id="security" className="bg-white dark:bg-zinc-950 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-7 space-y-3.5 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-[#e6f4ea] text-[#00875a] flex items-center justify-center shadow-xs">
                <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Bank-Grade Security
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                256-bit encryption, passwordless Google & OTP authentication, and fully segregated client fund ledgers.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="bg-white dark:bg-zinc-950 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-7 space-y-3.5 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-[#e6f4ea] text-[#00875a] flex items-center justify-center shadow-xs">
                <Zap className="w-6 h-6 stroke-[2.2]" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Ultra-Low Latency Execution
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                Sub-15ms trade execution with direct liquidity provider feeds, zero requotes, and razor-thin spreads.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="bg-white dark:bg-zinc-950 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-7 space-y-3.5 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-[#e6f4ea] text-[#00875a] flex items-center justify-center shadow-xs">
                <Headphones className="w-6 h-6 stroke-[2.2]" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                24/7 Dedicated Support
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                Round-the-clock live desk support with rapid settlement routing, instant UPI deposits, and fast payouts.
              </p>
            </div>

          </div>
        </div>

      </main>

      {/* ═══════════════════════════════════════════════════════════════
          PUBLIC FOOTER & STATUTORY RISK DISCLOSURE
         ═══════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 py-10 px-4 sm:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto space-y-8">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <BrandLogo size="sm" />

            <div className="flex flex-wrap items-center gap-6 font-medium">
              <Link href="/" className="hover:text-[#00875a] transition-colors">
                Home
              </Link>
              <Link href="/privacy" className="hover:text-[#00875a] transition-colors font-semibold text-slate-700 dark:text-zinc-300">
                Privacy Policy
              </Link>
              <Link href="/legal/terms" className="hover:text-[#00875a] transition-colors font-semibold text-slate-700 dark:text-zinc-300">
                Terms of Service
              </Link>
              <Link href="/legal/risk-disclosure" className="hover:text-[#00875a] transition-colors">
                Risk Disclosure
              </Link>
              <Link href="/login" className="hover:text-[#00875a] transition-colors">
                Client Portal
              </Link>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-zinc-900 pt-6 text-[11px] leading-relaxed text-slate-400 space-y-2">
            <p>
              <strong>Risk Warning:</strong> Trading Forex, Commodities, and CFDs involves substantial risk of loss and is not suitable for all investors. Ensure you fully understand the risks involved and do not trade with capital you cannot afford to lose.
            </p>
            <p>
              © {new Date().getFullYear()} Global Forex. All rights reserved. Registered Trading Desk & Liquidity Services.
            </p>
          </div>

        </div>
      </footer>

    </div>
  );
}
