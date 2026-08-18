'use client';

import React, { useState, useEffect } from 'react';
import { Lock, Shield, Search, Download } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function AdminAuditLogsPage() {
  // These entries used to be hardcoded. A fabricated audit trail is worse than
  // no audit trail: it is the record you would hand a regulator to show who
  // approved what, and every line of it was invented. Now read from the real
  // append-only audit_logs table.
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/admin/audit-logs?limit=200', { credentials: 'same-origin' });
        const body = await res.json();
        setLogs(
          (body?.logs ?? []).map((r: any) => ({
            id: r.id,
            timestamp: r.timestamp,
            user: r.actorName,
            userEmail: r.actorEmail,
            userRole: r.actorRole,
            action: r.eventType,
            details: r.metadata ? JSON.stringify(r.metadata) : '',
            ip: r.ipAddress ?? '',
          })),
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6 max-w-5xl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase font-mono font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
              CERT-In Statutory 180-Day Immutable Log
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Security & Dealing Desk Audit Logs
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Traceable system audit trail of every login, trade execution, deposit confirmation, and balance adjustment.
          </p>
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-xl bg-white dark:bg-[#0d121c] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 dark:bg-[#080d14] text-slate-500 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase font-sans">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action Event</th>
                <th className="py-3 px-4">Details</th>
                <th className="py-3 px-4 text-right">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                  <td className="py-3.5 px-4 text-slate-400 text-[11px]">{formatDate(log.timestamp)}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white font-sans">{log.user}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px]">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-sans text-xs">{log.details}</td>
                  <td className="py-3.5 px-4 text-slate-400 text-right">{log.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
