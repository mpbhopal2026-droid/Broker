'use client';

import React from 'react';
import Link from 'next/link';
import { Briefcase, ArrowUpRight, TrendingUp, Plus, ArrowDownRight, XCircle } from 'lucide-react';
import { useApp } from '@/lib/store';
import { formatUSD, formatINR, formatDate } from '@/lib/utils';

export default function PortfolioPage() {
  const { currentUser, tradeOrders, closeTrade, paymentSettings } = useApp();

  const userTrades = tradeOrders.filter((t) => t.userId === currentUser?.id);
  const openTrades = userTrades.filter((t) => t.status === 'OPEN');
  const closedTrades = userTrades.filter((t) => t.status === 'CLOSED');

  const openPnl = openTrades.reduce((acc, t) => acc + t.pnl, 0);
  const openMargin = openTrades.reduce((acc, t) => acc + t.margin, 0);
  const totalEquity = (currentUser?.walletBalance || 0) + openMargin + openPnl;

  return (
    <div className="space-y-5 max-w-5xl">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Portfolio
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time equity valuation, active open positions, and closed trade history.
          </p>
        </div>

        <Link
          href="/markets"
          className="px-3.5 py-2 rounded-xl bg-slate-950 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Position</span>
        </Link>
      </div>

      {/* Equity & P&L Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">Total Account Equity</span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {formatUSD(totalEquity)}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
            ≈ {formatINR(totalEquity * paymentSettings.usdToInrRate)}
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">Today's Floating P&L</span>
          <div className={`text-2xl sm:text-3xl font-black ${openPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {openPnl >= 0 ? '+' : ''}{formatUSD(openPnl)}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
            {openTrades.length} Active Position{openTrades.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Open Positions Card Section */}
      <div className="rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
        <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            Open Positions ({openTrades.length})
          </h2>
        </div>

        {openTrades.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500">
            No active positions open.
          </div>
        ) : (
          <>
            {/* Mobile Card Layout (sm:hidden) */}
            <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800 p-2 space-y-2">
              {openTrades.map((t) => {
                const isProfit = t.pnl >= 0;
                return (
                  <div key={t.id} className="p-3 bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-bold text-slate-900 dark:text-white">{t.symbol}</strong>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.type === 'BUY' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                        }`}>
                          {t.type} {t.lotSize}L
                        </span>
                      </div>
                      <div className={`text-right font-bold text-sm ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {isProfit ? '+' : ''}${t.pnl.toFixed(2)}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Entry Price</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">${t.entryPrice.toLocaleString()}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Current Price</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">${t.currentPrice.toLocaleString()}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => closeTrade(t.id)}
                      className="w-full py-2 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold text-xs shadow-2xs transition-colors"
                    >
                      Close Position
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (hidden sm:block) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase font-sans">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Instrument</th>
                    <th className="py-2.5 px-4 font-semibold">Side</th>
                    <th className="py-2.5 px-4 font-semibold">Size</th>
                    <th className="py-2.5 px-4 font-semibold">Entry</th>
                    <th className="py-2.5 px-4 font-semibold">Current</th>
                    <th className="py-2.5 px-4 font-semibold">P&L</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {openTrades.map((t) => {
                    const isProfit = t.pnl >= 0;
                    return (
                      <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{t.symbol}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            t.type === 'BUY' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                          }`}>
                            {t.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{t.lotSize} lot</td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">${t.entryPrice.toLocaleString()}</td>
                        <td className="py-3 px-4 text-slate-900 dark:text-white font-bold">${t.currentPrice.toLocaleString()}</td>
                        <td className="py-3 px-4 font-bold">
                          <span className={isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                            {isProfit ? '+' : ''}${t.pnl.toFixed(2)} ({isProfit ? '+' : ''}{t.pnlPercentage}%)
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => closeTrade(t.id)}
                            className="px-3 py-1 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors"
                          >
                            Close
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Closed Trades / History Section */}
      <div className="rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
        <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            Closed Trades History ({closedTrades.length})
          </h2>
        </div>

        {closedTrades.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500">
            No closed trades on record.
          </div>
        ) : (
          <>
            {/* Mobile View */}
            <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800 p-2 space-y-2">
              {closedTrades.map((t) => {
                const isProfit = t.pnl >= 0;
                return (
                  <div key={t.id} className="p-3 bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-bold text-slate-900 dark:text-white">{t.symbol}</strong>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.type === 'BUY' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                        }`}>
                          {t.type}
                        </span>
                      </div>
                      <div className={`font-bold text-xs ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {isProfit ? '+' : ''}${t.pnl.toFixed(2)} USD
                      </div>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{formatDate(t.closedAt || t.openedAt)}</span>
                      <span>Entry: ${t.entryPrice.toLocaleString()} → Exit: ${t.exitPrice?.toLocaleString() || t.currentPrice.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase font-sans">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Date</th>
                    <th className="py-2.5 px-4 font-semibold">Instrument</th>
                    <th className="py-2.5 px-4 font-semibold">Side</th>
                    <th className="py-2.5 px-4 font-semibold">Entry</th>
                    <th className="py-2.5 px-4 font-semibold">Exit</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Realized Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {closedTrades.map((t) => {
                    const isProfit = t.pnl >= 0;
                    return (
                      <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-xs">{formatDate(t.closedAt || t.openedAt)}</td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{t.symbol}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            t.type === 'BUY' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                          }`}>
                            {t.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">${t.entryPrice.toLocaleString()}</td>
                        <td className="py-3 px-4 text-slate-900 dark:text-white font-bold">${t.exitPrice?.toLocaleString() || t.currentPrice.toLocaleString()}</td>
                        <td className="py-3 px-4 font-bold text-right">
                          <span className={isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                            {isProfit ? '+' : ''}${t.pnl.toFixed(2)} USD
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

    </div>
  );
}
