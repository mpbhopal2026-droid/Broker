'use client';

import React, { useState } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Building,
  CreditCard,
  Briefcase,
  Layers,
  FileText,
  DollarSign,
  ShieldCheck,
  Settings,
  Sliders,
  ChevronRight
} from 'lucide-react';
import { useAdmin } from '@/lib/admin-store';
import { formatUSD, formatINR, formatDate } from '@/lib/utils';
import { UserProfile } from '@/lib/types';
import { ClientDetailPanel } from '@/components/admin/ClientDetailPanel';
import { useApp } from '@/lib/store';

export default function AdminUsersPage() {
  const { currentUser } = useApp();
  const {
    users,
    paymentSettings
  } = useAdmin();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // Standard Admin Console strictly manages retail client accounts
  const clientAccounts = users.filter((u) => u.role === 'client' || !u.role);

  const filteredUsers = clientAccounts.filter(
    (u) =>
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone.includes(searchQuery)
  );

  return (
    <div className="space-y-6 max-w-5xl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-emerald-600 dark:text-[#00d674]" />
            <span>Client Registry ({users.length})</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            All-in-one client management: KYC compliance, instant balance adjustments, active trade positions, and custom deposit channels.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, email, phone..."
            className="w-full bg-white dark:bg-[#0d121c] border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
          />
        </div>
      </div>

      {/* Users List (Mobile Cards + Desktop Table) */}
      <div className="rounded-2xl bg-white dark:bg-[#0d121c] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        
        {/* Mobile User Card List */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs font-mono">No clients matching your query.</div>
          ) : (
            filteredUsers.map((user) => (
              <div
                key={user.id}
                onClick={() => setSelectedUser(user)}
                className="p-4 space-y-3 active:bg-slate-50 dark:active:bg-slate-900/40 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong className="text-xs sm:text-sm text-slate-900 dark:text-white font-bold truncate">{user.fullName}</strong>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${
                        user.kycStatus === 'approved'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                          : user.kycStatus === 'pending'
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}>
                        {user.kycStatus || 'unverified'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">{user.email}</p>
                    {user.phone && <p className="text-[10px] text-slate-400 font-mono">{user.phone}</p>}
                  </div>

                  <div className="text-right font-mono shrink-0">
                    <div className="text-[10px] text-slate-400">Balance</div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{formatUSD(user.walletBalance)}</div>
                  </div>
                </div>

                {/* Single Consolidated Action Button */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedUser(user);
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-98"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Manage User Settings</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 dark:bg-[#080d14] text-slate-500 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase font-sans">
              <tr>
                <th className="py-3 px-4">Client Name</th>
                <th className="py-3 px-4">Email / Phone</th>
                <th className="py-3 px-4">KYC Status</th>
                <th className="py-3 px-4">Wallet Balance</th>
                <th className="py-3 px-4">Account Tier</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors cursor-pointer"
                >
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white font-sans">
                    {user.fullName}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">
                    <div>{user.email}</div>
                    <div className="text-[10px] text-slate-400">{user.phone}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      user.kycStatus === 'approved'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-[#00d674]'
                        : user.kycStatus === 'pending'
                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}>
                      {user.kycStatus || 'Unverified'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white text-sm">
                    {formatUSD(user.walletBalance)}
                  </td>
                  <td className="py-3.5 px-4 font-sans text-slate-600 dark:text-slate-300">
                    {user.accountTier || 'Standard'}
                  </td>
                  <td className="py-3.5 px-4 text-right font-sans whitespace-nowrap">
                    {/* Single Unified Action Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedUser(user);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-[11px] font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Manage User</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Complete Unified User Management Dossier Panel */}
      {selectedUser && (
        <ClientDetailPanel
          client={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}

    </div>
  );
}

