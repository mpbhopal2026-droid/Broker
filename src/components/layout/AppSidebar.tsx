'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  TrendingUp,
  LineChart,
  Briefcase,
  Layers,
  Wallet,
  User,
  ShieldCheck,
  Settings,
  HelpCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ArrowRightLeft,
  Users,
  CreditCard,
  Building,
  Radio,
  FileSpreadsheet
} from 'lucide-react';
import { useApp } from '@/lib/store';

export const AppSidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logout } = useApp();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isOperator = currentUser?.role === 'admin' || currentUser?.role === 'developer' || currentUser?.role === 'staff';
  const isAdmin = isOperator && (pathname.startsWith('/admin') || pathname.startsWith('/developer'));

  // Nav definitions for Client View
  const clientPrimaryNav = [
    { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Markets', href: '/markets', icon: TrendingUp },
    { label: 'Watchlist', href: '/watchlist', icon: LineChart },
    { label: 'Portfolio', href: '/portfolio', icon: Briefcase },
    { label: 'Orders', href: '/orders', icon: Layers },
    { label: 'Funds', href: '/funds', icon: Wallet },
  ];

  const clientAccountNav = [
    { label: 'Profile', href: '/profile', icon: User },
    { label: 'KYC', href: '/kyc', icon: ShieldCheck },
    { label: 'Settings', href: '/settings', icon: Settings },
    { label: 'Help & Support', href: '/help', icon: HelpCircle },
  ];

  // Nav definitions for Admin View
  const adminNav = [
    { label: 'Overview', href: '/admin', icon: LayoutDashboard },
    { label: 'Clients & KYC', href: '/admin/users', icon: Users },
    { label: 'Deposits', href: '/admin/deposits', icon: Wallet },
    { label: 'Withdrawals', href: '/admin/withdrawals', icon: CreditCard },
    { label: 'Bank & UPI', href: '/admin/payment-methods', icon: Building },
    { label: 'Financial Ledger', href: '/admin/ledger', icon: FileSpreadsheet },
    { label: 'Broadcasts', href: '/admin/broadcasts', icon: Radio },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col border-r border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0b0f17] select-none h-screen sticky top-0 shrink-0 z-30 justify-between transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      
      {/* Top Brand & Links */}
      <div className="flex-1 flex flex-col overflow-y-auto px-3 py-5 scrollbar-none">
        
        {/* Brand Header & Collapse Toggle */}
        <div className="px-1 pb-6 flex items-center justify-between">
          <Link href={isAdmin ? '/admin' : '/dashboard'} className="flex items-center gap-2.5 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/logo-mark.svg" alt="" aria-hidden="true" width={28} height={28} className="w-7 h-7 rounded-lg shrink-0" />
            {!isCollapsed && (
              <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight whitespace-nowrap">
                Global<span className="text-[#2f8f3c]"> Forex</span>
                {isAdmin && (
                  <span className="ml-1 text-[10px] uppercase font-mono font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                    Admin
                  </span>
                )}
              </span>
            )}
          </Link>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Primary Nav List */}
        <div className="space-y-1">
          {(!isAdmin ? clientPrimaryNav : adminNav).map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== '/admin' && item.href !== '/dashboard' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                title={isCollapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-slate-100 dark:bg-slate-800/90 text-slate-950 dark:text-white font-bold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/40'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Client Account Section */}
        {!isAdmin && (
          <div className="pt-6 mt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-1">
            {clientAccountNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={isCollapsed ? item.label : undefined}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-slate-100 dark:bg-slate-800/90 text-slate-950 dark:text-white font-bold shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  } ${isCollapsed ? 'justify-center px-0' : ''}`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                  {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        )}

      </div>

      {/* Bottom Section */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2 bg-white dark:bg-[#0b0f17]">
        
        {/* Logout Link */}
        <button
          onClick={() => {
            logout();
            router.push('/login');
          }}
          title={isCollapsed ? 'Logout' : undefined}
          className={`flex items-center gap-3 px-3 py-2 w-full text-left rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-950/30 transition-colors ${
            isCollapsed ? 'justify-center px-0' : ''
          }`}
        >
          <LogOut className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
          {!isCollapsed && <span className="whitespace-nowrap">Logout</span>}
        </button>

        {/* Role Toggle Button */}
        {isOperator && (
          <button
            onClick={() => {
              const targetRole = isAdmin ? 'client' : 'admin';
              router.push(targetRole === 'admin' ? '/admin' : '/dashboard');
            }}
            title={isCollapsed ? `Switch to ${isAdmin ? 'Client' : 'Admin'}` : undefined}
            className={`flex items-center justify-between px-3 py-2 w-full rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 transition-colors ${
              isCollapsed ? 'justify-center px-0' : ''
            }`}
          >
            <span className="flex items-center gap-1.5 overflow-hidden">
              <ArrowRightLeft className="w-3 h-3 text-slate-500 shrink-0" />
              {!isCollapsed && <span className="whitespace-nowrap">Switch to {isAdmin ? 'Client' : 'Admin'}</span>}
            </span>
            {!isCollapsed && (
              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">{isAdmin ? 'Admin' : 'Client'}</span>
            )}
          </button>
        )}

      </div>

    </aside>
  );
};
