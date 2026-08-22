'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  X,
  CreditCard,
  Building,
  AlertTriangle,
  QrCode,
} from 'lucide-react';
import { UserProfile, ClientPaymentConfig } from '@/lib/types';
import { useAdmin } from '@/lib/admin-store';

interface AdminManualKycModalProps {
  user: UserProfile;
  onClose: () => void;
}

export const AdminManualKycModal: React.FC<AdminManualKycModalProps> = ({ user, onClose }) => {
  const { manualVerifyUserKyc, setClientPaymentConfig, getClientPaymentConfig, showToast } = useAdmin();
  const [selectedStatus, setSelectedStatus] = useState<'approved' | 'rejected' | 'pending' | 'unverified'>('approved');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Compulsory Deposit Account Assignment Fields (Upon KYC Approval)
  const [depositBankName, setDepositBankName] = useState('');
  const [depositAccountHolder, setDepositAccountHolder] = useState(user.fullName || '');
  const [depositAccountNumber, setDepositAccountNumber] = useState('');
  const [depositIfsc, setDepositIfsc] = useState('');
  const [depositUpiId, setDepositUpiId] = useState('');
  const [depositQrImageUrl, setDepositQrImageUrl] = useState('');
  const [depositNotes, setDepositNotes] = useState('');

  // Prepopulate if client already has a custom deposit routing config
  useEffect(() => {
    if (user?.id) {
      const existing = getClientPaymentConfig(user.id);
      if (existing) {
        setDepositBankName(existing.bankName || '');
        setDepositAccountHolder(existing.accountHolder || user.fullName || '');
        setDepositAccountNumber(existing.accountNumber || '');
        setDepositIfsc(existing.ifscCode || '');
        setDepositUpiId(existing.upiId || '');
        setDepositQrImageUrl(existing.qrImageUrl || '');
        setDepositNotes(existing.notes || '');
      }
    }
  }, [user, getClientPaymentConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Enforce compulsory deposit payment account assignment upon approving KYC
    if (selectedStatus === 'approved') {
      const hasUpi = depositUpiId.trim().length > 0;
      const hasBank = depositAccountNumber.trim().length > 0 && depositIfsc.trim().length > 0;

      if (!hasUpi && !hasBank) {
        showToast({
          type: 'error',
          title: 'Deposit Account Required',
          message: 'Compulsory: Enter a dedicated UPI ID or Bank Account Details for this client before approving KYC.',
        });
        return;
      }
    }

    setLoading(true);
    try {
      // 1. If approving, save the dedicated per-client deposit routing
      if (selectedStatus === 'approved') {
        const paymentPayload: ClientPaymentConfig = {
          userId: user.id,
          isCustom: true,
          bankName: depositBankName.trim() || 'Assigned Settlement Bank',
          accountHolder: depositAccountHolder.trim() || user.fullName || 'Custody Desk',
          accountNumber: depositAccountNumber.trim(),
          ifscCode: depositIfsc.trim().toUpperCase(),
          upiId: depositUpiId.trim(),
          qrImageUrl: depositQrImageUrl.trim(),
          notes: depositNotes.trim() || 'Assigned during KYC approval',
        };

        const payRes = await setClientPaymentConfig(paymentPayload);
        if (!payRes.success) {
          showToast({
            type: 'error',
            title: 'Deposit Route Failed',
            message: payRes.error || 'Could not save deposit routing for this user.',
          });
          setLoading(false);
          return;
        }
      }

      // 2. Apply KYC verification status
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
        className="w-full max-w-lg my-auto bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-900 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-tight">
                KYC Verification & Deposit Setup
              </h2>
              <p className="text-[11px] text-zinc-500 font-sans">
                Approve client compliance and assign unique deposit bank account
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Card */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto flex-1">
          
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Target Client:</span>
              <strong className="text-zinc-950 dark:text-white font-bold">{user.fullName || 'Unnamed User'}</strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Email:</span>
              <span className="text-zinc-700 dark:text-zinc-300 truncate max-w-[220px]">
                {user.email}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-zinc-200 dark:border-zinc-800">
              <span className="text-zinc-400">Current KYC Status:</span>
              <span className="font-bold uppercase px-2 py-0.5 rounded text-[10px] bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
                {user.kycStatus || 'unverified'}
              </span>
            </div>
          </div>

          {/* Action Choice */}
          <div className="space-y-2">
            <label className="block font-bold text-zinc-950 dark:text-white text-xs">
              Select Verification Action:
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedStatus('approved')}
                className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                  selectedStatus === 'approved'
                    ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white font-bold shadow-xs'
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
                className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                  selectedStatus === 'rejected'
                    ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white font-bold shadow-xs'
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
                className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                  selectedStatus === 'pending'
                    ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white font-bold shadow-xs'
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
                className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                  selectedStatus === 'unverified'
                    ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white font-bold shadow-xs'
                    : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <RotateCcw className="w-4 h-4 shrink-0 text-zinc-400" />
                <div>
                  <div className="font-bold text-xs">Reset Status</div>
                  <div className="text-[10px] opacity-70">Unverified state</div>
                </div>
              </button>
            </div>
          </div>

          {/* COMPULSORY DEPOSIT PAYMENT ACCOUNT ASSIGNMENT (WHEN APPROVING) */}
          {selectedStatus === 'approved' && (
            <div className="p-3.5 sm:p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 space-y-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <div>
                  <h3 className="font-bold text-xs text-blue-950 dark:text-blue-200 uppercase tracking-tight">
                    Dedicated Deposit Payment Route *
                  </h3>
                  <p className="text-[10px] text-blue-700 dark:text-blue-300">
                    Compulsory: Assign the dedicated receiving bank account/UPI for this user (not default).
                  </p>
                </div>
              </div>

              {/* UPI ID (VPA) */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-blue-900 dark:text-blue-200 block">
                  Assigned Deposit UPI ID / VPA *
                </label>
                <input
                  type="text"
                  value={depositUpiId}
                  onChange={(e) => setDepositUpiId(e.target.value)}
                  placeholder="e.g. brokerdesk101@okhdfcbank"
                  className="w-full bg-white dark:bg-zinc-900 border border-blue-200 dark:border-blue-800 rounded-lg p-2 text-xs font-mono text-zinc-950 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Bank Transfer Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-blue-900 dark:text-blue-200 block">
                    Deposit Bank Name
                  </label>
                  <input
                    type="text"
                    value={depositBankName}
                    onChange={(e) => setDepositBankName(e.target.value)}
                    placeholder="e.g. HDFC Bank Ltd"
                    className="w-full bg-white dark:bg-zinc-900 border border-blue-200 dark:border-blue-800 rounded-lg p-2 text-xs text-zinc-950 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-blue-900 dark:text-blue-200 block">
                    Beneficiary Account Holder
                  </label>
                  <input
                    type="text"
                    value={depositAccountHolder}
                    onChange={(e) => setDepositAccountHolder(e.target.value)}
                    placeholder="e.g. Global Forex Custody"
                    className="w-full bg-white dark:bg-zinc-900 border border-blue-200 dark:border-blue-800 rounded-lg p-2 text-xs text-zinc-950 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-blue-900 dark:text-blue-200 block">
                    Deposit Account Number
                  </label>
                  <input
                    type="text"
                    value={depositAccountNumber}
                    onChange={(e) => setDepositAccountNumber(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="e.g. 502000889211"
                    className="w-full bg-white dark:bg-zinc-900 border border-blue-200 dark:border-blue-800 rounded-lg p-2 text-xs font-mono text-zinc-950 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-blue-900 dark:text-blue-200 block">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    value={depositIfsc}
                    onChange={(e) => setDepositIfsc(e.target.value.toUpperCase())}
                    placeholder="e.g. HDFC0001234"
                    className="w-full bg-white dark:bg-zinc-900 border border-blue-200 dark:border-blue-800 rounded-lg p-2 text-xs font-mono uppercase text-zinc-950 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

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
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-950 dark:text-white focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-100"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-900">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="py-2 px-4 rounded-xl bg-[#00875a] text-white hover:bg-[#00704a] font-bold uppercase tracking-wider text-xs transition-all cursor-pointer shadow-xs active:scale-98"
            >
              {loading ? 'Processing…' : selectedStatus === 'approved' ? 'Approve & Save Deposit Route' : 'Apply KYC Status'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
