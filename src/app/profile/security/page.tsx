'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, LogOut, Monitor, AlertTriangle, Loader2, Check } from 'lucide-react';
import { useApp } from '@/lib/store';
import { formatDate } from '@/lib/utils';

interface SessionRow {
  id: string;
  ipAddress: string;
  device: string;
  createdAt: string;
  lastSeenAt: string;
  active: boolean;
}

/**
 * Account security.
 *
 * Every login-alert email links here with "Sign out all devices", so this page
 * has to exist and that action has to work — the link was previously a 404,
 * which is the worst possible outcome for someone who has just been told their
 * account may be compromised.
 */
export default function SecurityPage() {
  const { currentUser, revokeAllSessions } = useApp();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/me/sessions', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((b) => {
        if (!cancelled) setSessions(b?.sessions ?? []);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const signOutAll = async () => {
    if (!confirm('Sign out of every device, including this one? You will need to sign in again.')) return;
    setBusy(true);
    setError('');
    const result = await revokeAllSessions();
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not sign out other devices.');
      return;
    }
    setDone(true);
    window.location.href = '/login';
  };

  const active = sessions.filter((s) => s.active);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-5">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" aria-hidden="true" />
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Account security</h1>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Signed in as <span className="font-mono">{currentUser?.email}</span>
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">{error}</div>
      )}

      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Where you&apos;re signed in {!loading && `(${active.length})`}
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Loading…
          </div>
        ) : active.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No active sessions found.</div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {active.map((s) => (
              <li key={s.id} className="px-4 py-3 flex items-start gap-3">
                <Monitor className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">{s.device}</p>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {s.ipAddress} · last seen {formatDate(s.lastSeenAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white dark:bg-slate-900 border border-rose-200 rounded-2xl p-4 space-y-3">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Don&apos;t recognise something?
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
              Sign out everywhere immediately. This ends every session including this
              one, so you will be asked to sign in again.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={signOutAll}
          disabled={busy || done}
          className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
          {done && <Check className="w-4 h-4" aria-hidden="true" />}
          {!busy && !done && <LogOut className="w-4 h-4" aria-hidden="true" />}
          {done ? 'Signed out' : busy ? 'Signing out…' : 'Sign out all devices'}
        </button>
      </section>

      <p className="text-[11px] text-slate-400 leading-relaxed">
        We will never ask for your sign-in code by phone, WhatsApp or chat.
        Anyone who does is attempting fraud.
      </p>
    </div>
  );
}
