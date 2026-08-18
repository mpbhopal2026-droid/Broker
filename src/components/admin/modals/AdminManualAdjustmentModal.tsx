'use client';

import React, { useState } from 'react';
import { X, Sliders, Loader2 } from 'lucide-react';
import { useAdmin } from '@/lib/admin-store';
import { formatUSD } from '@/lib/utils';

interface AdminManualAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminManualAdjustmentModal: React.FC<AdminManualAdjustmentModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { users, adjustUserBalance, showToast } = useAdmin();
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id || '');
  const [amount, setAmount] = useState('100');
  const [type, setType] = useState<'credit' | 'debit'>('credit');
  const [reason, setReason] = useState('Operational goodwill adjustment');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const numAmount = parseFloat(amount) || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (numAmount <= 0) {
      showToast({ type: 'error', title: 'Invalid Amount', message: 'Enter a valid amount.' });
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      adjustUserBalance(selectedUserId, type === 'credit' ? numAmount : -numAmount, reason);
      setIsLoading(false);
      onClose();
      showToast({
        type: 'success',
        title: 'Ledger Adjusted',
        message: `${type === 'credit' ? '+' : '-'}${formatUSD(numAmount)} posted to user ledger.`,
      });
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-md my-auto shadow-2xl overflow-hidden animate-scale-in max-h-[94vh] flex flex-col">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Manual Ledger Adjustment</h3>
            <p className="text-[11px] sm:text-xs text-slate-500 font-mono">Audited double-entry balance correction</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Client Account *</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-600"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.email}) — {formatUSD(u.walletBalance)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('credit')}
              className={`py-2.5 rounded-xl font-bold text-xs border transition-all ${
                type === 'credit'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              + Credit Balance
            </button>
            <button
              type="button"
              onClick={() => setType('debit')}
              className={`py-2.5 rounded-xl font-bold text-xs border transition-all ${
                type === 'debit'
                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              - Debit Balance
            </button>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Adjustment Amount ($ USD) *</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
              required
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-600"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Statutory Audit Reason *</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Compensation for platform slippage"
              required
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-600"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl bg-slate-950 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-950 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm mt-2 disabled:opacity-50 active:scale-95"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sliders className="w-4 h-4" />}
            <span>Execute Ledger Correction</span>
          </button>
        </form>
      </div>
    </div>
  );
};
