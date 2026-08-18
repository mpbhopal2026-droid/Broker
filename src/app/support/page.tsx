'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { LifeBuoy, Send, Loader2 } from 'lucide-react';
import { useApp } from '@/lib/store';
import { formatDate } from '@/lib/utils';

const CATEGORIES = [
  { value: 'payment', label: 'Deposit or withdrawal' },
  { value: 'kyc', label: 'Verification' },
  { value: 'account', label: 'Account access' },
  { value: 'bug', label: 'Something is broken' },
  { value: 'other', label: 'Something else' },
];

/**
 * Raise and track support tickets.
 *
 * Linked from the navigation but never built, so the route 404'd — visible in
 * the access log. Tickets were already being created by the API; there was just
 * no way for a client to raise one or see what happened to it.
 */
export default function SupportPage() {
  const { showToast } = useApp();

  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [category, setCategory] = useState('payment');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/support', { credentials: 'same-origin' });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body?.ok !== false) setTickets(body.tickets ?? []);
    } catch {
      /* the form still works without the history */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      showToast({ type: 'error', title: 'Incomplete', message: 'Add a title and describe what happened.' });
      return;
    }

    setSending(true);
    const res = await fetch('/api/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        category,
        subject,
        description,
        pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      }),
    });
    const body = await res.json().catch(() => ({}));
    setSending(false);

    // Report the server's answer, not an assumption.
    if (!res.ok || body?.ok === false) {
      showToast({ type: 'error', title: 'Not sent', message: body?.error || 'Could not raise the ticket.' });
      return;
    }

    setSubject('');
    setDescription('');
    showToast({ type: 'success', title: 'Ticket raised', message: body.message || 'We will get back to you.' });
    void load();
  };

  const field =
    'w-full bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500';

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Support</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Tell us what went wrong and we will look into it.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 space-y-3"
      >
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">What is it about?</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={field}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Title</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Deposit not credited"
            maxLength={160}
            className={field}
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">What happened?</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="Include the date, the amount, and the UTR if it is about a payment."
            maxLength={4000}
            className={field}
          />
        </div>

        <button
          type="submit"
          disabled={sending}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" />
          {sending ? 'Sending…' : 'Raise ticket'}
        </button>
      </form>

      <div className="space-y-2">
        <h2 className="text-xs font-bold text-slate-900 dark:text-white">Your tickets</h2>

        {loading ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <LifeBuoy className="w-6 h-6 text-slate-300 dark:text-slate-700 mx-auto" />
            <p className="text-xs text-slate-500 dark:text-slate-400">You have not raised any tickets.</p>
          </div>
        ) : (
          tickets.map((t) => (
            <div
              key={t.id}
              className="p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 text-xs space-y-1"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-bold text-slate-900 dark:text-white">{t.subject}</span>
                <span className="text-[10px] uppercase font-bold text-slate-500 shrink-0">{t.status}</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{t.description}</p>
              {(t.createdAt || t.created_at) && (
                <p className="text-[10px] text-slate-400">{formatDate(t.createdAt ?? t.created_at)}</p>
              )}
              {t.developer_notes && (
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 pt-1">
                  Reply: {t.developer_notes}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
