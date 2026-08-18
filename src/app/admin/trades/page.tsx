'use client';

import React, { useState } from 'react';
import { Activity, Lock, AlertTriangle, TrendingUp, User } from 'lucide-react';
import { useAdmin } from '@/lib/admin-store';
import { formatUSD, formatDate } from '@/lib/utils';

export default function AdminTradesPage() {
  const { tradeOrders } = useAdmin();
  const [tab, setTab] = useState<'open' | 'closed'>('open');

  const openTrades = tradeOrders.filter((t) => t.status === 'OPEN');
  const closedTrades = tradeOrders.filter((t) => t.status === 'CLOSED');
  const rows = tab === 'open' ? openTrades : closedTrades;

  return (
    <div className="p-3 sm:p-6 space-y-5 max-w-5xl">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Positions & Risk Desk</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Institutional overview of active client market positions and open P&L.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold">
          <Lock className="w-3 h-3" aria-hidden="true" />
          Live Feed
        </span>
      </div>

      <div className="flex items-center gap-2">
        {(['open', 'closed'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
              tab === t
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'bg-white dark:bg-[#0d121c] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
            }`}
          >
            {t === 'open' ? `Open Positions (${openTrades.length})` : `Closed Trades (${closedTrades.length})`}
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-white dark:bg-[#0d121c] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {rows.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 font-mono">
            No {tab} positions currently on record.
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((t) => (
                <div key={t.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{t.symbol}</strong>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${
                            t.type === 'BUY'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          {t.type} {t.lotSize ? `${t.lotSize}L` : ''}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-sans mt-0.5">{t.userFullName || 'Client'}</p>
                    </div>

                    <div className="text-right font-mono">
                      <div className="text-[10px] text-slate-400">P&L (USD)</div>
                      <div className={`text-xs sm:text-sm font-bold ${t.pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {t.pnl >= 0 ? '+' : ''}{formatUSD(t.pnl)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[10px] font-mono text-slate-400">
                    <span>Entry: {t.entryPrice} · Margin: {formatUSD(t.margin)}</span>
                    <span>{formatDate(t.openedAt)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs font-mono text-left">
                <thead className="bg-slate-50 dark:bg-[#080d14] border-b border-slate-200 dark:border-slate-800 text-slate-500 text-[11px] uppercase font-sans">
                  <tr>
                    <th className="p-3 font-semibold">Client</th>
                    <th className="p-3 font-semibold">Instrument</th>
                    <th className="p-3 font-semibold">Side</th>
                    <th className="text-right p-3 font-semibold">Margin</th>
                    <th className="text-right p-3 font-semibold">Entry</th>
                    <th className="text-right p-3 font-semibold">P&amp;L</th>
                    <th className="text-right p-3 font-semibold">Opened</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {rows.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                      <td className="p-3 text-slate-900 dark:text-white font-medium font-sans">{t.userFullName ?? '—'}</td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">{t.symbol}</td>
                      <td className="p-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            t.type === 'BUY'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          {t.type}
                        </span>
                      </td>
                      <td className="p-3 text-right text-slate-700 dark:text-slate-300">{formatUSD(t.margin)}</td>
                      <td className="p-3 text-right text-slate-700 dark:text-slate-300">{t.entryPrice}</td>
                      <td
                        className={`p-3 text-right font-bold ${
                          t.pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {t.pnl >= 0 ? '+' : ''}
                        {formatUSD(t.pnl)}
                      </td>
                      <td className="p-3 text-right text-slate-400 text-[11px] font-sans">{formatDate(t.openedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
