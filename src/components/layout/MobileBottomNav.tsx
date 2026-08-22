'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  TrendingUp,
  CandlestickChart,
  Briefcase,
  Wallet,
  Menu,
  X,
  ShieldCheck,
  User,
  LifeBuoy,
  Settings,
  ArrowUpDown,
  Sliders,
  ChevronRight,
  CreditCard,
  FileText,
  Lock,
  Scale,
  Users,
  Building,
  Terminal,
  Activity
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { useAdmin } from '@/lib/admin-store';

export const MobileBottomNav: React.FC = () => {
  const pathname = usePathname();
  const { currentUser } = useApp();
  const { transactions, kycRecords } = useAdmin();

  const isOperator =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/developer') ||
    pathname.startsWith('/staff') ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'staff' ||
    currentUser?.role === 'developer';

  const isStaff = currentUser?.role === 'staff';
  const isDeveloper = currentUser?.role === 'developer';

  const [menuOpen, setMenuOpen] = useState(false);

  const countPending = (type: 'deposit' | 'withdrawal') =>
    (transactions ?? []).filter((t) => t.type === type && t.status === 'pending').length || undefined;

  const pendingKyc = (kycRecords ?? []).filter((k) => k.status === 'pending').length || undefined;
  const pendingDeposits = countPending('deposit');
  const pendingWithdrawals = countPending('withdrawal');

  const clientMainTabs = [
    { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
    { href: '/markets', label: 'Markets', icon: TrendingUp },
    { href: '/trade', label: 'Trade', icon: CandlestickChart },
    { href: '/funds', label: 'Funds', icon: Wallet },
  ];

  const staffMainTabs = [
    { href: '/staff', label: 'Desk', icon: LayoutDashboard },
    { href: '/admin/deposits', label: 'Deposits', icon: CreditCard, badge: pendingDeposits },
    { href: '/admin/withdrawals', label: 'Payouts', icon: Wallet, badge: pendingWithdrawals },
    { href: '/admin/kyc', label: 'KYC', icon: ShieldCheck, badge: pendingKyc },
  ];

  const adminMainTabs = [
    { href: '/admin', label: 'Console', icon: LayoutDashboard },
    { href: '/admin/deposits', label: 'Deposits', icon: CreditCard, badge: pendingDeposits },
    { href: '/admin/withdrawals', label: 'Payouts', icon: Wallet, badge: pendingWithdrawals },
    { href: '/admin/kyc', label: 'KYC', icon: ShieldCheck, badge: pendingKyc },
  ];

  const devMainTabs = [
    { href: '/developer', label: 'Dev Console', icon: Lock },
    { href: '/admin', label: 'Admin', icon: LayoutDashboard },
    { href: '/admin/deposits', label: 'Deposits', icon: CreditCard, badge: pendingDeposits },
    { href: '/admin/kyc', label: 'KYC', icon: ShieldCheck, badge: pendingKyc },
  ];

  const mainTabs = isDeveloper ? devMainTabs : isStaff ? staffMainTabs : isOperator ? adminMainTabs : clientMainTabs;

  const clientCategories = [
    {
      title: 'Trading & Markets',
      items: [
        { href: '/dashboard', label: 'Overview', desc: 'Summary & balance', icon: LayoutDashboard },
        { href: '/trade', label: 'Trading Desk', desc: 'Live terminal execution', icon: CandlestickChart },
        { href: '/markets', label: 'Quotes & Rates', desc: 'Forex, metals & crypto', icon: TrendingUp },
        { href: '/portfolio', label: 'Net Portfolio', desc: 'Positions & margin utilization', icon: Briefcase },
        { href: '/orders', label: 'Order History', desc: 'Filled & closed positions', icon: ArrowUpDown },
      ],
    },
    {
      title: 'Banking & Ledger',
      items: [
        { href: '/funds?tab=deposit', label: 'Add Funds (Deposit)', desc: 'Instant UPI & bank routing', icon: Wallet },
        { href: '/funds?tab=withdraw', label: 'Withdraw Payout', desc: 'Domestic bank settlement', icon: CreditCard },
        { href: '/transactions', label: 'Financial Ledger', desc: 'Statements and receipts', icon: FileText },
      ],
    },
    {
      title: 'Account & Compliance',
      items: [
        { href: '/verification', label: 'Identity Verification', desc: 'Aadhaar & PAN verification', icon: ShieldCheck },
        { href: '/profile', label: 'Profile Settings', desc: 'User profile & payout bank', icon: User },
        { href: '/profile/security', label: 'Security & Access', desc: 'Active sessions & password', icon: Lock },
        { href: '/settings', label: 'Preferences', desc: 'Display & settings', icon: Settings },
      ],
    },
    {
      title: 'Support & Legal',
      items: [
        { href: '/help', label: 'Customer Support', desc: 'Support desk & tickets', icon: LifeBuoy },
        { href: '/grievance', label: 'Grievance Redressal', desc: 'Compliance officer', icon: Scale },
        { href: '/legal/client-agreement', label: 'Client Agreement', desc: 'Terms & statutory disclosures', icon: FileText },
      ],
    },
  ];

  const operatorCategories = [
    {
      title: 'Operational Desks',
      items: [
        { href: isStaff ? '/staff' : '/admin', label: isStaff ? 'Staff Operations Desk' : 'Admin Console Overview', desc: 'Main operations dashboard', icon: LayoutDashboard },
        { href: '/admin/users', label: 'Users & Portfolios', desc: 'Client account management', icon: Users },
        { href: '/admin/kyc', label: 'KYC Compliance Queue', desc: 'Pending document approvals', icon: ShieldCheck },
        { href: '/admin/deposits', label: 'Deposit Clearing', desc: 'Incoming INR clearance & conversion', icon: CreditCard },
        { href: '/admin/withdrawals', label: 'Payout Queue', desc: 'Bank settlement & IMPS', icon: Wallet },
        { href: '/admin/trades', label: 'Trade Ledger', desc: 'Live open positions & lots', icon: ArrowUpDown },
      ],
    },
    {
      title: 'Governance & Settings',
      items: [
        ...(isDeveloper ? [{ href: '/developer', label: 'Developer Command Console', desc: 'Audit trail, flags & labs', icon: Terminal }] : []),
        { href: '/admin/ledger', label: 'Double-Entry Financial Ledger', desc: 'Immutable audit statements', icon: FileText },
        { href: '/admin/settings', label: 'Bank & UPI Routing Config', desc: 'Payment gateway switches', icon: Settings },
        { href: '/market', label: 'Live Market Terminal', desc: 'Real-time price feeds', icon: TrendingUp },
      ],
    },
  ];

  const activeCategories = isOperator ? operatorCategories : clientCategories;

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-black/95 backdrop-blur-xl border-t border-zinc-200 dark:border-zinc-800 pb-safe select-none">
        <div className="grid grid-cols-5 h-12 items-center px-1">
          {mainTabs.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/dashboard' || item.href === '/admin' || item.href === '/staff' || item.href === '/developer'
                ? pathname === item.href
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center h-full transition-colors active:scale-95 relative ${
                  isActive
                    ? 'text-zinc-950 dark:text-white font-bold'
                    : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                }`}
              >
                <div className={`p-1 rounded-md transition-colors relative ${isActive ? 'bg-zinc-100 dark:bg-zinc-900' : ''}`}>
                  <Icon className="w-4 h-4" />
                  {'badge' in item && typeof item.badge === 'number' && item.badge > 0 ? (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white text-[8px] font-black flex items-center justify-center font-mono">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
                <span className="text-[9px] mt-0.5 font-mono tracking-tight">{item.label}</span>
              </Link>
            );
          })}

          {/* More Menu Trigger */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="More Services"
            className="flex flex-col items-center justify-center h-full text-zinc-400 dark:text-zinc-500 active:scale-95 transition-colors"
          >
            <div className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900">
              <Menu className="w-4 h-4" />
            </div>
            <span className="text-[9px] mt-0.5 font-mono">More</span>
          </button>
        </div>
      </nav>

      {/* Slide-Up Bottom Sheet Drawer */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-150"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="w-full bg-white dark:bg-zinc-950 rounded-t-2xl border-t border-zinc-200 dark:border-zinc-800 p-4 pb-safe max-h-[80vh] overflow-y-auto space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header Handle & Title */}
            <div className="flex items-center justify-between pb-2.5 border-b border-zinc-100 dark:border-zinc-900">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-white" />
                <h3 className="font-mono font-bold text-xs uppercase tracking-wider text-zinc-950 dark:text-white">
                  {isOperator ? (isDeveloper ? 'Developer Super Console' : isStaff ? 'Staff Operations Desk' : 'Administrator Console') : 'Platform Navigation'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close"
                className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Sections */}
            <div className="space-y-4">
              {activeCategories.map((cat) => (
                <div key={cat.title} className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono px-1">
                    {cat.title}
                  </span>
                  <div className="grid grid-cols-1 gap-1">
                    {cat.items.map((service) => {
                      const SIcon = service.icon;
                      return (
                        <Link
                          key={service.href}
                          href={service.href}
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center justify-between p-2 rounded-md bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-900 dark:hover:border-zinc-100 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center shrink-0 text-zinc-900 dark:text-zinc-100">
                              <SIcon className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-xs text-zinc-950 dark:text-white truncate">{service.label}</p>
                              <p className="text-[10px] text-zinc-400 truncate font-mono">{service.desc}</p>
                            </div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0 ml-2" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
