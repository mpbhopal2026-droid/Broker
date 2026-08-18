'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Eye,
  EyeOff,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Clock,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { formatUSD } from '@/lib/utils';
import { MiniSparkline } from '@/components/charts/MiniSparkline';
import { ExactMarketCandleChart } from '@/components/charts/ExactMarketCandleChart';

export default function MonochromeInstitutionalDashboard() {
  const router = useRouter();
  const {
    currentUser,
    marketAssets,
    tradeOrders,
    closeTrade,
    transactions,
  } = useApp();

  const [hideBalance, setHideBalance] = useState(false);
  const [selectedChartSymbol, setSelectedChartSymbol] = useState('XAU/USD');

  // Real Database Balances
  const walletBalance = currentUser?.walletBalance ?? 0;
  const pendingDeposits = transactions
    .filter((t) => t.type === 'deposit' && t.status === 'pending')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalBalance = walletBalance + pendingDeposits;
  const availableBalance = walletBalance;
  const recentTransactions = transactions.slice(0, 5);

  // Top 4 Market Overview Cards
  const marketOverviewCards = React.useMemo(
    () =>
      marketAssets.slice(0, 4).map((a) => ({
        symbol: a.symbol,
        price: a.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 }),
        change: `${a.change >= 0 ? '▲ +' : '▼ -'}${Math.abs(a.changePercent).toFixed(2)}%`,
        isPositive: a.changePercent >= 0,
        sparkline: [a.low24h ?? a.price, a.price, a.high24h ?? a.price],
      })),
    [marketAssets],
  );

  // User Open Positions
  const userOpenTrades = tradeOrders.filter(
    (t) => t.userId === currentUser?.id && t.status === 'OPEN'
  );

  const totalOpenPnl = userOpenTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto select-none">
      
      {/* Top Title & Quick Action Strip */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-lg font-bold font-mono uppercase tracking-tight text-zinc-950 dark:text-white">
            Trading Desk Overview
          </h1>
          <p className="text-[11px] text-zinc-500 font-mono">
            Live institutional FX, metals & indices ledger
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/trade?symbol=XAU/USD"
            className="px-3 py-1.5 rounded-md bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-mono font-bold hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors flex items-center gap-1.5"
          >
            <span>Live Terminal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Main 2-Column Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        
        {/* Left 8-Column Zone */}
        <div className="xl:col-span-8 space-y-4">
          
          {/* Market Overview Top 4 Cards */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold font-mono uppercase text-zinc-400">
                Market Pulse
              </span>
              <Link
                href="/markets"
                className="text-[11px] text-zinc-500 hover:text-zinc-950 dark:hover:text-white font-mono flex items-center gap-1 transition-colors"
              >
                <span>View All Markets</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {/* 4 Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {marketOverviewCards.map((card) => (
                <div
                  key={card.symbol}
                  onClick={() => setSelectedChartSymbol(card.symbol)}
                  className={`bg-white dark:bg-zinc-950 border rounded-md p-3 transition-colors cursor-pointer flex flex-col justify-between ${
                    selectedChartSymbol === card.symbol
                      ? 'border-zinc-950 dark:border-white ring-1 ring-zinc-950 dark:ring-white'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="font-mono font-bold text-xs text-zinc-950 dark:text-white truncate">
                      {card.symbol}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-semibold tabular-nums ${
                        card.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {card.change}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-base font-bold font-mono tabular-nums text-zinc-950 dark:text-white block">
                      ${card.price}
                    </span>
                    <div className="h-4 w-full opacity-60 flex items-center justify-center">
                      <MiniSparkline
                        data={card.sparkline}
                        isPositive={card.isPositive}
                        width={100}
                        height={16}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Chart Section */}
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md p-3.5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-zinc-100 dark:border-zinc-900">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-sm font-bold text-zinc-950 dark:text-white">
                  {selectedChartSymbol}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800">
                  Live Feed
                </span>
              </div>
              <button
                onClick={() => router.push(`/trade?symbol=${encodeURIComponent(selectedChartSymbol)}`)}
                className="px-2.5 py-1 rounded-md bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-mono font-bold hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors self-start sm:self-auto"
              >
                Trade {selectedChartSymbol} →
              </button>
            </div>

            <div className="w-full min-h-[340px]">
              <ExactMarketCandleChart
                selectedSymbol={selectedChartSymbol}
                onSymbolChange={setSelectedChartSymbol}
              />
            </div>
          </div>

          {/* High-Density Open Positions Table */}
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md p-3.5 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-900">
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-zinc-400" />
                <h3 className="text-xs font-mono font-bold uppercase text-zinc-950 dark:text-white">
                  Active Positions ({userOpenTrades.length})
                </h3>
              </div>
              <Link href="/orders" className="text-[11px] text-zinc-500 hover:text-zinc-950 dark:hover:text-white font-mono">
                View All
              </Link>
            </div>

            {userOpenTrades.length === 0 ? (
              <div className="py-8 text-center space-y-1">
                <p className="text-xs text-zinc-500 font-mono">No active positions open</p>
                <p className="text-[10px] text-zinc-400 font-mono">Open live contracts from the Trading Desk</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="text-zinc-400 text-[10px] uppercase font-bold border-b border-zinc-100 dark:border-zinc-900">
                      <th className="py-2 px-2">Symbol</th>
                      <th className="py-2 px-2">Side</th>
                      <th className="py-2 px-2">Lots</th>
                      <th className="py-2 px-2">Entry</th>
                      <th className="py-2 px-2 text-right">P&L</th>
                      <th className="py-2 px-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                    {userOpenTrades.slice(0, 5).map((trade) => (
                      <tr key={trade.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition-colors">
                        <td className="py-2 px-2 font-bold text-zinc-950 dark:text-white">{trade.symbol}</td>
                        <td className="py-2 px-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            trade.type === 'BUY' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' : 'text-rose-600 dark:text-rose-400 bg-rose-500/10'
                          }`}>
                            {trade.type}
                          </span>
                        </td>
                        <td className="py-2 px-2 tabular-nums text-zinc-700 dark:text-zinc-300">{trade.lotSize}</td>
                        <td className="py-2 px-2 tabular-nums text-zinc-700 dark:text-zinc-300">{trade.entryPrice.toFixed(2)}</td>
                        <td className={`py-2 px-2 text-right font-bold tabular-nums ${(trade.pnl || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {(trade.pnl || 0) >= 0 ? `+$${trade.pnl?.toFixed(2)}` : `-$${Math.abs(trade.pnl || 0).toFixed(2)}`}
                        </td>
                        <td className="py-2 px-2 text-right">
                          <button
                            onClick={() => closeTrade(trade.id)}
                            className="px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300 transition-colors"
                          >
                            Close
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-zinc-200 dark:border-zinc-800 font-bold">
                    <tr>
                      <td colSpan={4} className="py-2 px-2 text-zinc-950 dark:text-white">Floating P&L</td>
                      <td className={`py-2 px-2 text-right tabular-nums ${totalOpenPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {totalOpenPnl >= 0 ? `+$${totalOpenPnl.toFixed(2)}` : `-$${Math.abs(totalOpenPnl).toFixed(2)}`}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* Right 4-Column Zone (Summary Cards) */}
        <div className="xl:col-span-4 space-y-4">
          
          {/* 1. Account Summary Card */}
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md p-4 space-y-3">
            
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold font-mono uppercase text-zinc-400">
                Capital Ledger
              </span>
              <button
                onClick={() => setHideBalance(!hideBalance)}
                className="text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors"
                title={hideBalance ? 'Show balance' : 'Hide balance'}
              >
                {hideBalance ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Total Balance */}
            <div className="space-y-0.5">
              <span className="text-[11px] text-zinc-500 font-mono block">Net Equity</span>
              <div className="text-2xl font-bold font-mono tabular-nums text-zinc-950 dark:text-white tracking-tight">
                {hideBalance ? '••••••••' : formatUSD(totalBalance)}
              </div>
              <div className="text-[11px] font-mono font-semibold tabular-nums text-zinc-500">
                Floating: <span className={totalOpenPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                  {totalOpenPnl !== 0 ? `${totalOpenPnl >= 0 ? '▲ +' : '▼ -'}${formatUSD(Math.abs(totalOpenPnl))}` : '$0.00'}
                </span>
              </div>
            </div>

            {/* Split Metrics */}
            <div className="grid grid-cols-2 gap-2 py-2.5 border-t border-b border-zinc-100 dark:border-zinc-900 text-xs font-mono">
              <div>
                <span className="text-[10px] text-zinc-400 block uppercase">Available</span>
                <span className="font-bold tabular-nums text-zinc-950 dark:text-white">
                  {hideBalance ? '••••' : formatUSD(availableBalance)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block uppercase">In Clearing</span>
                <span className="font-bold tabular-nums text-zinc-400">
                  {hideBalance ? '••••' : formatUSD(pendingDeposits)}
                </span>
              </div>
            </div>

            {/* High-Contrast Solid Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                onClick={() => router.push('/funds?tab=deposit')}
                className="w-full py-2 rounded-md bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-xs font-mono font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Deposit Funds</span>
              </button>

              <button
                onClick={() => router.push('/funds?tab=withdraw')}
                className="w-full py-2 rounded-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 text-xs font-mono font-semibold transition-colors"
              >
                Withdrawal Payout
              </button>
            </div>

          </div>

          {/* 2. Recent Ledger Transactions Card */}
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md p-4 space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-900">
              <span className="text-[10px] font-bold font-mono uppercase text-zinc-400">
                Recent Settlement Logs
              </span>
              <Link href="/funds" className="text-[10px] text-zinc-500 hover:text-zinc-950 dark:hover:text-white font-mono">
                View All
              </Link>
            </div>

            <div className="space-y-1.5 text-xs font-mono">
              {recentTransactions.length === 0 ? (
                <div className="py-4 text-center text-[11px] text-zinc-400">
                  No recent ledger activity
                </div>
              ) : (
                recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-1.5 border-b border-zinc-50 dark:border-zinc-900/50 last:border-0">
                    <div>
                      <p className="font-bold text-zinc-950 dark:text-white capitalize">
                        {tx.type} {tx.paymentMode ? `(${tx.paymentMode})` : ''}
                      </p>
                      <p className="text-[10px] text-zinc-400">
                        {new Date(tx.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-bold tabular-nums text-zinc-950 dark:text-white">
                        {tx.type === 'deposit' ? '+' : '-'}${tx.amount.toFixed(2)}
                      </p>
                      <span className="text-[9px] uppercase font-bold text-zinc-500">
                        {tx.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 3. Account Verification Badge Card */}
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md p-4 space-y-2 text-xs font-mono">
            <span className="text-[10px] font-bold uppercase text-zinc-400 block pb-1 border-b border-zinc-100 dark:border-zinc-900">
              Account Governance
            </span>
            
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">KYC Status</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800">
                {currentUser?.kycStatus === 'approved' ? 'Verified' : currentUser?.kycStatus === 'pending' ? 'Under Review' : 'Pending KYC'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Account Classification</span>
              <span className="font-bold text-zinc-950 dark:text-white">
                {currentUser?.role === 'admin' ? 'Operator' : 'Institutional FX'}
              </span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
