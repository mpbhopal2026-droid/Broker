'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/store';
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
  Layers,
  Loader2
} from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';

export default function WelcomeLandingPage() {
  const router = useRouter();
  const { currentUser, isLoaded, isAuthenticated } = useApp();

  useEffect(() => {
    if (!isLoaded) return;

    if (isAuthenticated && currentUser) {
      if (currentUser.role === 'admin' || currentUser.role === 'developer' || currentUser.role === 'staff') {
        router.replace('/admin');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [currentUser, isLoaded, isAuthenticated, router]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-[#00875a] animate-spin" />
        <span className="text-xs font-mono text-slate-400">Loading Broker Terminal…</span>
      </div>
    );
  }

  // If already authenticated, show small loader while redirecting to dashboard
  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-[#00875a] animate-spin" />
        <span className="text-xs font-mono text-slate-400">Opening Dashboard…</span>
      </div>
    );
  }

  const liveBenchmarks = [
    { symbol: 'XAU/USD', name: 'Gold Spot', price: '2,436.95', delta: '+0.83%', isUp: true },
    { symbol: 'EUR/USD', name: 'Euro / USD', price: '1.0861', delta: '+0.02%', isUp: true },
    { symbol: 'GBP/USD', name: 'British Pound', price: '1.2739', delta: '+0.28%', isUp: true },
    { symbol: 'BTC/USD', name: 'Bitcoin Spot', price: '64,686.90', delta: '+1.45%', isUp: true },
    { symbol: 'USD/INR', name: 'US Dollar / INR', price: '84.056', delta: '+0.01%', isUp: true },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-black text-slate-900 dark:text-white font-sans flex flex-col justify-between selection:bg-[#e6f4ea] selection:text-[#00875a]">
      
      {/* PUBLIC HEADER */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-slate-200/80 dark:border-zinc-800 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          <Link href="/" className="flex items-center">
            <BrandLogo size="md" />
          </Link>

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

      {/* MAIN HERO */}
      <main className="flex-1 space-y-16 sm:space-y-24 py-12 sm:py-20 px-4 sm:px-8">
        
        <div className="max-w-5xl mx-auto text-center space-y-6">
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#e6f4ea] dark:bg-emerald-950/60 border border-[#b7e4c7] dark:border-emerald-800 text-[#00875a] dark:text-emerald-400 text-xs font-bold shadow-2xs">
            <Zap className="w-3.5 h-3.5" />
            <span>Next-Generation Institutional Trading Desk</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.08]">
            Trade <span className="text-[#00875a]">Global.</span><br />
            Grow <span className="text-[#00875a]">Consistently.</span>
          </h1>

          <p className="text-sm sm:text-base lg:text-lg text-slate-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Powerful multi-asset execution, tight spreads from 0.0 pips, bank-grade custody, and instant domestic settlements.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#00875a] hover:bg-[#00704a] text-white font-bold text-sm transition-all shadow-md shadow-[#00875a]/25 flex items-center justify-center gap-2"
            >
              <span>Open Trading Account</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-800 dark:text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
            >
              <span>Sign In to Terminal</span>
            </Link>
          </div>

        </div>

        {/* LIVE BENCHMARK TICKERS (CLEAN, INSTITUTIONAL, NO EMOJIS) */}
        <section id="markets" className="max-w-6xl mx-auto space-y-4">
          <div className="text-center">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Live Institutional Quotes
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {liveBenchmarks.map((item) => (
              <div
                key={item.symbol}
                className="p-4 rounded-2xl bg-white dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 shadow-2xs flex flex-col justify-between space-y-2 hover:border-[#00875a] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 dark:text-white tracking-wide">
                    {item.symbol}
                  </span>
                  <span className="text-[10px] font-bold text-[#00875a]">
                    {item.delta}
                  </span>
                </div>
                <div className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white font-mono">
                  {item.price}
                </div>
                <div className="text-[10px] text-slate-400">
                  {item.name}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FEATURES GRID */}
        <section id="features" className="max-w-6xl mx-auto space-y-8 pt-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Engineered for Institutional Speed & Precision
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
              Every detail built to provide superior execution speeds, complete ledger transparency, and rock-solid asset protection.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#e6f4ea] dark:bg-emerald-950/60 flex items-center justify-center text-[#00875a]">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Sub-Millisecond Execution</h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                Connect directly to tier-1 global liquidity pools with minimal slippage and ultra-low latency routing.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Regulated & Bank-Grade Security</h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                Segregated client custody, hardware-grade AES-256 encryption at rest, and full statutory compliance.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center text-purple-600">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Instant Multi-Channel Settlements</h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                Seamless domestic UPI, direct IMPS/NEFT bank clearing, and cryptocurrency transfers with real-time clearance.
              </p>
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 py-10 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <BrandLogo size="sm" />
            <span>© {new Date().getFullYear()} Global Forex. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6 font-semibold">
            <Link href="/privacy" className="hover:text-[#00875a] transition-colors">Privacy Policy</Link>
            <Link href="/legal/terms" className="hover:text-[#00875a] transition-colors">Terms of Service</Link>
            <Link href="/help" className="hover:text-[#00875a] transition-colors">Help Desk</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
