'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutGrid,
  Users,
  ShieldCheck,
  CreditCard,
  Clock,
  Layers,
  FileText,
  BarChart2,
  Lock,
  Settings,
  ArrowRight,
  LogOut,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { useAdmin } from '@/lib/admin-store';
import { AdminWalletWithdrawModal } from '@/components/admin/modals/AdminWalletWithdrawModal';
import { BrandLogo } from '@/components/ui/BrandLogo';

export const AdminSidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, kycRecords, transactions } = useAdmin();
  const [hideWalletBalance, setHideWalletBalance] = useState(false);
  const [isWalletWithdrawOpen, setIsWalletWithdrawOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const countPending = (type: 'deposit' | 'withdrawal') =>
    (transactions ?? []).filter((t) => t.type === type && t.status === 'pending').length || undefined;

  const pendingKyc = (kycRecords ?? []).filter((k) => k.status === 'pending').length || undefined;
  const pendingDeposits = countPending('deposit');
  const pendingWithdrawals = countPending('withdrawal');

  const adminNav = [
    { href: '/admin', label: 'Console Overview', icon: LayoutGrid },
    { href: '/admin/users', label: 'Users & Portfolios', icon: Users },
    { href: '/admin/kyc', label: 'KYC Queue', icon: ShieldCheck, badge: pendingKyc },
    { href: '/admin/deposits', label: 'Deposit Clearing', icon: CreditCard, badge: pendingDeposits },
    { href: '/admin/withdrawals', label: 'Payout Queue', icon: Clock, badge: pendingWithdrawals },
    { href: '/admin/trades', label: 'Trade Ledger', icon: Layers },
    { href: '/admin/ledger', label: 'Double-Entry Ledger', icon: FileText },
    { href: '/market', label: 'Market Feeds', icon: BarChart2 },
    { href: '/admin/audit-logs', label: 'Audit Trail', icon: Lock },
    { href: '/admin/settings', label: 'Bank & UPI Routing', icon: Settings },
  ];

  return (
    <>
      <aside
        className={`hidden md:flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black select-none h-screen sticky top-0 shrink-0 z-30 justify-between transition-all duration-200 ${
          isCollapsed ? 'w-16' : 'w-60'
        }`}
      >
        
        {/* Top Brand & Navigation */}
        <div className="flex-1 flex flex-col overflow-y-auto px-3 py-4 scrollbar-none space-y-4">
          
          {/* Brand Header */}
          <div className="px-1 flex items-center justify-between">
            <Link href="/admin" className="overflow-hidden">
              <BrandLogo isCollapsed={isCollapsed} size="sm" isAdmin={true} />
            </Link>

            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Navigation Links */}
          <div className="space-y-0.5">
            {!isCollapsed && (
              <div className="px-2 pb-1 text-[10px] uppercase font-bold text-zinc-400">
                Operator Desk
              </div>
            )}
            {adminNav.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/admin'
                  ? pathname === '/admin'
                  : pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  title={isCollapsed ? item.label : undefined}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-bold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900'
                  } ${isCollapsed ? 'justify-center px-0' : ''}`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
                  </div>

                  {!isCollapsed && item.badge ? (
                    <span className="text-[10px] font-bold tabular-nums px-1.5 py-0.2 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>

        </div>

        {/* Bottom Actions & Admin Wallet Card */}
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
          
          {/* Switch to Client button */}
          <button
            onClick={() => {
              router.push('/dashboard');
            }}
            title={isCollapsed ? 'Switch to Client' : undefined}
            className={`flex items-center gap-2 px-2.5 py-1.5 w-full text-left rounded-md text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors ${
              isCollapsed ? 'justify-center px-0' : ''
            }`}
          >
            <ArrowRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            {!isCollapsed && <span className="whitespace-nowrap">Client View</span>}
          </button>

          {/* Logout */}
          <button
            onClick={() => {
              logout();
              router.push('/login');
            }}
            title={isCollapsed ? 'Logout' : undefined}
            className={`flex items-center gap-2 px-2.5 py-1.5 w-full text-left rounded-md text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-rose-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors ${
              isCollapsed ? 'justify-center px-0' : ''
            }`}
          >
            <LogOut className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            {!isCollapsed && <span className="whitespace-nowrap">Sign Out</span>}
          </button>

          {/* Admin Wallet Card */}
          {!isCollapsed && (
            <div className="p-2.5 rounded-md bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-zinc-400">Desk Ledger</span>
                <button
                  onClick={() => setHideWalletBalance(!hideWalletBalance)}
                  className="text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                >
                  {hideWalletBalance ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
              </div>

              <div>
                <div className="text-sm font-bold tabular-nums text-zinc-950 dark:text-white">
                  {hideWalletBalance ? '••••••••' : '$12,450.00'}
                </div>
                <span className="text-[9px] text-zinc-400">Spread Commission Balance</span>
              </div>

              <button
                onClick={() => setIsWalletWithdrawOpen(true)}
                className="w-full py-1 rounded bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-bold transition-colors"
              >
                Withdrawal Settlement
              </button>
            </div>
          )}

        </div>

      </aside>

      {/* Admin Wallet Withdraw Modal */}
      <AdminWalletWithdrawModal
        isOpen={isWalletWithdrawOpen}
        onClose={() => setIsWalletWithdrawOpen(false)}
      />
    </>
  );
};
