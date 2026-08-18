'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  X,
  User,
  AlertTriangle
} from 'lucide-react';
import { UserProfile } from '@/lib/types';
import { useAdmin } from '@/lib/admin-store';

interface AdminManualKycModalProps {
  user: UserProfile;
  onClose: () => void;
}

export const AdminManualKycModal: React.FC<AdminManualKycModalProps> = ({ user, onClose }) => {
  const { manualVerifyUserKyc } = useAdmin();
  const [selectedStatus, setSelectedStatus] = useState<'approved' | 'rejected' | 'pending' | 'unverified'>('approved');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await manualVerifyUserKyc(user.id, selectedStatus, notes);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-[#0f172a] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
              <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                Admin Manual KYC Verification
              </h2>
              <p className="text-xs text-slate-400">
                Directly override or approve compliance status for this client
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 text-xs overflow-y-auto flex-1">
          
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">Target Client:</span>
              <strong className="text-slate-900 dark:text-white text-xs">{user.fullName}</strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">Email / Phone:</span>
              <span className="text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                {user.email} · {user.phone || '—'}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 font-medium">Current Status:</span>
              <span className="font-bold uppercase font-mono px-2 py-0.5 rounded text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                {user.kycStatus || 'unverified'}
              </span>
            </div>
          </div>

          {/* Action Choice */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-900 dark:text-white text-xs">
              Select Verification Action:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedStatus('approved')}
                className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-2.5 ${
                  selectedStatus === 'approved'
                    ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-[#111827]'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <strong className="block text-xs text-slate-900 dark:text-white">Direct Approve KYC</strong>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    Verify client immediately without requiring uploaded docs
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatus('pending')}
                className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-2.5 ${
                  selectedStatus === 'pending'
                    ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-[#111827]'
                }`}
              >
                <Clock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <strong className="block text-xs text-slate-900 dark:text-white">Mark as Pending</strong>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    Show holding screen to client
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatus('unverified')}
                className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-2.5 ${
                  selectedStatus === 'unverified'
                    ? 'border-sky-500 bg-sky-50/60 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-[#111827]'
                }`}
              >
                <RotateCcw className="w-4 h-4 text-sky-600 mt-0.5 shrink-0" />
                <div>
                  <strong className="block text-xs text-slate-900 dark:text-white">Reset / Prompt KYC</strong>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    Ask client to complete verification form
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatus('rejected')}
                className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-2.5 ${
                  selectedStatus === 'rejected'
                    ? 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-[#111827]'
                }`}
              >
                <XCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                <div>
                  <strong className="block text-xs text-slate-900 dark:text-white">Reject Verification</strong>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    Decline status with feedback notes
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Admin Audit Notes */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs">
              Compliance Officer Remarks / Audit Notes:
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                selectedStatus === 'approved'
                  ? 'e.g. Verified identity via phone / offline document inspection'
                  : selectedStatus === 'rejected'
                  ? 'e.g. Identity proof unreadable, please re-upload'
                  : 'Optional notes for audit logs...'
              }
              rows={3}
              required={selectedStatus === 'rejected'}
              className="w-full bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-sans"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{loading ? 'Updating...' : `Confirm & Mark as ${selectedStatus.toUpperCase()}`}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
