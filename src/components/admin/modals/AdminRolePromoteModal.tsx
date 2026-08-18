'use client';

import React, { useState } from 'react';
import { X, ShieldCheck, UserCheck, Shield, Terminal, AlertTriangle, Check } from 'lucide-react';
import { UserRole } from '@/lib/permissions';

interface AdminRolePromoteModalProps {
  user: {
    id: string;
    fullName?: string;
    email: string;
    role: UserRole;
  };
  onClose: () => void;
  onSuccess: (newRole: UserRole) => void;
}

const ROLES_INFO: Array<{
  role: UserRole;
  title: string;
  badge: string;
  badgeColor: string;
  description: string;
  icon: any;
}> = [
  {
    role: 'client',
    title: 'Retail Client',
    badge: 'Standard Trader',
    badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    description: 'Standard retail trading access, deposits, withdrawals, KYC submissions, and demo sandboxes.',
    icon: UserCheck,
  },
  {
    role: 'staff',
    title: 'Staff / Operations Support',
    badge: 'Queue Specialist',
    badgeColor: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400',
    description: 'Can inspect KYC documents and review deposit receipts. Cannot adjust client balances or change platform settings.',
    icon: ShieldCheck,
  },
  {
    role: 'admin',
    title: 'Full Administrator',
    badge: 'Executive Admin',
    badgeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400',
    description: 'Full operational control: approves deposits & payouts, adjusts balances via audited ledger, configures payments & desks.',
    icon: Shield,
  },
  {
    role: 'developer',
    title: 'Platform Developer',
    badge: 'Super Console',
    badgeColor: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400',
    description: 'Full observability, feature flag kill-switches, custom email testing lab, push notification dispatcher, and team role switcher.',
    icon: Terminal,
  },
];

export function AdminRolePromoteModal({ user, onClose, onSuccess }: AdminRolePromoteModalProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>(user.role);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRole === user.role) {
      onClose();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/developer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          action: 'change_role',
          userId: user.id,
          role: selectedRole,
        }),
      });

      const body = await res.json();
      if (!res.ok || body?.ok === false) {
        setError(body?.error || 'Failed to update user role.');
        setLoading(false);
        return;
      }

      onSuccess(selectedRole);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Network error while updating role.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-5 shadow-2xl animate-scale-in">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              Manage User Role & Permissions
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              {user.fullName || 'User'} · {user.email}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2.5">
            {ROLES_INFO.map((item) => {
              const Icon = item.icon;
              const isSelected = selectedRole === item.role;
              const isCurrent = user.role === item.role;

              return (
                <div
                  key={item.role}
                  onClick={() => setSelectedRole(item.role)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    isSelected
                      ? 'bg-purple-50/50 dark:bg-purple-950/30 border-purple-500/60 shadow-xs ring-1 ring-purple-500/50'
                      : 'bg-white dark:bg-[#131d33] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                    isSelected ? 'bg-purple-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <strong className="text-xs font-bold text-slate-900 dark:text-white">{item.title}</strong>
                        {isCurrent && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            Current
                          </span>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed font-sans">
              Changing this role will immediately revoke any active login sessions for <strong>{user.email}</strong> to enforce new permission boundaries.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || selectedRole === user.role}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-purple-500/20 active:scale-95 flex items-center gap-1.5"
            >
              {loading ? (
                <span>Updating Role…</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Confirm Role Change</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
