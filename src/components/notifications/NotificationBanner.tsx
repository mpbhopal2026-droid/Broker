'use client';

import React, { useState, useEffect } from 'react';
import { Bell, X, CheckCircle2, TrendingUp, DollarSign, ShieldCheck, Sparkles } from 'lucide-react';
import { NotificationMessage } from '@/lib/types';

interface NotificationBannerProps {
  notifications: NotificationMessage[];
  onDismiss: (id: string) => void;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  notifications,
  onDismiss,
}) => {
  if (!notifications.length) return null;

  return (
    <div className="fixed top-16 right-4 z-50 max-w-sm w-full space-y-2 pointer-events-none">
      {notifications.slice(0, 3).map((n) => (
        <div
          key={n.id}
          className="pointer-events-auto p-4 rounded-2xl bg-slate-900/95 border border-emerald-500/40 text-white shadow-2xl backdrop-blur-md flex items-start gap-3 animate-fadeIn transition-all"
        >
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
            {n.type === 'deposit' ? (
              <DollarSign className="w-5 h-5" />
            ) : n.type === 'kyc' ? (
              <ShieldCheck className="w-5 h-5" />
            ) : n.type === 'signal' ? (
              <TrendingUp className="w-5 h-5 text-sky-400" />
            ) : (
              <Bell className="w-5 h-5 text-purple-400" />
            )}
          </div>

          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <strong className="text-xs font-bold text-white block">{n.title}</strong>
              <span className="text-[10px] text-slate-400 font-mono">Just now</span>
            </div>
            <p className="text-xs text-slate-300 leading-snug">{n.body}</p>
          </div>

          <button
            onClick={() => onDismiss(n.id)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
