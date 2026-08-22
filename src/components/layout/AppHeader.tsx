'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { BrandLogo } from '@/components/ui/BrandLogo';

export const AppHeader: React.FC = () => {
  const router = useRouter();
  const { currentUser, marketAssets, logout } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const notificationRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Auto-close notification panel, search and user dropdown on outside click or escape
  useEffect(() => {
    const handleOutsideInteraction = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (notificationRef.current && !notificationRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(target)) {
        setUserDropdownOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(target)) {
        setIsSearchOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setNotificationsOpen(false);
        setUserDropdownOpen(false);
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideInteraction);
    document.addEventListener('touchstart', handleOutsideInteraction);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideInteraction);
      document.removeEventListener('touchstart', handleOutsideInteraction);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  /**
   * The bell was a placeholder that always read "No new alerts" and never
   * called anything. Deposits, KYC decisions and payout-account changes were
   * being written to the notifications table correctly and nobody ever saw
   * them — which is why the system looked broken from the outside.
   */
  interface Notice {
    id: string;
    type: string;
    title: string;
    body: string;
    link: string | null;
    priority: string;
    read: boolean;
    createdAt: string;
  }

  const [notices, setNotices] = useState<Notice[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotices = useCallback(async () => {
    if (!currentUser) {
      setNotices([]);
      setUnreadCount(0);
      return;
    }
    try {
      const res = await fetch('/api/notifications?limit=10', { credentials: 'same-origin' });
      if (!res.ok) return;
      const body = await res.json();
      if (!Array.isArray(body?.notifications)) return;
      setNotices(body.notifications);
      setUnreadCount(Number(body.unreadCount) || 0);
    } catch {
      /* leave the last known state rather than blanking the bell */
    }
  }, [currentUser]);

  useEffect(() => {
    void loadNotices();
    // A deposit alert that arrives four minutes late is still useful; polling
    // harder would cost far more than it buys.
    const id = setInterval(() => void loadNotices(), 60_000);
    return () => clearInterval(id);
  }, [loadNotices]);

  // Refresh on open so the list is current even between polls.
  useEffect(() => {
    if (notificationsOpen) void loadNotices();
  }, [notificationsOpen, loadNotices]);

  const markAllRead = async () => {
    // Optimistic: the badge clearing instantly is the whole point of pressing
    // it. A failed request is corrected by the next poll.
    setNotices((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ action: 'read_all' }),
      });
    } catch {
      void loadNotices();
    }
  };

  const filteredSymbols = searchQuery.trim()
    ? marketAssets.filter(
        (a) =>
          a.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const firstName = currentUser?.fullName?.split(' ')[0] ?? '';
  const initial = firstName.charAt(0).toUpperCase() || '·';

  const isOperator = currentUser?.role === 'admin' || currentUser?.role === 'staff' || currentUser?.role === 'developer';

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-black/95 backdrop-blur-md px-3.5 sm:px-6 py-2 select-none">
      
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-3">
        
        {/* Left: Mobile Brand */}
        <Link href={currentUser?.role === 'staff' ? '/staff' : isOperator ? '/admin' : '/dashboard'} className="md:hidden flex items-center overflow-hidden shrink-0">
          <BrandLogo size="sm" isAdmin={isOperator} />
        </Link>

        {/* Center/Desktop: Search Trigger Input */}
        <div ref={searchRef} className="hidden md:flex items-center flex-1 max-w-md relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search instruments, markets, users...     ⌘K"
            value={searchQuery}
            onFocus={() => setIsSearchOpen(true)}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 font-sans transition-colors"
          />

          {/* Search Dropdown */}
          {isSearchOpen && searchQuery && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsSearchOpen(false)} />
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl py-1 z-50 max-h-72 overflow-y-auto">
                <div className="px-3 py-1.5 text-[10px] font-sans uppercase font-bold text-zinc-400 border-b border-zinc-100 dark:border-zinc-900">
                  Matching Markets
                </div>
                {filteredSymbols.length === 0 ? (
                  <div className="p-4 text-center text-xs text-zinc-400 font-sans">No instruments found</div>
                ) : (
                  filteredSymbols.map((item) => (
                    <button
                      key={item.symbol}
                      onClick={() => {
                        setIsSearchOpen(false);
                        setSearchQuery('');
                        router.push(`/market?symbol=${encodeURIComponent(item.symbol)}`);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-900 flex items-center justify-between text-xs transition-colors font-sans"
                    >
                      <div>
                        <span className="font-bold text-zinc-950 dark:text-white">{item.symbol}</span>
                        <span className="text-[11px] text-zinc-400 ml-2">{item.name}</span>
                      </div>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
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
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
          
          {/* Live - Demo Trading Button */}
          {isOperator ? (
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-white" />
              <span>Operator</span>
            </div>
          ) : (
            <AccountModeSwitch />
          )}

          {/* Notification Bell */}
          <div ref={notificationRef} className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <>
                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setNotificationsOpen(false)} />
                <div className="absolute right-0 mt-1.5 w-72 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-3 z-50 text-xs space-y-2">
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-900">
                    <span className="font-bold text-zinc-950 dark:text-white uppercase tracking-wider text-[11px]">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllRead}
                        className="text-[10px] font-bold text-emerald-600 hover:underline cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  {notices.length === 0 ? (
                    <p className="text-[11px] text-zinc-400 py-3 text-center">No new alerts</p>
                  ) : (
                    <div className="max-h-80 overflow-y-auto -mx-1 px-1 space-y-1">
                      {notices.map((n) => {
                        const row = (
                          <div
                            className={`p-2 rounded-lg border transition-colors ${
                              n.read
                                ? 'border-transparent'
                                : 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/30'
                            } hover:bg-zinc-50 dark:hover:bg-zinc-900`}
                          >
                            <div className="flex items-start gap-1.5">
                              {!n.read && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                              )}
                              <div className="min-w-0">
                                <p className="font-bold text-zinc-950 dark:text-white text-[11px] truncate">
                                  {n.title}
                                </p>
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2">
                                  {n.body}
                                </p>
                              </div>
                            </div>
                          </div>
                        );

                        return n.link ? (
                          <Link
                            key={n.id}
                            href={n.link}
                            onClick={() => setNotificationsOpen(false)}
                            className="block"
                          >
                            {row}
                          </Link>
                        ) : (
                          <div key={n.id}>{row}</div>
                        );
                      })}
                    </div>
                  )}

                  <Link
                    href="/notifications"
                    onClick={() => setNotificationsOpen(false)}
                    className="block text-center text-[10px] font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white pt-1.5 border-t border-zinc-100 dark:border-zinc-900"
                  >
                    View all
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Account Profile Dropdown (Circular Forest Green Avatar) */}
          <div ref={userDropdownRef} className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-1 p-0.5 rounded-full hover:ring-2 hover:ring-zinc-200 dark:hover:ring-zinc-800 transition-all"
            >
              <div className="w-8 h-8 rounded-full bg-[#0a382c] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {initial || 'V'}
              </div>
            </button>

            {userDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setUserDropdownOpen(false)} />
                <div className="absolute right-0 mt-1.5 w-52 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl py-1 z-50 text-xs font-sans">
                  <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-900">
                    <p className="font-bold text-zinc-950 dark:text-white truncate">{currentUser?.fullName || (isOperator ? 'Administrator' : 'Veer')}</p>
                    <p className="text-[10px] text-zinc-400 truncate">{currentUser?.email || 'veer@globalforex.com'}</p>
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
                        href="/verification"
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
