'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  TrendingUp,
  CandlestickChart,
  Wallet,
  ShieldCheck,
  User,
  LifeBuoy,
  Settings,
  CreditCard,
  FileText,
  Lock,
  Scale,
  LogOut,
  X,
  ChevronRight,
  Sparkles,
  ExternalLink,
  Sliders,
  Users,
  Building,
  Terminal,
  Activity
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { useAdmin } from '@/lib/admin-store';

export const MobileBottomNav: React.FC = () => {
  const pathname = usePathname();
  const { currentUser, logout } = useApp();
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

  const [profileHubOpen, setProfileHubOpen] = useState(false);

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

  // Compute initials for the profile avatar tab
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const userInitials = getInitials(currentUser?.fullName);

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════
          MOBILE BOTTOM NAVBAR (Crisp White / Light Theme, 64px Height)
         ═══════════════════════════════════════════════════════════════ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 pb-safe select-none shadow-[0_-8px_30px_rgba(0,0,0,0.06)]">
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
                className={`flex flex-col items-center justify-center h-full transition-all active:scale-95 relative ${
                  isActive
                    ? 'text-[#00875a] font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-all relative ${isActive ? 'bg-[#e6f4ea] text-[#00875a] shadow-xs' : ''}`}>
                  <Icon className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[2.2]" />
                  {'badge' in item && typeof item.badge === 'number' && item.badge > 0 ? (
                    <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#00875a] text-white text-[9px] font-black flex items-center justify-center font-mono shadow-xs">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
                <span className={`text-[11px] mt-0.5 font-sans tracking-tight ${isActive ? 'text-[#00875a] font-black' : 'text-slate-600 font-bold'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* 5th Tab: Client Profile Avatar / Hub Trigger */}
          <button
            type="button"
            onClick={() => setProfileHubOpen(true)}
            aria-label="Account Profile & Settings"
            className="flex flex-col items-center justify-center h-full text-slate-600 hover:text-slate-900 active:scale-95 transition-all cursor-pointer"
          >
            <div className="p-1 rounded-xl hover:bg-slate-100 transition-all flex items-center justify-center">
              <div className="w-7 h-7 rounded-lg bg-[#00875a] text-white font-bold text-xs flex items-center justify-center shadow-xs">
                {userInitials}
              </div>
            </div>
            <span className="text-[11px] mt-0.5 font-sans font-bold text-slate-600">Profile</span>
          </button>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════════════
          CLIENT PROFILE & ACCOUNT HUB (Slide-Up Clean White Sheet)
         ═══════════════════════════════════════════════════════════════ */}
      {profileHubOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-150"
          onClick={() => setProfileHubOpen(false)}
        >
          <div
            className="w-full bg-white rounded-t-3xl border-t border-slate-200 p-5 pb-safe max-h-[85vh] overflow-y-auto space-y-5 shadow-2xl animate-in slide-in-from-bottom duration-150 text-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: User Profile Card */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-[#00875a] text-white font-black text-sm flex items-center justify-center shrink-0 shadow-md">
                  {userInitials}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-slate-900 truncate">
                    {currentUser?.fullName || 'Client Account'}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono truncate">
                    {currentUser?.email || currentUser?.phone || 'Verified Trader'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setProfileHubOpen(false)}
                aria-label="Close"
                className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* KYC Status Pill */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-[#f8fafc] border border-slate-200/80">
              <div className="flex items-center gap-2">
                <ShieldCheck className={`w-4 h-4 ${currentUser?.kycStatus === 'approved' ? 'text-[#00875a]' : 'text-amber-500'}`} />
                <span className="text-xs font-bold text-slate-800">Identity Verification (KYC)</span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase ${
                currentUser?.kycStatus === 'approved'
                  ? 'bg-[#e6f4ea] text-[#00875a]'
                  : currentUser?.kycStatus === 'pending'
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-rose-50 text-rose-700'
              }`}>
                {currentUser?.kycStatus === 'approved' ? 'Verified' : currentUser?.kycStatus === 'pending' ? 'In Review' : 'Action Required'}
              </span>
            </div>

            {/* Account & Banking Controls */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 font-sans px-1">
                Account & Banking
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                <Link
                  href="/funds?tab=withdraw"
                  onClick={() => setProfileHubOpen(false)}
                  className="flex items-center justify-between p-3 rounded-2xl bg-[#f8fafc] border border-slate-200/80 hover:border-[#00875a]/50 hover:bg-[#e6f4ea]/20 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#00875a] shadow-2xs">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-slate-900">Settlement Bank & UPI Details</p>
                      <p className="text-[10px] text-slate-500 font-mono">Manage verified payout accounts</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
                </Link>

                <Link
                  href="/verification"
                  onClick={() => setProfileHubOpen(false)}
                  className="flex items-center justify-between p-3 rounded-2xl bg-[#f8fafc] border border-slate-200/80 hover:border-[#00875a]/50 hover:bg-[#e6f4ea]/20 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#00875a] shadow-2xs">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-slate-900">Identity Documents (Aadhaar/PAN)</p>
                      <p className="text-[10px] text-slate-500 font-mono">Compliance & document status</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
                </Link>

                <Link
                  href="/transactions"
                  onClick={() => setProfileHubOpen(false)}
                  className="flex items-center justify-between p-3 rounded-2xl bg-[#f8fafc] border border-slate-200/80 hover:border-[#00875a]/50 hover:bg-[#e6f4ea]/20 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#00875a] shadow-2xs">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-slate-900">Account Statements & Ledger</p>
                      <p className="text-[10px] text-slate-500 font-mono">Download official tax statements</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
                </Link>
              </div>
            </div>

            {/* Security & Preferences */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 font-sans px-1">
                Security & Preferences
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                <Link
                  href="/profile/security"
                  onClick={() => setProfileHubOpen(false)}
                  className="flex items-center justify-between p-3 rounded-2xl bg-[#f8fafc] border border-slate-200/80 hover:border-[#00875a]/50 hover:bg-[#e6f4ea]/20 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-slate-900">Security & Active Sessions</p>
                      <p className="text-[10px] text-slate-500 font-mono">Passwordless login & device access</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
                </Link>

                <Link
                  href="/settings"
                  onClick={() => setProfileHubOpen(false)}
                  className="flex items-center justify-between p-3 rounded-2xl bg-[#f8fafc] border border-slate-200/80 hover:border-[#00875a]/50 hover:bg-[#e6f4ea]/20 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs">
                      <Settings className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-slate-900">App Preferences</p>
                      <p className="text-[10px] text-slate-500 font-mono">Notifications & display settings</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
                </Link>
              </div>
            </div>

            {/* Support & Legal */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 font-sans px-1">
                Help & Governance
              </span>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/help"
                  onClick={() => setProfileHubOpen(false)}
                  className="p-3 rounded-2xl bg-[#f8fafc] border border-slate-200/80 hover:border-[#00875a]/50 text-center transition-all block"
                >
                  <LifeBuoy className="w-4 h-4 mx-auto text-[#00875a] mb-1" />
                  <span className="font-bold text-xs text-slate-900 block">Support Desk</span>
                  <span className="text-[10px] text-slate-500">24/7 Assistance</span>
                </Link>

                <Link
                  href="/grievance"
                  onClick={() => setProfileHubOpen(false)}
                  className="p-3 rounded-2xl bg-[#f8fafc] border border-slate-200/80 hover:border-[#00875a]/50 text-center transition-all block"
                >
                  <Scale className="w-4 h-4 mx-auto text-slate-700 mb-1" />
                  <span className="font-bold text-xs text-slate-900 block">Grievance</span>
                  <span className="text-[10px] text-slate-500">Statutory Redressal</span>
                </Link>
              </div>
            </div>

            {/* Operator Area Link (Staff / Admin / Developer) */}
            {isOperator && (
              <div className="pt-1">
                <Link
                  href={isDeveloper ? '/developer' : isStaff ? '/staff' : '/admin'}
                  onClick={() => setProfileHubOpen(false)}
                  className="w-full p-3 rounded-2xl bg-slate-900 text-white flex items-center justify-between font-bold text-xs shadow-md"
                >
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span>{isDeveloper ? 'Developer Super Console' : isStaff ? 'Staff Operations Desk' : 'Administrator Console'}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>
              </div>
            )}

            {/* Logout Action */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={async () => {
                  setProfileHubOpen(false);
                  await logout();
                }}
                className="w-full py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out of Account</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
