'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowUpDown, Clock, CheckCircle2, XCircle, Plus, ChevronRight } from 'lucide-react';
import { useApp } from '@/lib/store';
import { formatDate } from '@/lib/utils';

export default function OrdersPage() {
  const { currentUser, tradeOrders, closeTrade } = useApp();
  const [tab, setTab] = useState<'open' | 'history'>('open');

  const userTrades = tradeOrders.filter((t) => t.userId === currentUser?.id);
  const openOrders = userTrades.filter((t) => t.status === 'OPEN' || t.status === 'PENDING');
  const orderHistory = userTrades.filter((t) => t.status === 'CLOSED' || t.status === 'CANCELLED');

  return (
    <div className="space-y-5 max-w-5xl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Orders
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Track active working orders and review historical order executions.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 sm:flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setTab('open')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
              tab === 'open'
                ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Open ({openOrders.length})
          </button>
          <button
            onClick={() => setTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
              tab === 'history'
                ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            History ({orderHistory.length})
          </button>
        </div>
      </div>

      {/* Orders Content Section */}
      <div className="rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
        {tab === 'open' ? (
          openOrders.length === 0 ? (
            <div className="p-10 sm:p-12 text-center text-xs text-slate-400 dark:text-slate-500 space-y-3">
              <p>No open orders running right now.</p>
              <Link
                href="/markets"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-950 dark:bg-emerald-600 text-white font-bold text-xs shadow-2xs hover:bg-slate-800 dark:hover:bg-emerald-500 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Place New Order</span>
              </Link>
            </div>
          ) : (
            <>
              {/* Mobile Cards (sm:hidden) */}
              <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800 p-2 space-y-2">
                {openOrders.map((order) => (
                  <div key={order.id} className="p-3 bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-bold text-slate-900 dark:text-white">{order.symbol}</strong>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          order.type === 'BUY' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                        }`}>
                          {order.type} {order.lotSize}L
                        </span>
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">${order.entryPrice.toLocaleString()}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800 text-xs">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">P&L: ${(order.pnl || 0).toFixed(2)}</span>
                      <button
                        type="button"
                        onClick={() => closeTrade(order.id)}
                        className="px-3 py-1 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold text-xs rounded-lg shadow-2xs transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table (hidden sm:block) */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase font-sans">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Instrument</th>
                      <th className="py-3 px-4 font-semibold">Side</th>
                      <th className="py-3 px-4 font-semibold">Lot Size</th>
                      <th className="py-3 px-4 font-semibold">Execution Price</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {openOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{order.symbol}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            order.type === 'BUY' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                          }`}>
                            {order.type}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">{order.lotSize}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">${order.entryPrice.toLocaleString()}</td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => closeTrade(order.id)}
                            className="px-3 py-1 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors"
                          >
                            Close
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )
        ) : (
          orderHistory.length === 0 ? (
            <div className="p-10 sm:p-12 text-center text-xs text-slate-400 dark:text-slate-500">
              No historical orders recorded yet.
            </div>
          ) : (
            <>
              {/* Mobile History Cards */}
              <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800 p-2 space-y-2">
                {orderHistory.map((order) => (
                  <div key={order.id} className="p-3 bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-bold text-slate-900 dark:text-white">{order.symbol}</strong>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          order.type === 'BUY' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                        }`}>
                          {order.type}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">${order.entryPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{formatDate(order.closedAt || order.openedAt)}</span>
                      <span>Result: ${(order.pnl || 0).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop History Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase font-sans">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Date</th>
                      <th className="py-3 px-4 font-semibold">Instrument</th>
                      <th className="py-3 px-4 font-semibold">Side</th>
                      <th className="py-3 px-4 font-semibold">Lot Size</th>
                      <th className="py-3 px-4 font-semibold">Entry Price</th>
                      <th className="py-3 px-4 font-semibold text-right">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {orderHistory.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-xs">{formatDate(order.closedAt || order.openedAt)}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{order.symbol}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            order.type === 'BUY' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                          }`}>
                            {order.type}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">{order.lotSize}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">${order.entryPrice.toLocaleString()}</td>
                        <td className="py-3.5 px-4 font-bold text-right">
                          ${(order.pnl || 0).toFixed(2)} USD
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )
        )}
      </div>

    </div>
  );
}
