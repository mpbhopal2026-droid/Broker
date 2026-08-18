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
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { formatUSD } from '@/lib/utils';
import { MiniSparkline } from '@/components/charts/MiniSparkline';
import { ExactMarketCandleChart } from '@/components/charts/ExactMarketCandleChart';

export default function FormalWhiteDashboard() {
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
        change: `${a.change >= 0 ? '+' : ''}${a.change.toFixed(2)} (${a.changePercent >= 0 ? '+' : ''}${a.changePercent.toFixed(2)}%)`,
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
    <div className="space-y-6 max-w-[1400px] mx-auto select-none">
      
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Home</h1>
      </div>

      {/* Main 2-Column Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Left 8-Column Zone */}
        <div className="xl:col-span-8 space-y-6">
          
          {/* Market Overview Top Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Market Overview</h2>
              <Link
                href="/markets"
                className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold flex items-center gap-1 transition-colors"
              >
                <span>View All Markets</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* 4 Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {marketOverviewCards.map((card) => (
                <div
                  key={card.symbol}
                  onClick={() => setSelectedChartSymbol(card.symbol)}
                  className={`bg-white dark:bg-[#0f172a] border rounded-2xl p-4 transition-all cursor-pointer shadow-2xs hover:shadow-xs flex flex-col justify-between min-w-0 overflow-hidden ${
                    selectedChartSymbol === card.symbol
                      ? 'border-slate-900 dark:border-white ring-1 ring-slate-900 dark:ring-white'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-white truncate font-mono">
                      {card.symbol}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono shrink-0 ${
                        card.isPositive
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                          : 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                      }`}
                    >
                      {card.change}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-lg font-black text-slate-900 dark:text-white font-mono tracking-tight block">
                      ${card.price}
                    </span>
                    <div className="h-6 w-full opacity-80 flex items-center justify-center">
                      <MiniSparkline
                        data={card.sparkline}
                        isPositive={card.isPositive}
                        width={120}
                        height={24}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Chart Section */}
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="font-mono text-base font-bold text-slate-900 dark:text-white">
                  {selectedChartSymbol}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  Live Feed
                </span>
              </div>
              <button
                onClick={() => router.push(`/trade?symbol=${encodeURIComponent(selectedChartSymbol)}`)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-2xs self-start sm:self-auto"
              >
                Trade {selectedChartSymbol}
              </button>
            </div>

            <div className="w-full">
              <ExactMarketCandleChart
                selectedSymbol={selectedChartSymbol}
                onSymbolChange={setSelectedChartSymbol}
              />
            </div>
          </div>

          {/* Bottom Grid: Open Positions */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-12 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Open Positions</h3>
                <Link href="/orders" className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold">
                  View All ({userOpenTrades.length})
                </Link>
              </div>

              {userOpenTrades.length === 0 ? (
                <div className="py-8 text-center space-y-1">
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400">No open positions</p>
                  <p className="text-[11px] text-slate-400">Open a position from the Live Trading Desk</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-400 font-medium border-b border-slate-100 dark:border-slate-800">
                        <th className="pb-2">Symbol</th>
                        <th className="pb-2">Side</th>
                        <th className="pb-2">Lots</th>
                        <th className="pb-2">Open</th>
                        <th className="pb-2 text-right">P&L</th>
                        <th className="pb-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                      {userOpenTrades.slice(0, 4).map((trade) => (
                        <tr key={trade.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-2.5 font-bold text-slate-900 dark:text-white">{trade.symbol}</td>
                          <td className="py-2.5">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${trade.type === 'BUY' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                              {trade.type}
                            </span>
                          </td>
                          <td className="py-2.5 text-slate-600 dark:text-slate-300">{trade.lotSize}</td>
                          <td className="py-2.5 text-slate-600 dark:text-slate-300">{trade.entryPrice.toFixed(2)}</td>
                          <td className={`py-2.5 text-right font-bold ${(trade.pnl || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {(trade.pnl || 0) >= 0 ? `+$${trade.pnl?.toFixed(2)}` : `-$${Math.abs(trade.pnl || 0).toFixed(2)}`}
                          </td>
                          <td className="py-2.5 text-right font-sans">
                            <button
                              onClick={() => closeTrade(trade.id)}
                              className="text-[11px] text-slate-500 hover:text-rose-600 font-semibold"
                            >
                              Close
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-slate-100 dark:border-slate-800">
                      <tr>
                        <td colSpan={5} className="pt-3 font-bold text-slate-900 dark:text-white font-sans">Total P&L</td>
                        <td className="pt-3 text-right font-black text-emerald-600 dark:text-emerald-400 text-sm font-mono">+${totalOpenPnl.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right 4-Column Zone (Sidebar Cards) */}
        <div className="xl:col-span-4 space-y-5">
          
          {/* 1. Account Summary Card */}
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
            
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Account Summary</h3>
              <button
                onClick={() => setHideBalance(!hideBalance)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                title={hideBalance ? 'Show balance' : 'Hide balance'}
              >
                {hideBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Total Balance */}
            <div className="space-y-1">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Total Balance</span>
              <div className="text-3xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
                {hideBalance ? '••••••••' : formatUSD(totalBalance)}
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                <span>{totalOpenPnl !== 0 ? `${totalOpenPnl >= 0 ? '↑ +' : '↓ -'}${formatUSD(Math.abs(totalOpenPnl))}` : '$0.00 (0.00%)'}</span>
              </div>
            </div>

            {/* Split Metrics */}
            <div className="grid grid-cols-2 gap-4 py-3 border-t border-b border-slate-100 dark:border-slate-800 text-xs">
              <div>
                <span className="text-[11px] text-slate-400 block">Available Balance</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                  {hideBalance ? '••••' : formatUSD(availableBalance)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Pending</span>
                <span className="font-bold text-slate-500 font-mono text-sm">
                  {hideBalance ? '••••' : formatUSD(pendingDeposits)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                onClick={() => router.push('/funds?tab=deposit')}
                className="w-full py-2.5 rounded-xl bg-slate-950 dark:bg-emerald-600 text-white hover:bg-slate-800 dark:hover:bg-emerald-500 text-xs font-bold transition-colors shadow-2xs flex items-center justify-center gap-1.5 active:scale-[0.99]"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>+ Add Funds</span>
              </button>

              <button
                onClick={() => router.push('/funds?tab=withdraw')}
                className="w-full py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors active:scale-[0.99]"
              >
                Withdraw
              </button>
            </div>

          </div>

          {/* 2. Recent Activity Card */}
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Activity</h3>
              <Link href="/funds" className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold">
                View All
              </Link>
            </div>

            <div className="space-y-3 text-xs">
              {recentTransactions.length === 0 ? (
                <div className="py-6 text-center space-y-2">
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                    <Clock className="w-4 h-4" />
                  </div>
                  <p className="text-slate-500 text-[11px]">No recent transactions</p>
                </div>
              ) : (
                recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          tx.type === 'deposit'
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
                        }`}
                      >
                        {tx.type === 'deposit' ? (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white capitalize">
                          {tx.type} {tx.paymentMode ? `• ${tx.paymentMode}` : ''}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {new Date(tx.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-bold font-mono text-slate-900 dark:text-white">
                        {tx.type === 'deposit' ? '+' : '-'}${tx.amount.toFixed(2)}
                      </p>
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider ${
                          tx.status === 'completed'
                            ? 'text-emerald-600'
                            : tx.status === 'pending'
                            ? 'text-amber-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 3. Account Status & Limits Card */}
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-3.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
              Account Status
            </h3>
            
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">KYC Status</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  currentUser?.kycStatus === 'approved'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                    : currentUser?.kycStatus === 'pending'
                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                    : currentUser?.kycStatus === 'rejected'
                    ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}>
                  {currentUser?.kycStatus === 'approved' ? 'Verified' : currentUser?.kycStatus === 'pending' ? 'Under Review' : currentUser?.kycStatus === 'rejected' ? 'Action Required' : 'Unverified'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Account Type</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {currentUser?.role === 'admin' ? 'Administrator' : currentUser?.role === 'developer' ? 'Developer' : 'Standard FX'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Member Since</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {currentUser?.createdAt ? new Date(currentUser.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently'}
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
