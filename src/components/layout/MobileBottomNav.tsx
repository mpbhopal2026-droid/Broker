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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#070b12]/95 backdrop-blur-xl border-t border-slate-800 pb-safe select-none shadow-2xl">
        <div className="grid grid-cols-5 h-16 items-center px-1">
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
                className={`flex flex-col items-center justify-center h-full transition-all active:scale-90 relative ${
                  isActive
                    ? 'text-emerald-400 font-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-all relative ${isActive ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm' : ''}`}>
                  <Icon className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[2.2]" />
                  {'badge' in item && typeof item.badge === 'number' && item.badge > 0 ? (
                    <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-emerald-500 text-white text-[9px] font-black flex items-center justify-center font-mono shadow-md">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
                <span className={`text-[11px] mt-0.5 font-sans tracking-tight font-bold ${isActive ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* More Menu Trigger */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="More Services"
            className="flex flex-col items-center justify-center h-full text-slate-400 hover:text-slate-200 active:scale-90 transition-all cursor-pointer"
          >
            <div className="p-1.5 rounded-xl hover:bg-slate-800 transition-all">
              <Menu className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[2.2]" />
            </div>
            <span className="text-[11px] mt-0.5 font-sans font-bold text-slate-400">More</span>
          </button>
        </div>
      </nav>

      {/* Slide-Up Bottom Sheet Drawer */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-150"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="w-full bg-[#0f172a] rounded-t-3xl border-t border-slate-800 p-5 pb-safe max-h-[82vh] overflow-y-auto space-y-5 shadow-2xl animate-in slide-in-from-bottom duration-150 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header Handle & Title */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <h3 className="font-sans font-black text-xs uppercase tracking-wider text-white">
                  {isOperator ? (isDeveloper ? 'Developer Super Console' : isStaff ? 'Staff Operations Desk' : 'Administrator Console') : 'Platform Navigation'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close"
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Sections */}
            <div className="space-y-5">
              {activeCategories.map((cat) => (
                <div key={cat.title} className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono px-1">
                    {cat.title}
                  </span>
                  <div className="grid grid-cols-1 gap-1.5">
                    {cat.items.map((service) => {
                      const SIcon = service.icon;
                      return (
                        <Link
                          key={service.href}
                          href={service.href}
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-[#080d14] border border-slate-800 hover:border-emerald-500/50 transition-all hover:bg-slate-800/40"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-[#0f172a] border border-slate-700 flex items-center justify-center shrink-0 text-emerald-400">
                              <SIcon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-xs text-white truncate">{service.label}</p>
                              <p className="text-[10px] text-slate-400 truncate font-mono">{service.desc}</p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-500 shrink-0 ml-2" />
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
