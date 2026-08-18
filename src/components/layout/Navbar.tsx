'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  TrendingUp,
  CreditCard,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownLeft,
  User,
  Sliders,
  LogOut,
  BarChart2,
  ChevronDown,
  Sun,
  Moon,
  Monitor,
  Activity,
  Zap,
  Globe
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { formatUSD, formatINR } from '@/lib/utils';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logout, theme, setTheme, paymentSettings } = useApp();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const cycleTheme = () => {
    if (theme === 'dark') setTheme('light');
    else if (theme === 'light') setTheme('system');
    else setTheme('dark');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/90 bg-[#070b12]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between">
        
        {/* Brand Logo & Main Nav */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#00d674] to-emerald-400 text-slate-950 flex items-center justify-center font-black text-sm shadow-md shadow-[#00d674]/20 group-hover:scale-105 transition-transform">
              ▲
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1">
                Global<span className="text-[#2f8f3c]"> Forex</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono font-normal">PRO</span>
              </span>
              <span className="text-[9px] text-slate-400 -mt-0.5 font-medium hidden sm:inline">Institutional Forex & Advisory</span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 text-xs font-semibold text-slate-400">
            <Link
              href="/dashboard"
              className={`px-3 py-1.5 rounded-lg transition-colors hover:text-white ${
                pathname === '/dashboard' ? 'text-[#00d674] bg-slate-900/90 border border-slate-800' : ''
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/markets"
              className={`px-3 py-1.5 rounded-lg transition-colors hover:text-white ${
                pathname === '/markets' ? 'text-[#00d674] bg-slate-900/90 border border-slate-800' : ''
              }`}
            >
              Markets Screener
            </Link>
            <Link
              href="/market"
              className={`px-3 py-1.5 rounded-lg transition-colors hover:text-white ${
                pathname === '/market' ? 'text-[#00d674] bg-slate-900/90 border border-slate-800' : ''
              }`}
            >
              WebTrader
            </Link>
            <Link
              href="/deposit"
              className={`px-3 py-1.5 rounded-lg transition-colors hover:text-white ${
                pathname === '/deposit' ? 'text-[#00d674] bg-slate-900/90 border border-slate-800' : ''
              }`}
            >
              Deposit (₹)
            </Link>
            <Link
              href="/withdraw"
              className={`px-3 py-1.5 rounded-lg transition-colors hover:text-white ${
                pathname === '/withdraw' ? 'text-[#00d674] bg-slate-900/90 border border-slate-800' : ''
              }`}
            >
              Withdraw
            </Link>
            <Link
              href="/kyc"
              className={`px-3 py-1.5 rounded-lg transition-colors hover:text-white ${
                pathname === '/kyc' ? 'text-[#00d674] bg-slate-900/90 border border-slate-800' : ''
              }`}
            >
              KYC
            </Link>
          </nav>
        </div>

        {/* Right Actions & Utilities */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Theme Toggle */}
          <button
            onClick={cycleTheme}
            title={`Theme: ${theme.toUpperCase()} (Click to toggle)`}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-all text-xs flex items-center gap-1"
          >
            {theme === 'dark' ? (
              <Moon className="w-3.5 h-3.5 text-sky-400" />
            ) : theme === 'light' ? (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Monitor className="w-3.5 h-3.5 text-[#00d674]" />
            )}
          </button>

          {/* Quick Role Switcher Pill (Client / Admin) */}
          <div className="flex items-center p-0.5 rounded-xl bg-[#0d121c] border border-slate-800">
            <button
              onClick={() => {('client');
                if (pathname.startsWith('/admin')) router.push('/dashboard');
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all ${
                currentUser?.role === 'client'
                  ? 'bg-[#00d674] text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Client
            </button>
            <button
              onClick={() => {('admin');
                router.push('/admin');
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all ${
                currentUser?.role === 'admin'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Admin
            </button>
          </div>

          {/* Dual Balance Pill (Client) */}
          {currentUser && currentUser.role === 'client' && (
            <Link
              href="/dashboard"
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0d121c] border border-slate-800 hover:border-[#00d674]/50 transition-all text-xs font-mono"
            >
              <span className="text-slate-400 text-[10px] uppercase font-sans font-bold">Margin:</span>
              <strong className="text-white font-bold">{formatUSD(currentUser.walletBalance)}</strong>
              <span className="text-[10px] text-[#00d674] font-bold">
                (₹{((currentUser.walletBalance || 0) * paymentSettings.usdToInrRate).toLocaleString('en-IN')})
              </span>
            </Link>
          )}

          {/* Deposit CTA */}
          <Link
            href="/deposit"
            className="px-3 py-1.5 rounded-xl bg-[#00d674] hover:bg-[#00bf67] text-slate-950 text-xs font-black transition-all shadow-md shadow-[#00d674]/20 flex items-center gap-1 active:scale-95 shrink-0"
          >
            <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Deposit</span>
          </Link>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0d121c] border border-slate-800 hover:border-slate-700 text-slate-300"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-800 text-[#00d674] flex items-center justify-center text-xs font-black">
                {currentUser?.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 mr-0.5" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#0d121c] border border-slate-700 shadow-2xl py-2 z-50 text-xs animate-scale-in">
                <div className="px-4 py-2.5 border-b border-slate-800">
                  <p className="font-bold text-white truncate">{currentUser?.fullName || 'Trader'}</p>
                  <p className="text-[10px] text-slate-400 truncate">{currentUser?.email}</p>
                  <span className="inline-block mt-1 text-[9px] text-[#00d674] font-bold bg-[#00d674]/10 px-2 py-0.5 rounded-full border border-[#00d674]/20">
                    {currentUser?.accountTier || 'Pro Member'}
                  </span>
                </div>

                <div className="py-1">
                  <Link
                    href="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:bg-slate-800/80 font-semibold"
                  >
                    <User className="w-3.5 h-3.5 text-[#00d674]" />
                    Profile & Banking Info
                  </Link>
                  <Link
                    href="/dashboard"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:bg-slate-800/80 font-semibold"
                  >
                    <BarChart2 className="w-3.5 h-3.5 text-sky-400" />
                    Portfolio & Trades
                  </Link>
                  <Link
                    href="/market"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:bg-slate-800/80 font-semibold"
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                    Live WebTrader
                  </Link>
                  <Link
                    href="/deposit"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:bg-slate-800/80 font-semibold"
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5 text-[#00d674]" />
                    Deposit Funds (₹)
                  </Link>
                  <Link
                    href="/withdraw"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:bg-slate-800/80 font-semibold"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5 text-sky-400" />
                    Withdraw Funds
                  </Link>
                  <Link
                    href="/kyc"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:bg-slate-800/80 font-semibold"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-[#00d674]" />
                    KYC Compliance
                  </Link>
                  {currentUser?.role === 'admin' && (
                    <Link
                      href="/admin"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-purple-400 hover:bg-purple-950/40 font-bold"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      Super Admin Console
                    </Link>
                  )}
                </div>

                <div className="border-t border-slate-800 pt-1">
                  <button
                    onClick={() => {
                      logout();
                      setDropdownOpen(false);
                      router.push('/login');
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-[#ff3b57] hover:bg-slate-800/80 font-semibold"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
