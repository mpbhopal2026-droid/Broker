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
  FileSpreadsheet,
  Lock,
  Bell,
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

export const AdminSidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, kycRecords, transactions } = useAdmin();
  const [hideWalletBalance, setHideWalletBalance] = useState(false);
  const [isWalletWithdrawOpen, setIsWalletWithdrawOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Counts were previously hardcoded (12 / 18 / 9) and several links pointed at
  // /admin rather than the real page, so the sidebar showed invented pending
  // work. Badges now come from the admin store, and 0 renders as nothing.
  const countPending = (type: 'deposit' | 'withdrawal') =>
    (transactions ?? []).filter((t) => t.type === type && t.status === 'pending').length || undefined;

  const pendingKyc = (kycRecords ?? []).filter((k) => k.status === 'pending').length || undefined;
  const pendingDeposits = countPending('deposit');
  const pendingWithdrawals = countPending('withdrawal');

  const adminNav = [
    { href: '/admin', label: 'Dashboard', icon: LayoutGrid },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/kyc', label: 'KYC Approvals', icon: ShieldCheck, badge: pendingKyc },
    { href: '/admin/deposits', label: 'Deposits', icon: CreditCard, badge: pendingDeposits },
    { href: '/admin/withdrawals', label: 'Withdrawals', icon: Clock, badge: pendingWithdrawals },
    { href: '/admin/trades', label: 'Trades & Positions', icon: Layers },
    { href: '/admin/ledger', label: 'Ledger & Wallets', icon: FileText },
    { href: '/market', label: 'Market Data', icon: BarChart2 },
    { href: '/admin/audit-logs', label: 'Audit Logs', icon: Lock },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      <aside
        className={`hidden md:flex flex-col border-r border-slate-200 bg-white select-none h-screen sticky top-0 shrink-0 z-30 justify-between transition-all duration-300 ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        
        {/* Top Brand & Navigation */}
        <div className="flex-1 flex flex-col overflow-y-auto px-3 py-5 scrollbar-none">
          
          {/* Brand Header */}
          <div className="px-1 pb-5 flex items-center justify-between">
            <Link href="/admin" className="flex items-center gap-2 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/logo-mark.svg" alt="" aria-hidden="true" width={28} height={28} className="w-7 h-7 rounded-lg shrink-0" />
              {!isCollapsed && (
                <span className="font-bold text-lg text-slate-900 tracking-tight whitespace-nowrap">
                  Global<span className="text-[#2f8f3c]"> Forex</span>
                  <span className="ml-1 text-[10px] uppercase font-bold tracking-wider text-[#4f46e5] bg-[#eff2ff] px-1.5 py-0.5 rounded">
                    ADMIN
                  </span>
                </span>
              )}
            </Link>

            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation Links */}
          <div className="space-y-0.5">
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
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#f4f3ff] text-[#4f46e5] font-bold'
                      : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                  } ${isCollapsed ? 'justify-center px-0' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#4f46e5]' : 'text-slate-400'}`} />
                    {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
                  </div>

                  {!isCollapsed && (
                    item.badge ? (
                      <span className="text-xs font-mono font-medium text-slate-400">
                        {item.badge}
                      </span>
                    ) : null
                  )}
                </Link>
              );
            })}
          </div>

        </div>

        {/* Bottom Actions & Admin Wallet Card */}
        <div className="p-3 border-t border-slate-100 space-y-2 bg-white">
          
          {/* Switch to Client button */}
          <button
            onClick={() => {
              router.push('/dashboard');
            }}
            title={isCollapsed ? 'Switch to Client' : undefined}
            className={`flex items-center gap-2.5 px-3 py-2 w-full text-left rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-50 transition-colors ${
              isCollapsed ? 'justify-center px-0' : ''
            }`}
          >
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {!isCollapsed && <span className="whitespace-nowrap">Switch to Client</span>}
          </button>

          {/* Logout */}
          <button
            onClick={() => {
              logout();
              router.push('/login');
            }}
            title={isCollapsed ? 'Logout' : undefined}
            className={`flex items-center gap-2.5 px-3 py-1.5 w-full text-left rounded-lg text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50/40 transition-colors ${
              isCollapsed ? 'justify-center px-0' : ''
            }`}
          >
            <LogOut className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {!isCollapsed && <span className="whitespace-nowrap">Logout</span>}
          </button>

          {/* Admin Wallet Widget Card */}
          {!isCollapsed && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Admin Wallet</span>
                <button
                  onClick={() => setHideWalletBalance(!hideWalletBalance)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  {hideWalletBalance ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div>
                <div className="text-lg font-black font-mono text-slate-900">
                  {hideWalletBalance ? '••••••••' : '$ 12,450.00'}
                </div>
                <span className="text-[10px] text-slate-500 font-medium">Total Commission Balance</span>
              </div>

              <button
                onClick={() => setIsWalletWithdrawOpen(true)}
                className="w-full py-1.5 rounded-lg bg-[#5454e6] hover:bg-[#4343d6] text-white text-xs font-bold transition-colors shadow-2xs"
              >
                Withdraw
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
