'use client';

import React, { useState } from 'react';
import { X, Wallet, Loader2, ArrowRight } from 'lucide-react';
import { useAdmin } from '@/lib/admin-store';
import { formatUSD } from '@/lib/utils';

interface AdminWalletWithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminWalletWithdrawModal: React.FC<AdminWalletWithdrawModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { showToast } = useAdmin();
  const [amount, setAmount] = useState('5000');
  const [bankAccount, setBankAccount] = useState('50200084920194');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onClose();
      showToast({
        type: 'success',
        title: 'Commission Dispatched',
        message: `Withdrew ${formatUSD(parseFloat(amount) || 0)} from Admin Commission Balance to primary broker bank.`,
      });
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-in">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Withdraw Admin Commission</h3>
            <p className="text-xs text-slate-500">Transfer revenue to corporate bank</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Commission Balance</span>
            <span className="text-xl font-black font-mono text-slate-900">$12,450.00</span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Withdrawal Amount ($ USD) *</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              max="12450"
              min="100"
              required
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-400"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Corporate Bank Account Number</label>
            <input
              type="text"
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-400"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-lg bg-[#5454e6] hover:bg-[#4343d6] text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm mt-2 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
            <span>Withdraw Commission</span>
          </button>
        </form>
      </div>
    </div>
  );
};
