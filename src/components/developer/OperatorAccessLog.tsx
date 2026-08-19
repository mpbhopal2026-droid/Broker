'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Radio, Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';

/**
 * Where staff and admin accounts have signed in from.
 *
 * Scope is deliberate and enforced in the database view, not here: only
 * admin, staff and developer sessions are returned. Client sessions live in the
 * same table and are never surfaced.
 *
 * Logging where your own staff access an administrative system is ordinary
 * security practice — it is how you notice a shared password or a login from
 * somewhere nobody works. Building the same picture of your customers is a
 * different thing entirely, and the column existing is not a reason to read it.
 *
 * Location comes from Vercel and Cloudflare edge headers, not an IP-geolocation
 * service: asking a third party where each operator is would create the very
 * exposure this is meant to help you spot. It is reliable at country level,
 * fair at city, and wrong on a VPN — enough to answer "does this login look
 * like the others?" and not enough to place someone at an address.
 */
export function OperatorAccessLog() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/developer?view=sessions&limit=200', {
        credentials: 'same-origin',
      });
      const body = await res.json().catch(() => ({}));
      setSessions(body.sessions ?? []);
      setNote(body.note ?? '');
    } catch {
      setNote('Could not load operator sessions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const location = (s: any) =>
    [s.geo_city, s.geo_region, s.geo_country].filter(Boolean).join(', ') || 'Location unknown';

  return (
    <div className="space-y-2">
      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
        Sign-ins by <strong>admin, staff and developer</strong> accounts only — client sessions are
        deliberately excluded. Location is approximate, derived from edge headers rather than an IP
        lookup, and will be wrong on a VPN.
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="py-12 text-center space-y-2">
          <Radio className="w-6 h-6 text-slate-300 dark:text-slate-700 mx-auto" />
          <p className="text-xs text-slate-500">
            {note || 'No operator sessions recorded yet.'}
          </p>
        </div>
      ) : (
        sessions.map((s) => (
          <div
            key={s.id}
            className={`p-3.5 rounded-xl border text-xs ${
              s.is_active
                ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60'
                : 'bg-white dark:bg-[#0f172a] border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-900 dark:text-white">
                    {s.full_name || s.email}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {s.role}
                  </span>
                  {/* A live session from an unexpected place is the thing this
                      screen exists to make obvious, so state is shown first. */}
                  {s.is_active ? (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                      live
                    </span>
                  ) : s.revoked_at ? (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-rose-500/15 text-rose-600 dark:text-rose-400">
                      revoked
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-200 dark:bg-slate-800 text-slate-500">
                      expired
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-500 font-mono truncate">{s.email}</div>
              </div>

              <div className="text-right shrink-0">
                <div className="font-bold text-slate-900 dark:text-white">{location(s)}</div>
                <div className="text-[10px] text-slate-400 font-mono">{s.ip_address || 'no ip'}</div>
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] text-slate-500">
              <div>
                <span className="block text-slate-400 uppercase tracking-wide">Signed in</span>
                {s.signed_in_at ? formatDate(s.signed_in_at) : '—'}
              </div>
              <div>
                <span className="block text-slate-400 uppercase tracking-wide">Last seen</span>
                {s.last_seen_at ? formatDate(s.last_seen_at) : '—'}
              </div>
              <div className="col-span-2 sm:col-span-1 min-w-0">
                <span className="block text-slate-400 uppercase tracking-wide">Device</span>
                <span className="truncate block">{(s.user_agent || 'unknown').slice(0, 60)}</span>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
