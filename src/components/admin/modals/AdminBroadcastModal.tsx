'use client';

import React, { useState } from 'react';
import { X, Send, Loader2, Megaphone } from 'lucide-react';
import { useAdmin } from '@/lib/admin-store';

interface AdminBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminBroadcastModal: React.FC<AdminBroadcastModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useAdmin();
  const [title, setTitle] = useState('Market Volatility Alert');
  const [message, setMessage] = useState('High volatility expected during upcoming US FOMC rate statement.');
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
        title: 'Broadcast Sent',
        message: 'Notification dispatched to all active client devices.',
      });
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-md my-auto shadow-2xl overflow-hidden animate-scale-in max-h-[94vh] flex flex-col">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Send Announcement</h3>
            <p className="text-[11px] sm:text-xs text-slate-500 font-mono">Broadcast notification to all traders</p>
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
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Headline *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-600"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Announcement Body *</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              required
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-600"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl bg-slate-950 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-950 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm mt-2 disabled:opacity-50 active:scale-95"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
            <span>Broadcast Announcement</span>
          </button>
        </form>
      </div>
    </div>
  );
};
