'use client';

import React, { useState } from 'react';
import { AccountModeSwitch } from '@/components/trading/AccountModeSwitch';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Bell,
  HelpCircle,
  ChevronDown,
  X,
  User,
  ShieldCheck,
  LogOut
} from 'lucide-react';
import { useApp } from '@/lib/store';

export const AppHeader: React.FC = () => {
  const router = useRouter();
  const { currentUser, marketAssets, logout } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const filteredSymbols = marketAssets
    .filter(
      (a) =>
        a.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .slice(0, 8);

  const firstName = currentUser?.fullName?.split(' ')[0] ?? '';
  const initial = firstName.charAt(0).toUpperCase() || '·';

  const isOperator = currentUser?.role === 'admin' || currentUser?.role === 'staff' || currentUser?.role === 'developer';

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-[#0b0f17]/95 backdrop-blur-md px-3.5 sm:px-6 py-2.5 space-y-2 select-none shadow-2xs">
      
      {/* Row 1: Company Logo/Name (Mobile only) -> Space -> Live-Demo Button / Admin Badge -> Profile Avatar (Right) */}
      <div className="flex items-center justify-between gap-3">
        
        {/* Top Left: Company Logo & Name (Mobile only) */}
        <Link href={isOperator ? '/admin' : '/dashboard'} className="md:hidden flex items-center gap-2 overflow-hidden shrink-0 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/logo-mark.svg"
            alt="Logo"
            width={26}
            height={26}
            className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg shrink-0 transition-transform group-hover:scale-105"
          />
          <span className="font-bold text-base sm:text-lg text-slate-900 dark:text-white tracking-tight whitespace-nowrap">
            Global<span className="text-[#2f8f3c]"> Forex</span>
          </span>
          {isOperator && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Admin
            </span>
          )}
        </Link>

        {/* Right Section: Mode Button / Admin Badge -> Notifications -> Avatar Logo */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
          
          {/* Live - Demo Trading Button (Only for retail clients) vs Admin Badge */}
          {isOperator ? (
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 dark:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Operator Console</span>
            </div>
          ) : (
            <AccountModeSwitch />
          )}

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-1.5 sm:p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <Bell className="w-4 h-4" />
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-64 sm:w-72 max-w-[calc(100vw-1.5rem)] bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-3.5 z-50 text-xs space-y-2">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-bold text-slate-900 dark:text-white">Notifications</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 py-2 text-center">You have no notifications.</p>
              </div>
            )}
          </div>

          {/* Account Profile Logo & Dropdown */}
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-1.5 p-0.5 sm:px-1.5 sm:py-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-950 dark:bg-slate-800 text-white flex items-center justify-center font-bold text-xs shadow-2xs border border-transparent dark:border-slate-700">
                {initial}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-1.5 z-50 text-xs">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                  <p className="font-bold text-slate-900 dark:text-white">{currentUser?.fullName || (isOperator ? 'Administrator' : 'Trader')}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{currentUser?.email}</p>
                  {isOperator && (
                    <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      {currentUser?.role}
                    </span>
                  )}
                </div>
                
                {isOperator ? (
                  <>
                    <Link
                      href="/admin/settings"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 font-medium"
                    >
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Console Settings</span>
                    </Link>
                    <Link
                      href="/admin/audit-logs"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 font-medium"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                      <span>Security Audit Logs</span>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/profile"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 font-medium"
                    >
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>My Profile</span>
                    </Link>
                    <Link
                      href="/kyc"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 font-medium"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                      <span>KYC Verification</span>
                    </Link>
                  </>
                )}

                <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
                <button
                  onClick={() => {
                    setUserDropdownOpen(false);
                    logout();
                    router.push('/login');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-left font-semibold"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Row 2: Search Bar in the next bottom section */}
      <div className="relative w-full">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            placeholder="Search for instruments (e.g. XAU/USD, EUR/USD, BTC)..."
            className="w-full bg-slate-50/80 dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-900 focus:bg-white dark:focus:bg-[#0f172a] border border-slate-200 dark:border-slate-800/90 rounded-xl pl-9 pr-9 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-slate-400 dark:focus:border-slate-700 focus:ring-1 focus:ring-slate-400 transition-colors shadow-2xs"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setIsSearchOpen(false);
              }}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Autocomplete Dropdown */}
        {isSearchOpen && searchQuery && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden z-50 text-xs divide-y divide-slate-100 dark:divide-slate-800/80 max-h-64 overflow-y-auto">
            <div className="p-2.5 bg-slate-50/60 dark:bg-slate-900/60 text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
              Matching Instruments
            </div>
            {filteredSymbols.length === 0 ? (
              <div className="p-4 text-center text-slate-400">No instruments found.</div>
            ) : (
              filteredSymbols.map((item) => (
                <button
                  key={item.symbol}
                  onClick={() => {
                    setIsSearchOpen(false);
                    setSearchQuery('');
                    router.push(`/trade?symbol=${encodeURIComponent(item.symbol)}`);
                  }}
                  className="w-full p-3 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div>
                    <strong className="text-slate-900 dark:text-white font-bold text-sm block">{item.symbol}</strong>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 dark:text-white text-sm block">${item.price.toLocaleString()}</span>
                    <span
                      className={`text-[10px] font-semibold ${
                        item.changePercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {item.changePercent >= 0 ? '+' : ''}
                      {item.changePercent}%
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

    </header>
  );
};
