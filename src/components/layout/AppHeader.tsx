'use client';

import React, { useState } from 'react';
import { AccountModeSwitch } from '@/components/trading/AccountModeSwitch';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Bell,
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
    <header className="sticky top-0 z-30 border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-black/95 backdrop-blur-md px-3.5 sm:px-6 py-2 select-none">
      
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-3">
        
        {/* Left: Mobile Brand */}
        <Link href={isOperator ? '/admin' : '/dashboard'} className="md:hidden flex items-center gap-2 overflow-hidden shrink-0">
          <div className="w-6 h-6 rounded-md bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center font-mono font-bold text-xs">
            GF
          </div>
          <span className="font-bold text-sm tracking-tight text-zinc-950 dark:text-white uppercase font-mono">
            GLOBAL FOREX
          </span>
          {isOperator && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700">
              Admin
            </span>
          )}
        </Link>

        {/* Center/Desktop: Search Trigger Input */}
        <div className="hidden md:flex items-center flex-1 max-w-xs relative">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search instruments... (⌘K)"
            value={searchQuery}
            onFocus={() => setIsSearchOpen(true)}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 font-mono transition-colors"
          />

          {/* Search Dropdown */}
          {isSearchOpen && searchQuery && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsSearchOpen(false)} />
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md shadow-xl py-1 z-50 max-h-72 overflow-y-auto">
                <div className="px-3 py-1.5 text-[10px] font-mono uppercase font-bold text-zinc-400 border-b border-zinc-100 dark:border-zinc-900">
                  Matching Markets
                </div>
                {filteredSymbols.length === 0 ? (
                  <div className="p-4 text-center text-xs text-zinc-400 font-mono">No instruments found</div>
                ) : (
                  filteredSymbols.map((item) => (
                    <button
                      key={item.symbol}
                      onClick={() => {
                        setIsSearchOpen(false);
                        setSearchQuery('');
                        router.push(`/trade?symbol=${encodeURIComponent(item.symbol)}`);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-900 flex items-center justify-between text-xs transition-colors"
                    >
                      <div>
                        <span className="font-mono font-bold text-zinc-950 dark:text-white">{item.symbol}</span>
                        <span className="text-[11px] text-zinc-400 ml-2">{item.name}</span>
                      </div>
                      <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                        {item.price.toFixed(item.symbol.includes('JPY') ? 2 : 4)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Right Section: Mode Button / Admin Badge -> Notifications -> Avatar Logo */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 ml-auto">
          
          {/* Live - Demo Trading Button */}
          {isOperator ? (
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs font-mono font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-white" />
              <span>Operator</span>
            </div>
          ) : (
            <AccountModeSwitch />
          )}

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
            </button>

            {notificationsOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
                <div className="absolute right-0 mt-1.5 w-64 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md shadow-xl p-3 z-50 text-xs space-y-2">
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-900">
                    <span className="font-mono font-bold text-zinc-950 dark:text-white uppercase tracking-wider text-[11px]">Notifications</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 py-3 text-center font-mono">No new alerts</p>
                </div>
              </>
            )}
          </div>

          {/* Account Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-1.5 p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            >
              <div className="w-7 h-7 rounded-md bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center font-mono font-bold text-xs">
                {initial}
              </div>
              <ChevronDown className="w-3 h-3 text-zinc-400 hidden sm:inline" />
            </button>

            {userDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setUserDropdownOpen(false)} />
                <div className="absolute right-0 mt-1.5 w-52 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md shadow-xl py-1 z-50 text-xs">
                  <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-900">
                    <p className="font-bold text-zinc-950 dark:text-white truncate">{currentUser?.fullName || (isOperator ? 'Administrator' : 'Trader')}</p>
                    <p className="text-[10px] text-zinc-400 font-mono truncate">{currentUser?.email}</p>
                  </div>
                  
                  {isOperator ? (
                    <>
                      <Link
                        href="/admin/settings"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                      >
                        <User className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Console Settings</span>
                      </Link>
                      <Link
                        href="/admin/audit-logs"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Audit Logs</span>
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/profile"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                      >
                        <User className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Account Profile</span>
                      </Link>
                      <Link
                        href="/kyc"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Verification Status</span>
                      </Link>
                    </>
                  )}

                  <div className="border-t border-zinc-100 dark:border-zinc-900 mt-1 pt-1">
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-left"
                    >
                      <LogOut className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

        </div>

      </div>

    </header>
  );
};
