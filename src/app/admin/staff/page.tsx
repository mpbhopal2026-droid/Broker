'use client';

import React, { useState, useMemo } from 'react';
import {
  Users,
  UserCheck,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  Building,
  Briefcase,
  Mail,
  Phone,
  Clock,
  KeyRound,
  Activity,
  Check,
  Lock,
  RefreshCw,
  Sliders,
  ChevronRight
} from 'lucide-react';
import { useAdmin } from '@/lib/admin-store';
import { useApp } from '@/lib/store';
import { formatDate } from '@/lib/utils';
import { UserProfile } from '@/lib/types';

export default function AdminStaffPage() {
  const { currentUser } = useApp();
  const {
    users,
    refreshAdminData,
    setUserActive,
    updateUserRole,
    addStaffMember
  } = useAdmin();

  const isDeveloper = currentUser?.role === 'developer';
  const isAdmin = currentUser?.role === 'admin' || isDeveloper;

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'staff' | 'admin'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRoleUser, setEditingRoleUser] = useState<UserProfile | null>(null);
  const [selectedRole, setSelectedRole] = useState<'client' | 'staff' | 'admin'>('staff');

  // New staff form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState<'staff' | 'admin'>('staff');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Filter staff and admin users
  const staffMembers = useMemo(() => {
    return (users || []).filter((u) => {
      const isStaffOrAdmin = u.role === 'staff' || u.role === 'admin' || u.role === 'developer';
      if (!isStaffOrAdmin) return false;

      if (roleFilter !== 'all' && u.role !== roleFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (u.fullName || '').toLowerCase().includes(q);
        const matchesEmail = (u.email || '').toLowerCase().includes(q);
        const matchesPhone = (u.phone || '').toLowerCase().includes(q);
        return matchesName || matchesEmail || matchesPhone;
      }

      return true;
    });
  }, [users, roleFilter, searchQuery]);

  const totalStaffCount = (users || []).filter((u) => u.role === 'staff').length;
  const totalAdminCount = (users || []).filter((u) => u.role === 'admin' || u.role === 'developer').length;
  const activeCount = staffMembers.filter((u) => u.isActive !== false).length;

  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formName.trim() || !formEmail.trim()) {
      setFormError('Please provide both full name and email address.');
      return;
    }

    setSubmitting(true);
    const res = await addStaffMember({
      fullName: formName.trim(),
      email: formEmail.trim(),
      phone: formPhone.trim() || undefined,
    });
    setSubmitting(false);

    if (!res.success) {
      setFormError(res.error || 'Failed to add staff operator.');
      return;
    }

    setIsAddModalOpen(false);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormRole('staff');
  };

  const handleRoleChangeSubmit = async () => {
    if (!editingRoleUser) return;
    setSubmitting(true);
    await updateUserRole(editingRoleUser.id, selectedRole);
    setSubmitting(false);
    setEditingRoleUser(null);
  };

  const handleToggleStatus = async (user: UserProfile) => {
    const nextActive = user.isActive === false;
    await setUserActive(user.id, nextActive);
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto select-none font-sans text-zinc-950 dark:text-white">
      
      {/* ═══════════════════════════════════════════════════════════════
          PAGE HEADER + ACTIONS
         ═══════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white">
              Staff Operations & Team Management
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 text-xs font-bold border border-blue-200 dark:border-blue-900">
              Operations Team
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 font-normal mt-1">
            Manage operator roster, operational desk access, and institutional authority delegation.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refreshAdminData()}
            className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors"
            title="Refresh Staff Roster"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {isAdmin && (
            <button
              onClick={() => {
                setFormError('');
                setIsAddModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-[#00875a] hover:bg-[#00704a] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Staff Member</span>
            </button>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          METRICS BAR
         ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
            <span>Staff Operators</span>
            <UserCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black tracking-tight text-zinc-950 dark:text-white font-mono">
            {totalStaffCount}
          </div>
          <p className="text-[11px] text-zinc-500">Active operational team members</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
            <span>Administrators</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black tracking-tight text-zinc-950 dark:text-white font-mono">
            {totalAdminCount}
          </div>
          <p className="text-[11px] text-zinc-500">Executive supervisory authority</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
            <span>Active on Duty</span>
            <Activity className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black tracking-tight text-zinc-950 dark:text-white font-mono">
            {activeCount} / {staffMembers.length}
          </div>
          <p className="text-[11px] text-zinc-500">Currently active and authorized</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
            <span>Security Safeguard</span>
            <Lock className="w-4 h-4 text-[#00875a]" />
          </div>
          <div className="text-sm font-bold text-zinc-950 dark:text-white pt-1">
            Developer Gate Active
          </div>
          <p className="text-[11px] text-zinc-500">Deletion locked to Developer</p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          STAFF CAPABILITIES ACCORDION / SUMMARY BANNER
         ═══════════════════════════════════════════════════════════════ */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-emerald-500/5 to-transparent border border-blue-500/20 dark:border-blue-900/40 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
          <h2 className="text-sm font-bold text-zinc-950 dark:text-white">
            Staff Operator Authorization Matrix
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-1">
            <span className="font-bold text-zinc-900 dark:text-white block">1. KYC Verifications</span>
            <span className="text-[11px] text-zinc-500">Inspect full-res docs, PDFs, approve/reject ID</span>
          </div>
          <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-1">
            <span className="font-bold text-zinc-900 dark:text-white block">2. Deposit Clearing</span>
            <span className="text-[11px] text-zinc-500">Verify receipts & credit client wallets</span>
          </div>
          <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-1">
            <span className="font-bold text-zinc-900 dark:text-white block">3. Payout Approvals</span>
            <span className="text-[11px] text-zinc-500">Approve withdrawals & confirm bank release</span>
          </div>
          <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-1">
            <span className="font-bold text-zinc-900 dark:text-white block">4. Balance Corrections</span>
            <span className="text-[11px] text-zinc-500">Post ledger adjustments with audit reasons</span>
          </div>
          <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-1">
            <span className="font-bold text-zinc-900 dark:text-white block">5. Bank & UPI Config</span>
            <span className="text-[11px] text-zinc-500">Update company QR, accounts & instructions</span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          STAFF ROSTER TABLE & FILTER BAR
         ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-2xs">
        
        {/* Search & Filter Header */}
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search staff by name, email, or phone…"
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-[#00875a] focus:ring-1 focus:ring-[#00875a] rounded-xl pl-9 pr-3.5 py-2 text-xs text-zinc-900 dark:text-white outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            {(['all', 'staff', 'admin'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  roleFilter === r
                    ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-bold'
                    : 'text-zinc-500 hover:text-zinc-950 dark:hover:text-white bg-zinc-100 dark:bg-zinc-900'
                }`}
              >
                {r === 'all' ? 'All Roles' : `${r} Only`}
              </button>
            ))}
          </div>
        </div>

        {/* Staff Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-400 border-b border-zinc-100 dark:border-zinc-900 text-[10px] uppercase font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">Operator Member</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4">Role Badge</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Joined Date</th>
                {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {staffMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400 text-xs">
                    No staff members match the selected filters.
                  </td>
                </tr>
              ) : (
                staffMembers.map((member) => {
                  const isCurrent = member.id === currentUser?.id;
                  const initials = (member.fullName || member.email || 'OP')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <tr key={member.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-900/50 transition-colors">
                      
                      {/* Operator Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 font-bold text-xs flex items-center justify-center shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-zinc-950 dark:text-white flex items-center gap-1.5">
                              <span>{member.fullName || 'Staff Operator'}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-[#00875a]">
                                  (You)
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-zinc-500 font-mono">
                              {member.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4 font-mono text-zinc-600 dark:text-zinc-400">
                        {member.phone || '—'}
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            member.role === 'developer'
                              ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
                              : member.role === 'admin'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-[#00875a] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                          }`}
                        >
                          <ShieldCheck className="w-3 h-3" />
                          <span className="capitalize">{member.role === 'staff' ? 'Staff Operator' : member.role}</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                            member.isActive !== false
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-[#00875a]'
                              : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              member.isActive !== false ? 'bg-[#00875a]' : 'bg-rose-600'
                            }`}
                          />
                          <span>{member.isActive !== false ? 'Active' : 'Suspended'}</span>
                        </span>
                      </td>

                      {/* Joined Date */}
                      <td className="py-3.5 px-4 text-zinc-500 font-mono text-[11px]">
                        {formatDate(member.createdAt)}
                      </td>

                      {/* Actions */}
                      {isAdmin && (
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditingRoleUser(member);
                                setSelectedRole(member.role as any || 'staff');
                              }}
                              className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 text-zinc-700 dark:text-zinc-300 font-semibold text-[11px] transition-colors"
                            >
                              Edit Role
                            </button>

                            {!isCurrent && member.role !== 'developer' && (
                              <button
                                onClick={() => handleToggleStatus(member)}
                                className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-colors ${
                                  member.isActive !== false
                                    ? 'border border-amber-200 dark:border-amber-900/60 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                                    : 'border border-emerald-200 dark:border-emerald-900/60 text-[#00875a] hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                                }`}
                              >
                                {member.isActive !== false ? 'Suspend' : 'Reactivate'}
                              </button>
                            )}
                          </div>
                        </td>
                      )}

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* ═══════════════════════════════════════════════════════════════
          ADD STAFF MEMBER MODAL
         ═══════════════════════════════════════════════════════════════ */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-900">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-zinc-950 dark:text-white">
                    Add Staff Operator
                  </h3>
                  <p className="text-[11px] text-zinc-500">Onboard a team member to operational desks</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddStaffSubmit} className="space-y-3.5 text-left">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Full Legal Name *
                </label>
                <div className="relative">
                  <Users className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-[#00875a]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Corporate / Operator Email *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="operator@globalforex.com"
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-[#00875a]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Mobile Number (Optional)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-[#00875a]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Initial Authority Role
                </label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as any)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-[#00875a]"
                >
                  <option value="staff">Staff Operator (KYC, Deposits, Payouts, Balances)</option>
                  <option value="admin">Senior Administrator (Full Supervisory Access)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-900">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#00875a] hover:bg-[#00704a] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Onboarding…</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save & Grant Access</span>
                    </>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          EDIT ROLE MODAL
         ═══════════════════════════════════════════════════════════════ */}
      {editingRoleUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-900">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950 flex items-center justify-center text-purple-600">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-zinc-950 dark:text-white">
                    Modify Role & Authority
                  </h3>
                  <p className="text-[11px] text-zinc-500 truncate max-w-[200px]">{editingRoleUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingRoleUser(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Select Platform Role
              </label>
              
              <div className="space-y-2">
                {[
                  { key: 'staff', title: 'Staff Operator', desc: 'Can process KYC, clearing, payouts & balance edits' },
                  { key: 'admin', title: 'Senior Administrator', desc: 'Full operational and settings management' },
                  { key: 'client', title: 'Client Trader', desc: 'Standard trading account with no admin console access' },
                ].map((r) => (
                  <div
                    key={r.key}
                    onClick={() => setSelectedRole(r.key as any)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                      selectedRole === r.key
                        ? 'border-[#00875a] bg-emerald-50/50 dark:bg-emerald-950/20 text-zinc-950 dark:text-white'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                    }`}
                  >
                    <input
                      type="radio"
                      checked={selectedRole === r.key}
                      onChange={() => setSelectedRole(r.key as any)}
                      className="mt-0.5 text-[#00875a] focus:ring-[#00875a] accent-[#00875a]"
                    />
                    <div>
                      <span className="font-bold text-xs block text-zinc-950 dark:text-white">{r.title}</span>
                      <span className="text-[10px] text-zinc-500">{r.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-900">
              <button
                type="button"
                onClick={() => setEditingRoleUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRoleChangeSubmit}
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-[#00875a] hover:bg-[#00704a] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving…</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Update Role</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
