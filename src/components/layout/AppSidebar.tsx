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
  Users,
  CreditCard,
  Building,
  Radio,
  FileSpreadsheet
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { BrandLogo } from '@/components/ui/BrandLogo';

export const AppSidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logout } = useApp();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isOperator = currentUser?.role === 'admin' || currentUser?.role === 'developer' || currentUser?.role === 'staff';
  const isAdmin = isOperator && (pathname.startsWith('/admin') || pathname.startsWith('/developer'));

  // Nav definitions for Client View
  const clientPrimaryNav = [
    { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Markets', href: '/markets', icon: TrendingUp },
    { label: 'Watchlist', href: '/watchlist', icon: LineChart },
    { label: 'Portfolio', href: '/portfolio', icon: Briefcase },
    { label: 'Orders', href: '/orders', icon: Layers },
    { label: 'Funds & Bank', href: '/funds', icon: Wallet },
  ];

  const clientAccountNav = [
    { label: 'Profile', href: '/profile', icon: User },
    { label: 'Verification', href: '/kyc', icon: ShieldCheck },
    { label: 'Settings', href: '/settings', icon: Settings },
    { label: 'Support', href: '/help', icon: HelpCircle },
  ];

  // Nav definitions for Admin View
  const adminNav = [
    { label: 'Admin Terminal', href: '/admin', icon: LayoutDashboard },
    { label: 'Clients Roster', href: '/admin/users', icon: Users },
    { label: 'KYC Vault', href: '/admin/kyc', icon: ShieldCheck },
    { label: 'Live Trades', href: '/admin/trades', icon: LineChart },
    { label: 'Deposit Ops', href: '/admin/deposits', icon: Wallet },
    { label: 'Withdrawal Ops', href: '/admin/withdrawals', icon: CreditCard },
    { label: 'Payment Config', href: '/admin/payments', icon: Building },
    { label: 'Ledger Audit', href: '/admin/ledger', icon: FileSpreadsheet },
    { label: 'Broadcasts', href: '/admin/settings', icon: Radio },
  ];

  const navList = isAdmin ? adminNav : clientPrimaryNav;

  return (
    <aside
      className={`hidden md:flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black select-none h-screen sticky top-0 shrink-0 z-30 justify-between transition-all duration-200 ${
        isCollapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Top Brand & Nav Section */}
      <div className="flex-1 flex flex-col overflow-y-auto px-3 py-4 scrollbar-none space-y-6">
        
        {/* Brand Header */}
        <div className="px-1 flex items-center justify-between">
          <Link href={isAdmin ? '/admin' : '/dashboard'} className="overflow-hidden">
            <BrandLogo isCollapsed={isCollapsed} size="sm" isAdmin={isAdmin} />
          </Link>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Primary Navigation */}
        <div className="space-y-1">
          {!isCollapsed && (
            <div className="px-2.5 pb-1 text-[10px] font-sans uppercase font-bold tracking-wider text-zinc-400">
              {isAdmin ? 'Administration' : 'Trading Desk'}
            </div>
          )}
          {navList.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/admin' && item.href !== '/dashboard' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors font-sans ${
                  isActive
                    ? 'bg-[#e6f4ea] dark:bg-emerald-950/50 text-[#00875a] dark:text-emerald-400 font-bold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-950 dark:hover:text-white font-medium'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#00875a] dark:text-emerald-400' : ''}`} />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Client Secondary Navigation */}
        {!isAdmin && (
          <div className="space-y-1 pt-3 border-t border-zinc-100 dark:border-zinc-900">
            {!isCollapsed && (
              <div className="px-2.5 pb-1 text-[10px] font-sans uppercase font-bold tracking-wider text-zinc-400">
                Account & Security
              </div>
            )}
            {clientAccountNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors font-sans ${
                    isActive
                      ? 'bg-[#e6f4ea] dark:bg-emerald-950/50 text-[#00875a] dark:text-emerald-400 font-bold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-950 dark:hover:text-white font-medium'
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#00875a] dark:text-emerald-400' : ''}`} />
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        )}

      </div>

      {/* Bottom Sign Out */}
      <div className="p-3 border-t border-zinc-100 dark:border-zinc-900">
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-sans font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-950 dark:hover:text-white transition-colors"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4 shrink-0 text-zinc-500" />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>

    </aside>
  );
};
