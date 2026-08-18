'use client';

import React, { useState, useEffect } from 'react';
import { UserProfile, ClientPaymentConfig } from '@/lib/types';
import { useAdmin } from '@/lib/admin-store';
import { X, CreditCard, QrCode, Building, CheckCircle2, ShieldAlert } from 'lucide-react';

interface AdminClientPaymentConfigModalProps {
  user: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AdminClientPaymentConfigModal: React.FC<AdminClientPaymentConfigModalProps> = ({
  user,
  isOpen,
  onClose,
}) => {
  const { getClientPaymentConfig, setClientPaymentConfig, showToast } = useAdmin();

  const [isCustom, setIsCustom] = useState(false);
  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [upiId, setUpiId] = useState('');
  const [qrImageUrl, setQrImageUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      const existing = getClientPaymentConfig(user.id);
      if (existing) {
        setIsCustom(existing.isCustom);
        setBankName(existing.bankName || '');
        setAccountHolder(existing.accountHolder || '');
        setAccountNumber(existing.accountNumber || '');
        setIfscCode(existing.ifscCode || '');
        setUpiId(existing.upiId || '');
        setQrImageUrl(existing.qrImageUrl || '');
        setNotes(existing.notes || '');
      } else {
        setIsCustom(false);
        setBankName('');
        setAccountHolder(user.fullName || '');
        setAccountNumber('');
        setIfscCode('');
        setUpiId('');
        setQrImageUrl('');
        setNotes('');
      }
    }
  }, [isOpen, user, getClientPaymentConfig]);

  if (!isOpen || !user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const config: ClientPaymentConfig = {
      userId: user.id,
      isCustom,
      bankName: bankName.trim(),
      accountHolder: accountHolder.trim(),
      accountNumber: accountNumber.trim(),
      ifscCode: ifscCode.trim(),
      upiId: upiId.trim(),
      qrImageUrl: qrImageUrl.trim(),
      notes: notes.trim(),
    };

    const res = await setClientPaymentConfig(config);
    setSaving(false);
    if (res.success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-lg my-auto bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-2">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800 font-bold shrink-0">
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                Deposit Account Setup
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                Custom banking for <span className="font-semibold text-slate-800 dark:text-slate-200">{user.fullName}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          
          {/* Custom Route Toggle */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-xs font-bold text-slate-900 dark:text-white">
                Use Dedicated Custom Account
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Override platform default bank with client-specific VIP account.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCustom(!isCustom)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                isCustom ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  isCustom ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {isCustom ? (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bank Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HDFC Bank Ltd"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Account Holder</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Global Forex"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Account Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 50200084920193"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">IFSC Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HDFC0000123"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono uppercase text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Assigned UPI ID</label>
                <input
                  type="text"
                  placeholder="e.g. apex.vip@hdfcbank"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Custom QR Code URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={qrImageUrl}
                  onChange={(e) => setQrImageUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Admin Notes</label>
                <input
                  type="text"
                  placeholder="Internal notes (e.g. VIP client direct routing)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                />
              </div>

            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-1">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Default Platform Payment Route Active
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                This client will see the main company bank account & UPI QR on the deposit screen.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
            >
              {saving ? 'Saving…' : 'Save Deposit Config'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
