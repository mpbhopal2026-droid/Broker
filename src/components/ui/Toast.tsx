'use client';

import React from 'react';
import { useApp } from '@/lib/store';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export const GlobalToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (!toasts || toasts.length === 0) return null;

  // Maximum 3 toasts visible at any time
  const visibleToasts = toasts.slice(-3);

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2rem)] sm:w-88 pointer-events-none select-none">
      {visibleToasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-2xl bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md border shadow-2xl flex items-start gap-3 transition-all animate-in fade-in slide-in-from-bottom-3 duration-250 ${
              isSuccess
                ? 'border-emerald-500/30 dark:border-emerald-500/40 text-emerald-950 dark:text-emerald-50'
                : isError
                ? 'border-rose-500/30 dark:border-rose-500/40 text-rose-950 dark:text-rose-50'
                : isWarning
                ? 'border-amber-500/30 dark:border-amber-500/40 text-amber-950 dark:text-amber-50'
                : 'border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100'
            }`}
          >
            {/* Icon Box */}
            <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
              isSuccess
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : isError
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                : isWarning
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
            }`}>
              {isSuccess && <CheckCircle2 className="w-4 h-4" />}
              {isError && <AlertCircle className="w-4 h-4" />}
              {isWarning && <AlertTriangle className="w-4 h-4" />}
              {toast.type === 'info' && <Info className="w-4 h-4" />}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-0.5">
              <h4 className="text-xs font-bold leading-tight text-slate-900 dark:text-white truncate">
                {toast.title}
              </h4>
              {toast.message && (
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  {toast.message}
                </p>
              )}
            </div>

            {/* Dismiss Button */}
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
