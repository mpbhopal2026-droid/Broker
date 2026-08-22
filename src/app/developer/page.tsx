'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Flag, Mail, Terminal, Activity, AlertTriangle, CheckCircle2,
  RefreshCw, Shield, UserCheck, ShieldCheck, Eye, ChevronRight, X, Clock,
  Search, Lock, Check, Radio, Send, Bell, Smartphone, Users, Sparkles,
  FlaskConical, Sliders, UserX, Trash2
} from 'lucide-react';
import { formatDate, formatUSD, formatINR } from '@/lib/utils';
import { UserRole, ROLE_LABELS } from '@/lib/permissions';
import { AdminRolePromoteModal } from '@/components/admin/modals/AdminRolePromoteModal';
import { OperatorAccessLog } from '@/components/developer/OperatorAccessLog';

interface FeatureFlag {
  key: string;
  enabled: boolean;
  description: string;
  rolloutPercent: number;
  allowedUserIds?: string[];
  userOverrides?: Record<string, boolean>;
  updatedAt: string;
}

interface Health {
  emailsSent24h: number;
  emailsFailed24h: number;
  emailsBounced24h?: number;
  emailsAwaitingEvent24h?: number;
  webhookConfigured?: boolean;
  errors24h: number;
  ledgerDrift: Array<{ user_id: string; email: string; drift: number }>;
}

type Tab = 'users' | 'sessions' | 'notifications_lab' | 'emails' | 'logins' | 'actions' | 'flags' | 'diagnostics';
type RoleFilter = 'all' | 'client' | 'staff' | 'admin' | 'developer';

export default function DeveloperPage() {
  const [tab, setTab] = useState<Tab>('users');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [emails, setEmails] = useState<any[]>([]);
  const [logins, setLogins] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [busyKey, setBusyKey] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<any | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  // Single-User Feature Flag Studio
  const [selectedOverrideUser, setSelectedOverrideUser] = useState('');
  const [selectedFlagKey, setSelectedFlagKey] = useState('demo_account_enabled');

  // Role Promotion Modal State
  const [promoteUser, setPromoteUser] = useState<any | null>(null);

  // Email Lab State
  const [emailMode, setEmailMode] = useState<'welcome' | 'deposit_approved' | 'withdrawal_processed' | 'kyc_approved' | 'security_alert' | 'custom'>('welcome');
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailSending, setEmailSending] = useState(false);

  // Push Notification Lab State
  const [notifTarget, setNotifTarget] = useState<'single' | 'broadcast'>('broadcast');
  const [notifUserId, setNotifUserId] = useState('');
  const [notifTitle, setNotifTitle] = useState('Market Volatility Alert');
  const [notifBody, setNotifBody] = useState('High liquidity detected on EUR/USD and Gold contracts. Open your trading desk.');
  const [notifType, setNotifType] = useState('signal');
  const [notifPriority, setNotifPriority] = useState('high');
  const [notifLink, setNotifLink] = useState('/trade');
  const [notifSending, setNotifSending] = useState(false);

  const loadOverview = useCallback(async () => {
    try {
      const res = await fetch('/api/developer', { credentials: 'same-origin' });
      const body = await res.json();
      if (!res.ok || body?.ok === false) {
        setError(body?.error || 'Could not load the developer console.');
        return;
      }
      setFlags(body.flags ?? []);
      setHealth(body.health ?? null);
      setError('');
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTab = useCallback(async (next: Tab) => {
    try {
      if (next === 'flags' || next === 'diagnostics' || next === 'notifications_lab') {
        // Also fetch users in background if not yet loaded so dropdowns work
        if (allUsers.length === 0) {
          const res = await fetch(`/api/developer?view=users&limit=300`, { credentials: 'same-origin' });
          const body = await res.json();
          if (body.users) setAllUsers(body.users);
        }
        return;
      }
      const res = await fetch(`/api/developer?view=${next}&limit=200`, { credentials: 'same-origin' });
      const body = await res.json();
      if (next === 'users') setAllUsers(body.users ?? []);
      if (next === 'emails') setEmails(body.emails ?? []);
      if (next === 'logins') setLogins(body.logins ?? []);
      if (next === 'actions') setActions(body.actions ?? []);
    } catch {
      /* keep previous view */
    }
  }, [allUsers.length]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    void loadTab(tab);
  }, [tab, loadTab]);

  // Handle Role Change Success
  const handleRoleChanged = (newRole: UserRole) => {
    if (promoteUser) {
      setAllUsers((prev) =>
        prev.map((u) => (u.id === promoteUser.id ? { ...u, role: newRole } : u))
      );
      setSuccessMsg(`Role for ${promoteUser.email} updated to ${newRole.toUpperCase()}`);
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  // Toggle Feature Flag
  const toggleFlag = async (flag: FeatureFlag) => {
    setBusyKey(flag.key);
    try {
      const res = await fetch('/api/developer', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ key: flag.key, enabled: !flag.enabled }),
      });
      const body = await res.json();
      if (!res.ok || body?.ok === false) {
        setError(body?.error || 'Could not update the flag.');
      } else {
        await loadOverview();
      }
    } finally {
      setBusyKey('');
    }
  };

  // Single User Flag Override (Toggle or set specific user demo access)
  const toggleUserFlag = async (flagKey: string, targetUserId: string, targetEnabled: boolean) => {
    setBusyKey(`${flagKey}:${targetUserId}`);
    try {
      const res = await fetch('/api/developer', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          key: flagKey,
          toggleUserId: targetUserId,
          toggleUserEnabled: targetEnabled,
        }),
      });
      const body = await res.json();
      if (!res.ok || body?.ok === false) {
        setError(body?.error || 'Could not update single-user flag override.');
      } else {
        setSuccessMsg(`User flag for "${flagKey}" updated.`);
        setTimeout(() => setSuccessMsg(''), 3500);
        await loadOverview();
        if (allUsers.length > 0) {
          const userObj = allUsers.find(u => u.id === targetUserId);
          if (userObj) {
            setSuccessMsg(`Demo access for ${userObj.email} set to: ${targetEnabled ? 'ALLOWED (Single-User Override)' : 'RESTRICTED'}`);
          }
        }
      }
    } catch {
      setError('Network error while updating single user flag.');
    } finally {
      setBusyKey('');
    }
  };

  // Update Rollout Percentage
  const updateRolloutPercent = async (flagKey: string, rolloutPercent: number) => {
    setBusyKey(flagKey);
    try {
      const res = await fetch('/api/developer', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ key: flagKey, rolloutPercent }),
      });
      const body = await res.json();
      if (!res.ok || body?.ok === false) {
        setError(body?.error || 'Could not update rollout percent.');
      } else {
        await loadOverview();
      }
    } finally {
      setBusyKey('');
    }
  };

  // Handle Send Test Email
  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailRecipient.trim()) {
      setError('Please provide a recipient email address.');
      return;
    }
    setEmailSending(true);
    setError('');

    try {
      const res = await fetch('/api/developer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          action: 'send_test_email',
          recipientEmail: emailRecipient.trim(),
          template: emailMode,
          subject: emailSubject || undefined,
          message: emailMessage || undefined,
        }),
      });

      const body = await res.json();
      if (!res.ok || body?.ok === false) {
        setError(body?.error || 'Could not send test email.');
      } else {
        setSuccessMsg(body.message || 'Test email dispatched successfully.');
        setTimeout(() => setSuccessMsg(''), 4000);
        void loadTab('emails');
      }
    } catch {
      setError('Network error while dispatching email.');
    } finally {
      setEmailSending(false);
    }
  };

  // Handle Send Test Notification
  const handleSendTestNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotifSending(true);
    setError('');

    try {
      const res = await fetch('/api/developer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          action: 'send_test_notification',
          broadcast: notifTarget === 'broadcast',
          userId: notifTarget === 'single' ? notifUserId : undefined,
          title: notifTitle,
          body: notifBody,
          type: notifType,
          priority: notifPriority,
          link: notifLink,
        }),
      });

      const body = await res.json();
      if (!res.ok || body?.ok === false) {
        setError(body?.error || 'Could not send notification.');
      } else {
        setSuccessMsg(body.message || 'Notification broadcast completed.');
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch {
      setError('Network error while sending notification.');
    } finally {
      setNotifSending(false);
    }
  };

  // Filtered Users for Role Management
  const filteredUsers = allUsers.filter((u) => {
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesSearch =
      u.full_name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      u.id?.includes(searchFilter);
    return matchesRole && matchesSearch;
  });

  const filteredEmails = emails.filter(
    (e) =>
      e.recipient?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      e.subject?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      e.template?.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const filteredLogins = logins.filter(
    (l) =>
      l.user_id?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      l.event_type?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      l.ip_address?.includes(searchFilter)
  );

  const filteredActions = actions.filter(
    (a) =>
      a.event_type?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      a.user_id?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      JSON.stringify(a.metadata || {}).toLowerCase().includes(searchFilter.toLowerCase())
  );

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center text-xs text-slate-400 font-mono">
        Initializing Developer Command Engine…
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-[#00d674] mb-1">
            <Terminal className="w-5 h-5" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Developer Command Console
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Multi-tier role management, custom email/push notification lab, transactional logs, and system kill-switches.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              void loadOverview();
              void loadTab(tab);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors shadow-xs active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Live Data</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 animate-scale-in font-bold">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* KPI Metric Tiles */}
      {health && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Emails Sent (24h)</span>
              <Mail className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{health.emailsSent24h}</div>
            <div className="text-[10px] text-slate-400">Transactional dispatch</div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Email Failures</span>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <div className={`text-2xl font-black ${health.emailsFailed24h > 0 ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
              {health.emailsFailed24h}
            </div>
            <div className="text-[10px] text-slate-400">0% error rate SLA</div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Total Accounts</span>
              <Users className="w-4 h-4 text-slate-500 dark:text-slate-300" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{allUsers.length || '—'}</div>
            <div className="text-[10px] text-slate-400">All registered roles</div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Active Feature Flags</span>
              <Flag className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {flags.filter((f) => f.enabled).length} / {flags.length}
            </div>
            <div className="text-[10px] text-slate-400">Configured switches</div>
          </div>
        </div>
      )}

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar whitespace-nowrap">
        <button
          onClick={() => setTab('users')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            tab === 'users'
              ? 'bg-white dark:bg-[#0f172a] text-emerald-600 dark:text-[#00d674] shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Team & Role Management</span>
        </button>

        <button
          onClick={() => setTab('notifications_lab')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            tab === 'notifications_lab'
              ? 'bg-white dark:bg-[#0f172a] text-emerald-600 dark:text-[#00d674] shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Email & Push Lab</span>
        </button>

        <button
          onClick={() => setTab('emails')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            tab === 'emails'
              ? 'bg-white dark:bg-[#0f172a] text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Mail className="w-4 h-4 text-sky-500" />
          <span>Email Logs ({emails.length})</span>
        </button>

        <button
          onClick={() => setTab('logins')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            tab === 'logins'
              ? 'bg-white dark:bg-[#0f172a] text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Lock className="w-4 h-4 text-emerald-500" />
          <span>Auth & Sessions</span>
        </button>

        <button
          onClick={() => setTab('sessions')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            tab === 'sessions'
              ? 'bg-white dark:bg-[#0f172a] text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Radio className="w-4 h-4 text-amber-500" />
          <span>Operator Access</span>
        </button>

        <button
          onClick={() => setTab('flags')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            tab === 'flags'
              ? 'bg-white dark:bg-[#0f172a] text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Flag className="w-4 h-4 text-blue-500" />
          <span>Feature Flags ({flags.length})</span>
        </button>

        <button
          onClick={() => setTab('diagnostics')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            tab === 'diagnostics'
              ? 'bg-white dark:bg-[#0f172a] text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4 text-rose-500" />
          <span>Diagnostics</span>
        </button>
      </div>

      {/* Search Input for active tab */}
      {(tab === 'users' || tab === 'emails' || tab === 'logins' || tab === 'actions') && (
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={`Search in ${tab}…`}
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: TEAM & ROLE MANAGEMENT (SEGREGATED CLIENTS, STAFF, ADMINS, DEVS) */}
      {/* ========================================================================= */}
      {tab === 'users' && (
        <div className="space-y-4">
          
          {/* Segregation Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 pb-1">
            {(
              [
                { id: 'all', label: 'All Accounts', icon: Users },
                { id: 'client', label: 'Clients', icon: UserCheck },
                { id: 'staff', label: 'Staff Support', icon: ShieldCheck },
                { id: 'admin', label: 'Administrators', icon: Shield },
                { id: 'developer', label: 'Developers', icon: Terminal },
              ] as const
            ).map((rf) => {
              const Icon = rf.icon;
              const count = rf.id === 'all' ? allUsers.length : allUsers.filter((u) => u.role === rf.id).length;
              const isActive = roleFilter === rf.id;
              return (
                <button
                  key={rf.id}
                  onClick={() => setRoleFilter(rf.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                      : 'bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{rf.label}</span>
                  <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive ? 'bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUsers.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 font-mono">
                  No accounts found matching role "{roleFilter}".
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const demoFlag = flags.find((f) => f.key === 'demo_account_enabled');
                  const isOverride = (demoFlag?.userOverrides && demoFlag.userOverrides[u.id] !== undefined) || (demoFlag?.allowedUserIds && demoFlag.allowedUserIds.includes(u.id));
                  const isDemoAllowed = isOverride
                    ? (demoFlag?.userOverrides && demoFlag.userOverrides[u.id] !== undefined ? demoFlag.userOverrides[u.id] : true)
                    : Boolean(demoFlag?.enabled);

                  return (
                    <div key={u.id} className="p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <strong className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                              {u.full_name || 'Unnamed Account'}
                            </strong>
                          </div>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">{u.email}</p>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                            u.role === 'developer'
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                              : u.role === 'admin'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                              : u.role === 'staff'
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}>
                            {ROLE_LABELS[u.role as UserRole] || u.role}
                          </span>

                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase flex items-center gap-1 ${
                            isOverride
                              ? isDemoAllowed
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                              : isDemoAllowed
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}>
                            <FlaskConical className="w-2.5 h-2.5" />
                            {isOverride ? (isDemoAllowed ? 'Demo: Forced ON' : 'Demo: Forced OFF') : (isDemoAllowed ? 'Demo: Global ON' : 'Demo: Global OFF')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] gap-2">
                        <span className="text-slate-400 font-mono text-[10px]">
                          Joined {formatDate(u.created_at)}
                        </span>
                        
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={busyKey === `demo_account_enabled:${u.id}`}
                            onClick={() => toggleUserFlag('demo_account_enabled', u.id, !isDemoAllowed)}
                            className={`px-2.5 py-1.5 rounded-xl font-bold text-xs shadow-xs active:scale-95 transition-all flex items-center gap-1 border cursor-pointer ${
                              isDemoAllowed
                                ? 'border-rose-200 dark:border-rose-900/60 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                                : 'border-emerald-200 dark:border-emerald-900/60 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                            }`}
                          >
                            <FlaskConical className="w-3 h-3" />
                            <span>{isDemoAllowed ? 'Revoke Demo' : 'Allow Demo'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setPromoteUser({ id: u.id, fullName: u.full_name, email: u.email, role: u.role || 'client' })}
                            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs shadow-xs active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Shield className="w-3 h-3" />
                            <span>Change Role</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200 dark:border-slate-800 font-sans">
                  <tr>
                    <th className="py-3 px-4">User Details</th>
                    <th className="py-3 px-4">Current Role</th>
                    <th className="py-3 px-4">Demo Trading Access</th>
                    <th className="py-3 px-4">KYC Status</th>
                    <th className="py-3 px-4">Margin Balance</th>
                    <th className="py-3 px-4">Created</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-xs text-slate-400 font-sans">
                        No accounts found matching role "{roleFilter}".
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const demoFlag = flags.find((f) => f.key === 'demo_account_enabled');
                      const isOverride = (demoFlag?.userOverrides && demoFlag.userOverrides[u.id] !== undefined) || (demoFlag?.allowedUserIds && demoFlag.allowedUserIds.includes(u.id));
                      const isDemoAllowed = isOverride
                        ? (demoFlag?.userOverrides && demoFlag.userOverrides[u.id] !== undefined ? demoFlag.userOverrides[u.id] : true)
                        : Boolean(demoFlag?.enabled);

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-4 font-sans">
                            <strong className="text-slate-900 dark:text-white block">{u.full_name || 'Unnamed'}</strong>
                            <span className="text-[11px] text-slate-400 font-mono">{u.email}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              u.role === 'developer'
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                                : u.role === 'admin'
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                                : u.role === 'staff'
                                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}>
                              {ROLE_LABELS[u.role as UserRole] || u.role}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-sans">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              isOverride
                                ? isDemoAllowed
                                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                  : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                                : isDemoAllowed
                                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}>
                              <FlaskConical className="w-3 h-3" />
                              {isOverride ? (isDemoAllowed ? 'Forced ON (Single)' : 'Forced OFF') : (isDemoAllowed ? 'Global Active' : 'Global OFF')}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              u.kyc_status === 'approved'
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600'
                                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600'
                            }`}>
                              {u.kyc_status || 'unverified'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                            {formatUSD(u.wallet_balance || 0)}
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-[11px]">
                            {formatDate(u.created_at)}
                          </td>
                          <td className="py-3 px-4 text-right font-sans">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                disabled={busyKey === `demo_account_enabled:${u.id}`}
                                onClick={() => toggleUserFlag('demo_account_enabled', u.id, !isDemoAllowed)}
                                className={`px-2.5 py-1.5 rounded-xl font-bold text-xs shadow-xs active:scale-95 transition-all inline-flex items-center gap-1 border cursor-pointer ${
                                  isDemoAllowed
                                    ? 'border-rose-200 dark:border-rose-900/60 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                                    : 'border-emerald-200 dark:border-emerald-900/60 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                                }`}
                                title={isDemoAllowed ? 'Revoke Demo Access for this User' : 'Allow Demo Access for this User'}
                              >
                                <FlaskConical className="w-3 h-3" />
                                <span>{isDemoAllowed ? 'Revoke Demo' : 'Allow Demo'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setPromoteUser({ id: u.id, fullName: u.full_name, email: u.email, role: u.role || 'client' })}
                                className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs shadow-xs active:scale-95 transition-all inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Shield className="w-3 h-3" />
                                <span>Change Role</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: EMAIL & PUSH NOTIFICATION LAB (CUSTOM DISPATCH & PREVIEWS) */}
      {/* ========================================================================= */}
      {tab === 'notifications_lab' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Column 1: Transactional Email Dispatcher */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Mail className="w-5 h-5 text-blue-500" />
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Email Dispatcher & Testing Studio</h3>
                <p className="text-[11px] text-slate-500">Send custom messages or trigger verified transactional HTML templates.</p>
              </div>
            </div>

            <form onSubmit={handleSendTestEmail} className="space-y-3 font-sans text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Recipient Email:
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. trader@example.com"
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Template Mode:
                </label>
                <select
                  value={emailMode}
                  onChange={(e) => setEmailMode(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                >
                  <option value="welcome">Welcome Onboarding Email</option>
                  <option value="deposit_approved">Deposit Approved & Credited</option>
                  <option value="withdrawal_processed">Withdrawal Settled & Dispatched</option>
                  <option value="kyc_approved">KYC Verified & Tier-1 Upgraded</option>
                  <option value="security_alert">Security Alert (New Sign-In)</option>
                  <option value="custom">Custom Markdown / HTML Message</option>
                </select>
              </div>

              {emailMode === 'custom' && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Subject Line:
                    </label>
                    <input
                      type="text"
                      placeholder="Special Announcement from Global Forex"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Custom Message Body:
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Type custom notification text..."
                      value={emailMessage}
                      onChange={(e) => setEmailMessage(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={emailSending}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                {emailSending ? <span>Dispatching Email…</span> : <><Send className="w-4 h-4" /><span>Dispatch Test Email</span></>}
              </button>
            </form>
          </div>

          {/* Column 2: Push & In-App Notification Dispatcher */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Bell className="w-5 h-5 text-amber-500" />
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Push & In-App Alert Dispatcher</h3>
                <p className="text-[11px] text-slate-500">Trigger real-time client push notifications, signals, and broadcast alerts.</p>
              </div>
            </div>

            <form onSubmit={handleSendTestNotification} className="space-y-3 font-sans text-xs">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
                  <input
                    type="radio"
                    name="notifTarget"
                    checked={notifTarget === 'broadcast'}
                    onChange={() => setNotifTarget('broadcast')}
                  />
                  <span>Broadcast to All Users</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
                  <input
                    type="radio"
                    name="notifTarget"
                    checked={notifTarget === 'single'}
                    onChange={() => setNotifTarget('single')}
                  />
                  <span>Target Specific User</span>
                </label>
              </div>

              {notifTarget === 'single' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Target User:
                  </label>
                  <select
                    value={notifUserId}
                    onChange={(e) => setNotifUserId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="">Select a user...</option>
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name || 'Client'} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Alert Title:
                </label>
                <input
                  type="text"
                  required
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Message Body:
                </label>
                <textarea
                  rows={2}
                  required
                  value={notifBody}
                  onChange={(e) => setNotifBody(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Category:
                  </label>
                  <select
                    value={notifType}
                    onChange={(e) => setNotifType(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="signal">Trading Signal</option>
                    <option value="system">System Notice</option>
                    <option value="deposit">Deposit Alert</option>
                    <option value="kyc">KYC Alert</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Deep Link:
                  </label>
                  <input
                    type="text"
                    value={notifLink}
                    onChange={(e) => setNotifLink(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={notifSending}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                {notifSending ? <span>Broadcasting Alert…</span> : <><Bell className="w-4 h-4" /><span>Dispatch Push Notification</span></>}
              </button>
            </form>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: EMAIL TRACKING & OPEN LOGS */}
      {/* ========================================================================= */}
      {tab === 'emails' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredEmails.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 font-sans">
                  No transactional emails recorded in this window.
                </div>
              ) : (
                filteredEmails.map((em) => (
                  <div key={em.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <strong className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block truncate">{em.subject}</strong>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">{em.recipient}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono shrink-0 ${
                        em.status === 'sent'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                          : em.status === 'mocked'
                          ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400'
                          : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                      }`}>
                        {em.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
                      <span className="text-slate-400 font-mono text-[10px]">{formatDate(em.created_at)}</span>
                      <button
                        onClick={() => setSelectedEmail(em)}
                        className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs"
                      >
                        Inspect
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Recipient</th>
                    <th className="py-3 px-4">Subject / Template</th>
                    <th className="py-3 px-4">Dispatch Status</th>
                    <th className="py-3 px-4">Open Tracking</th>
                    <th className="py-3 px-4">Latency</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                  {filteredEmails.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-xs text-slate-400 font-sans">
                        No transactional emails recorded in this window.
                      </td>
                    </tr>
                  ) : (
                    filteredEmails.map((em) => (
                      <tr key={em.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white font-sans">
                          {em.recipient}
                        </td>
                        <td className="py-3 px-4 font-sans">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{em.subject}</div>
                          <span className="text-[10px] text-slate-400">{em.template}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            em.status === 'sent'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                              : em.status === 'mocked'
                              ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400'
                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                          }`}>
                            {em.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-sans">
                          {em.opened_at ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                              <Check className="w-3.5 h-3.5" /> Opened {formatDate(em.opened_at)}
                            </span>
                          ) : em.delivered_at ? (
                            <span className="text-[11px] text-slate-500">Delivered (Unopened)</span>
                          ) : (
                            <span className="text-[11px] text-slate-400">Pending Webhook</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {em.duration_ms ? `${em.duration_ms}ms` : '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {formatDate(em.created_at)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedEmail(em)}
                            className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-[10px] font-bold"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: AUTH & LOGIN LOGS */}
      {/* ========================================================================= */}
      {tab === 'sessions' && <OperatorAccessLog />}

      {tab === 'logins' && (
        <div className="rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          {/* Mobile Card List */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {filteredLogins.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 font-sans">
                No authentication sessions logged in this period.
              </div>
            ) : (
              filteredLogins.map((lg) => (
                <div key={lg.id} className="p-4 space-y-1.5 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      lg.event_type.includes('SUCCESS')
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                        : lg.event_type.includes('FAILED')
                        ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                        : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                    }`}>
                      {lg.event_type}
                    </span>
                    <span className="text-[10px] text-slate-400">{formatDate(lg.created_at)}</span>
                  </div>
                  <div className="text-slate-700 dark:text-slate-300 text-xs">
                    User: {lg.user_id ? `${lg.user_id.slice(0, 8)}…` : 'Anonymous'} · IP: {lg.ip_address || '127.0.0.1'}
                  </div>
                  <p className="text-[10px] text-slate-500 font-sans truncate">{lg.user_agent || 'Client device'}</p>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200 dark:border-slate-800 font-sans">
                <tr>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">User ID</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4">Device / User Agent</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredLogins.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-xs text-slate-400 font-sans">
                      No authentication sessions logged in this period.
                    </td>
                  </tr>
                ) : (
                  filteredLogins.map((lg) => (
                    <tr key={lg.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-sans">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          lg.event_type.includes('SUCCESS')
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                            : lg.event_type.includes('FAILED')
                            ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                            : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                        }`}>
                          {lg.event_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                        {lg.user_id ? `${lg.user_id.slice(0, 8)}…` : 'Anonymous'}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-bold">
                        {lg.ip_address || '127.0.0.1'}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px] max-w-xs truncate font-sans" title={lg.user_agent}>
                        {lg.user_agent || 'Mozilla/5.0'}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {formatDate(lg.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: FEATURE FLAGS & OPERATIONAL SWITCHES (GLOBAL & SINGLE-USER) */}
      {/* ========================================================================= */}
      {tab === 'flags' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="p-6 rounded-3xl bg-slate-900 dark:bg-[#111827] border border-slate-800 shadow-lg space-y-2 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Flag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  Feature Flags & Single-User Overrides
                </h2>
                <p className="text-xs text-slate-400">
                  Control platform capabilities globally or target individual user accounts (e.g. allow a single client to trade in Demo mode).
                </p>
              </div>
            </div>
          </div>

          {/* Section 1: Global Platform Flags */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                Platform Global Flags
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">
                {flags.filter(f => f.enabled).length} of {flags.length} Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {flags.map((flag) => {
                const totalOverrides = (flag.allowedUserIds?.length ?? 0) + (flag.userOverrides ? Object.keys(flag.userOverrides).length : 0);

                return (
                  <div
                    key={flag.key}
                    className="p-5 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900 dark:text-white font-mono">{flag.key}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            flag.enabled
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}>
                            {flag.enabled ? 'ACTIVE (GLOBAL)' : 'DISABLED'}
                          </span>
                          {totalOverrides > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60">
                              {totalOverrides} User Override{totalOverrides > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          {flag.description}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleFlag(flag)}
                        disabled={busyKey === flag.key}
                        className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors shrink-0 cursor-pointer ${
                          flag.enabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                            flag.enabled ? 'translate-x-6' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Rollout percentage control */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <Sliders className="w-3 h-3 text-slate-400" />
                          <span>Audience Rollout:</span>
                        </span>
                        <strong className="font-mono text-slate-900 dark:text-white">
                          {flag.rolloutPercent}%
                        </strong>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={flag.rolloutPercent}
                          onChange={(e) => updateRolloutPercent(flag.key, Number(e.target.value))}
                          className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 justify-end text-[10px]">
                        {[0, 25, 50, 100].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => updateRolloutPercent(flag.key, pct)}
                            className={`px-2 py-0.5 rounded font-mono font-bold transition-all cursor-pointer ${
                              flag.rolloutPercent === pct
                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Single-User Feature Flag Studio */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Single-User Feature Flag Studio
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Grant or restrict feature flags (e.g. Demo Account mode) for individual registered users.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick User Override Toolbar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  1. Target User Account:
                </label>
                <select
                  value={selectedOverrideUser}
                  onChange={(e) => setSelectedOverrideUser(e.target.value)}
                  className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                >
                  <option value="">Select a user account...</option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name || 'Unnamed'} ({u.email}) — [{u.role}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  2. Feature Flag Key:
                </label>
                <select
                  value={selectedFlagKey}
                  onChange={(e) => setSelectedFlagKey(e.target.value)}
                  className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-mono"
                >
                  {flags.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.key}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col justify-end">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  3. Action:
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!selectedOverrideUser || busyKey.includes(selectedOverrideUser)}
                    onClick={() => toggleUserFlag(selectedFlagKey, selectedOverrideUser, true)}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Allow (ON)</span>
                  </button>

                  <button
                    type="button"
                    disabled={!selectedOverrideUser || busyKey.includes(selectedOverrideUser)}
                    onClick={() => toggleUserFlag(selectedFlagKey, selectedOverrideUser, false)}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold text-xs shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>Block (OFF)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* List of Active Single User Overrides */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono block">
                Active Single-User Overrides
              </span>

              {(() => {
                const activeOverrides: Array<{
                  flagKey: string;
                  userId: string;
                  userObj: any;
                  enabled: boolean;
                }> = [];

                for (const flag of flags) {
                  if (flag.userOverrides) {
                    for (const [uid, en] of Object.entries(flag.userOverrides)) {
                      const userObj = allUsers.find(u => u.id === uid);
                      activeOverrides.push({
                        flagKey: flag.key,
                        userId: uid,
                        userObj,
                        enabled: Boolean(en),
                      });
                    }
                  }
                  if (flag.allowedUserIds) {
                    for (const uid of flag.allowedUserIds) {
                      if (!activeOverrides.some(ao => ao.flagKey === flag.key && ao.userId === uid)) {
                        const userObj = allUsers.find(u => u.id === uid);
                        activeOverrides.push({
                          flagKey: flag.key,
                          userId: uid,
                          userObj,
                          enabled: true,
                        });
                      }
                    }
                  }
                }

                if (activeOverrides.length === 0) {
                  return (
                    <div className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 font-sans">
                      No custom single-user overrides active. All users are currently governed by platform global defaults.
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800 font-sans">
                        <tr>
                          <th className="py-2.5 px-4">User Details</th>
                          <th className="py-2.5 px-4">Feature Flag</th>
                          <th className="py-2.5 px-4">Override Status</th>
                          <th className="py-2.5 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {activeOverrides.map((ao) => (
                          <tr key={`${ao.flagKey}:${ao.userId}`} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-4 font-sans">
                              <strong className="text-slate-900 dark:text-white block">
                                {ao.userObj?.full_name || 'User'}
                              </strong>
                              <span className="text-[11px] text-slate-400 font-mono">
                                {ao.userObj?.email || ao.userId}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300 font-bold">
                              {ao.flagKey}
                            </td>
                            <td className="py-2.5 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                ao.enabled
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60'
                                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60'
                              }`}>
                                {ao.enabled ? 'FORCE ALLOWED (ON)' : 'FORCE RESTRICTED (OFF)'}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-right font-sans">
                              <button
                                type="button"
                                disabled={busyKey === `${ao.flagKey}:${ao.userId}`}
                                onClick={() => toggleUserFlag(ao.flagKey, ao.userId, !ao.enabled)}
                                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-semibold transition-all inline-flex items-center gap-1 cursor-pointer"
                              >
                                <span>Switch to {ao.enabled ? 'OFF' : 'ON'}</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: DIAGNOSTICS & SYSTEM HEALTH */}
      {/* ========================================================================= */}
      {tab === 'diagnostics' && (
        <div className="space-y-5">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              System Infrastructure Health
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="text-[11px] text-slate-400">Database Engine</div>
                <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Connected (PostgreSQL)
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="text-[11px] text-slate-400">Resend Email Service</div>
                <div className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-blue-500" /> Operational
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="text-[11px] text-slate-400">Trading Engine</div>
                <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-500" /> Demo Sandbox Active
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Payload Inspector Modal */}
      {selectedEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white">Email Dispatch Inspector</h3>
              <button onClick={() => setSelectedEmail(null)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div><span className="text-slate-400">Recipient:</span> {selectedEmail.recipient}</div>
              <div><span className="text-slate-400">Subject:</span> {selectedEmail.subject}</div>
              <div><span className="text-slate-400">Template:</span> {selectedEmail.template}</div>
              <div><span className="text-slate-400">Provider Message ID:</span> {selectedEmail.provider_message_id || 'simulated_local'}</div>
              <div><span className="text-slate-400">Created:</span> {selectedEmail.created_at}</div>
              <div><span className="text-slate-400">Opened:</span> {selectedEmail.opened_at || 'Never opened'}</div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedEmail(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Promotion Modal */}
      {promoteUser && (
        <AdminRolePromoteModal
          user={promoteUser}
          onClose={() => setPromoteUser(null)}
          onSuccess={handleRoleChanged}
        />
      )}

    </div>
  );
}
