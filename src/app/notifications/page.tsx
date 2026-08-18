'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link?: string | null;
  priority?: string;
  read_at?: string | null;
  createdAt?: string;
  created_at?: string;
}

/**
 * The client's notification feed.
 *
 * This page was linked from the navigation but never existed, so every tap
 * landed on a 404 — the route shows up as such in the access log. The API and
 * the table were already in place; only the screen was missing.
 */
export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=50', { credentials: 'same-origin' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.ok === false) {
        setError(body?.error || 'Could not load your notifications.');
        return;
      }
      setItems(body.notifications ?? []);
      setError('');
    } catch {
      setError('Network error. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const markAllRead = async () => {
    // Optimistic: the list is read-only information, so a failed write costs
    // nothing worse than a badge that reappears on refresh.
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ all: true }),
    }).catch(() => {});
  };

  const unread = items.filter((n) => !n.read_at).length;

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Notifications
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Deposits, withdrawals and verification updates.
          </p>
        </div>
        {unread > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
        </div>
      ) : error ? (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center space-y-2">
          <Bell className="w-6 h-6 text-slate-300 dark:text-slate-700 mx-auto" />
          <p className="text-xs text-slate-500 dark:text-slate-400">You have no notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const when = n.createdAt ?? n.created_at;
            const row = (
              <div
                className={`p-4 rounded-2xl border text-xs transition-colors ${
                  n.read_at
                    ? 'bg-white dark:bg-[#0f172a] border-slate-200 dark:border-slate-800'
                    : 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="font-bold text-slate-900 dark:text-white">{n.title}</span>
                  {when && (
                    <span className="text-[10px] text-slate-400 shrink-0">{formatDate(when)}</span>
                  )}
                </div>
                <p className="text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{n.body}</p>
              </div>
            );

            return n.link ? (
              <Link key={n.id} href={n.link} className="block">
                {row}
              </Link>
            ) : (
              <div key={n.id}>{row}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
