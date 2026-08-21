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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md my-auto bg-white dark:bg-zinc-950 rounded-md border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-900 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-zinc-950 dark:text-white" />
            <div>
              <h2 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-tight">
                Manual KYC Verification Override
              </h2>
              <p className="text-[11px] text-zinc-500 font-sans">
                Directly approve or modify user compliance status
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Card */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto flex-1">
          
          <div className="p-3 rounded-md bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Target Client:</span>
              <strong className="text-zinc-950 dark:text-white font-bold">{user.fullName || 'Unnamed User'}</strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Email:</span>
              <span className="text-zinc-700 dark:text-zinc-300 truncate max-w-[200px]">
                {user.email}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-zinc-200 dark:border-zinc-800">
              <span className="text-zinc-400">Current Status:</span>
              <span className="font-bold uppercase px-2 py-0.5 rounded text-[10px] bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
                {user.kycStatus || 'unverified'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Withdrawal account:</span>
              <span
                className={`font-bold uppercase px-2 py-0.5 rounded text-[10px] ${
                  user.bankAccountNumber && user.bankIfsc
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                    : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                }`}
              >
                {user.bankAccountNumber && user.bankIfsc ? 'on file' : 'missing'}
              </span>
            </div>
          </div>

          {/* Approving identity is only one of the three gates. Without a payout
              account the client is still locked out, and the operator walks away
              believing they let them in — which is how three approved clients
              ended up unable to reach the app. Say it here, where the decision
              is being made. */}
          {!(user.bankAccountNumber && user.bankIfsc) && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-[11px] text-amber-900 dark:text-amber-300 leading-relaxed">
              <strong>This client will still be locked out after approval.</strong> They have no
              withdrawal account on file, and the app requires one. Either ask them to complete it
              at <span className="font-mono">/kyc</span>, or add it yourself from Manage → Payout
              account.
            </div>
          )}

          {/* Action Choice */}
          <div className="space-y-2">
            <label className="block font-bold text-zinc-950 dark:text-white text-xs">
              Select Verification Action:
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedStatus('approved')}
                className={`p-2.5 rounded-md border text-left flex items-center gap-2 transition-colors ${
                  selectedStatus === 'approved'
                    ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white font-bold'
                    : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <div>
                  <div className="font-bold text-xs">Approve (Tier 1)</div>
                  <div className="text-[10px] opacity-70">Verified clearance</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatus('rejected')}
                className={`p-2.5 rounded-md border text-left flex items-center gap-2 transition-colors ${
                  selectedStatus === 'rejected'
                    ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white font-bold'
                    : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <XCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <div>
                  <div className="font-bold text-xs">Reject</div>
                  <div className="text-[10px] opacity-70">Require re-upload</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatus('pending')}
                className={`p-2.5 rounded-md border text-left flex items-center gap-2 transition-colors ${
                  selectedStatus === 'pending'
                    ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white font-bold'
                    : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <Clock className="w-4 h-4 shrink-0 text-amber-500" />
                <div>
                  <div className="font-bold text-xs">Mark Pending</div>
                  <div className="text-[10px] opacity-70">Compliance queue</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatus('unverified')}
                className={`p-2.5 rounded-md border text-left flex items-center gap-2 transition-colors ${
                  selectedStatus === 'unverified'
                    ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white font-bold'
                    : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <RotateCcw className="w-4 h-4 shrink-0 text-zinc-400" />
                <div>
                  <div className="font-bold text-xs">Reset Form</div>
                  <div className="text-[10px] opacity-70">Unverified state</div>
                </div>
              </button>
            </div>
          </div>

          {/* Compliance Review Notes */}
          <div className="space-y-1">
            <label className="block font-bold text-zinc-950 dark:text-white text-xs">
              Compliance Notes (Optional for audit trail):
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Identity verified via manual Aadhaar card review..."
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md p-2.5 text-xs text-zinc-950 dark:text-white focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-100"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-900">
            <button
              type="button"
              onClick={onClose}
              className="py-1.5 px-3 rounded-md bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="py-1.5 px-4 rounded-md bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 font-bold uppercase tracking-wider text-xs transition-colors cursor-pointer"
            >
              {loading ? 'Updating…' : 'Apply Status Override'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
