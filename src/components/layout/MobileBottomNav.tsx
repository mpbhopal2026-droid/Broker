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
  Bell,
  ArrowUpDown,
  Sliders,
  ChevronRight,
  CreditCard,
  FileText,
  Lock,
  Scale
} from 'lucide-react';
import { useApp } from '@/lib/store';

export const MobileBottomNav: React.FC = () => {
  const pathname = usePathname();
  const { currentUser } = useApp();

  const isAdmin =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/developer') ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'staff' ||
    currentUser?.role === 'developer';
  const [menuOpen, setMenuOpen] = useState(false);

  const clientMainTabs = [
    { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
    { href: '/markets', label: 'Markets', icon: TrendingUp },
    { href: '/trade', label: 'Trade', icon: CandlestickChart },
    { href: '/funds', label: 'Funds', icon: Wallet },
  ];

  const adminMainTabs = [
    { href: '/admin', label: 'Overview', icon: LayoutDashboard },
    { href: '/admin/users', label: 'Users', icon: Sliders },
    { href: '/admin/deposits', label: 'Deposits', icon: Wallet },
    { href: '/admin/kyc', label: 'KYC Queue', icon: ShieldCheck },
  ];

  const clientCategories = [
    {
      title: 'Trading & Portfolio',
      items: [
        { href: '/dashboard', label: 'Dashboard', desc: 'Summary & market pulse', icon: LayoutDashboard, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/50' },
        { href: '/trade', label: 'Trading Desk', desc: 'Live execution & chart terminal', icon: CandlestickChart, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/50' },
        { href: '/markets', label: 'Markets & Quotes', desc: 'Forex, Indices & Metals', icon: TrendingUp, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50' },
        { href: '/portfolio', label: 'Portfolio & Margin', desc: 'Net equity & position risk', icon: Briefcase, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/50' },
        { href: '/orders', label: 'Order History', desc: 'Filled & closed positions', icon: ArrowUpDown, color: 'text-sky-500 bg-sky-50 dark:bg-sky-950/50' },
      ],
    },
    {
      title: 'Funds & Banking Desk',
      items: [
        { href: '/funds?tab=deposit', label: 'Add Funds (Deposit)', desc: 'Instant UPI & bank transfer', icon: Wallet, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50' },
        { href: '/funds?tab=withdraw', label: 'Withdraw Payout', desc: 'Domestic bank transfer settlement', icon: CreditCard, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/50' },
        { href: '/transactions', label: 'Statement & Ledger', desc: 'Deposit & withdrawal receipts', icon: FileText, color: 'text-teal-500 bg-teal-50 dark:bg-teal-950/50' },
      ],
    },
    {
      title: 'Account & Verification',
      items: [
        { href: '/kyc', label: 'KYC Verification', desc: 'Aadhaar & PAN identity check', icon: ShieldCheck, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/50' },
        { href: '/profile', label: 'My Profile', desc: 'Personal info & bank account', icon: User, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/50' },
        { href: '/profile/security', label: 'Security & Sessions', desc: 'Active sessions & password', icon: Lock, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/50' },
        { href: '/settings', label: 'Platform Settings', desc: 'Theme & preferences', icon: Settings, color: 'text-slate-500 bg-slate-100 dark:bg-slate-800' },
      ],
    },
    {
      title: 'Support & Compliance',
      items: [
        { href: '/support', label: 'Customer Support Desk', desc: '24/7 Dealing desk chat & tickets', icon: LifeBuoy, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/50' },
        { href: '/grievance', label: 'Grievance Redressal', desc: 'Principal compliance officer', icon: Scale, color: 'text-orange-500 bg-orange-50 dark:bg-orange-950/50' },
        { href: '/legal/client-agreement', label: 'Client Agreement', desc: 'Broker terms & conditions', icon: FileText, color: 'text-slate-500 bg-slate-100 dark:bg-slate-800' },
      ],
    },
  ];

  const adminMoreServices = [
    { href: '/admin/trades', label: 'Trading Desk', desc: 'Live open positions & risk', icon: TrendingUp, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50' },
    { href: '/admin/withdrawals', label: 'Withdrawal Approvals', desc: 'Pending payout queue', icon: Wallet, color: 'text-sky-500 bg-sky-50 dark:bg-sky-950/50' },
    { href: '/admin/ledger', label: 'Financial Ledger', desc: 'Double-entry settlement logs', icon: ArrowUpDown, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/50' },
    { href: '/developer', label: 'Developer Console', desc: 'System health, feature flags & API', icon: Sliders, color: 'text-violet-500 bg-violet-50 dark:bg-violet-950/50' },
    { href: '/admin/audit-logs', label: 'Audit Logs', desc: 'Security event logs', icon: Sliders, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/50' },
    { href: '/admin/settings', label: 'Bank & UPI Settings', desc: 'Payment routing & global rates', icon: Settings, color: 'text-slate-500 bg-slate-100 dark:bg-slate-800' },
  ];

  const mainTabs = isAdmin ? adminMainTabs : clientMainTabs;

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0b0f17]/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800/90 pb-safe shadow-2xl select-none">
        <div className="grid grid-cols-5 h-14 items-center px-1">
          {mainTabs.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/dashboard' && item.href !== '/admin' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center h-full transition-all active:scale-90 ${
                  isActive
                    ? 'text-slate-950 dark:text-white font-bold'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <div className="relative">
                  <div className={`p-1 rounded-xl transition-all ${isActive ? 'bg-slate-100 dark:bg-slate-800/80 shadow-xs' : ''}`}>
                    <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5] text-emerald-600 dark:text-emerald-400' : ''}`} />
                  </div>
                  {isActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-xs" />
                  )}
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight font-medium">{item.label}</span>
              </Link>
            );
          })}

          {/* More Menu Trigger */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="More Services"
            className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 active:scale-90 transition-all"
          >
            <div className="p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
              <Menu className="w-4 h-4" />
            </div>
            <span className="text-[10px] mt-0.5 font-medium">More</span>
          </button>
        </div>
      </nav>

      {/* Slide-Up Bottom Sheet Drawer */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-200"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="w-full bg-white dark:bg-[#0f172a] rounded-t-3xl border-t border-slate-200 dark:border-slate-800 p-5 pb-safe max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header Handle & Title */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {isAdmin ? 'Admin Management' : 'All Platform Services'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close"
                className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content: Categorized Sections for Clients vs List for Admins */}
            {!isAdmin ? (
              <div className="space-y-4">
                {clientCategories.map((cat) => (
                  <div key={cat.title} className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono px-1">
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
                            className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 transition-all active:scale-[0.98]"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${service.color}`}>
                                <SIcon className="w-4 h-4 stroke-[2.2]" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-xs text-slate-900 dark:text-white truncate">{service.label}</p>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{service.desc}</p>
                              </div>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-2" />
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5">
                {adminMoreServices.map((service) => {
                  const SIcon = service.icon;
                  return (
                    <Link
                      key={service.href}
                      href={service.href}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 transition-all active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${service.color}`}>
                          <SIcon className="w-4 h-4 stroke-[2.2]" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-slate-900 dark:text-white truncate">{service.label}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{service.desc}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
