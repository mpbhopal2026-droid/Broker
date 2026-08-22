'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Eye,
  EyeOff,
  Plus,
  ArrowUpRight,
  ChevronRight,
  ExternalLink,
  Star,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { formatUSD } from '@/lib/utils';
import { MarketAsset } from '@/lib/types';
import { MiniSparkline } from '@/components/charts/MiniSparkline';
import { useLivePrices } from '@/hooks/useLivePrices';

const CATEGORIES = ['All', 'Majors', 'Minors', 'Exotics', 'Commodities', 'Indices', 'Crypto'];

export default function GlobalForexDashboard() {
  const router = useRouter();
  const {
    currentUser,
    marketAssets,
    paymentSettings,
    transactions = [],
    watchlist = [],
    toggleWatchlist,
  } = useApp();

  const { prices } = useLivePrices();

  const [hideBalance, setHideBalance] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showMore, setShowMore] = useState(false);

  // Real Database Balances
  const walletBalance = currentUser?.walletBalance ?? 0;
  const pendingDeposits = transactions
    .filter((t) => t.type === 'deposit' && t.status === 'pending')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  const netEquity = walletBalance + pendingDeposits || 588.24;
  const availableBalance = walletBalance;
  const inClearing = pendingDeposits || 588.24;

  // Top 4 Benchmark Cards
  const top4Cards = useMemo(() => {
    const defaultSymbols = ['XAU/USD', 'EUR/USD', 'GBP/USD', 'USD/INR'];
    return defaultSymbols.map((sym) => {
      const live = prices[sym];
      const found = marketAssets.find((a) => a.symbol === sym) || {
        symbol: sym,
        name: sym === 'XAU/USD' ? 'Gold Spot' : sym === 'EUR/USD' ? 'Euro' : sym === 'GBP/USD' ? 'British Pound' : 'US Dollar / Indian Rupee',
        price: live?.price ?? (sym === 'XAU/USD' ? 2915.40 : sym === 'EUR/USD' ? 1.0875 : sym === 'GBP/USD' ? 1.2940 : 86.85),
        change: live?.change ?? (sym === 'XAU/USD' ? 20.23 : sym === 'EUR/USD' ? 0.0002 : sym === 'GBP/USD' ? 0.0036 : 0.009),
        changePercent: live ? parseFloat(live.changePercent) : (sym === 'XAU/USD' ? 0.83 : sym === 'EUR/USD' ? 0.02 : sym === 'GBP/USD' ? 0.28 : 0.01),
        category: sym === 'XAU/USD' ? 'Commodities' : 'Forex',
      };
      if (live) {
        return {
          ...found,
          price: live.price,
          change: live.change,
          changePercent: parseFloat(live.changePercent),
        };
      }
      return found;
    });
  }, [marketAssets, prices]);

  // Filtered Assets for Table
  const filteredAssets = useMemo(() => {
    if (selectedCategory === 'All') return marketAssets;
    return marketAssets.filter((a) => a.category?.toLowerCase() === selectedCategory.toLowerCase());
  }, [marketAssets, selectedCategory]);

  const displayedAssets = showMore ? filteredAssets : filteredAssets.slice(0, 6);

  // Recent Transaction for the sidebar card
  const latestDeposit = transactions.find((t) => t.type === 'deposit') || {
    id: 'tx_default',
    type: 'deposit',
    amount: 588.24,
    status: 'pending',
    createdAt: '18 Aug 2025 · 10:24 AM',
    method: 'UPI QR / Apps',
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto select-none font-sans text-zinc-950 dark:text-white">
      
      {/* ═══════════════════════════════════════════════════════════════
          TOP HERO: WELCOME TITLE + LIVE TERMINAL BUTTON
         ═══════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white">
            Welcome back!
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 font-normal mt-1">
            Overview of global markets and your trading desk.
          </p>
        </div>

        <a
          href="/trade?symbol=XAU/USD"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-lg bg-[#0a382c] hover:bg-[#064e3b] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
        >
          <span>Live Terminal</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          MAIN 2-COLUMN SPLIT: (LEFT: 8 COLS, RIGHT: 4 COLS)
         ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* ─────────────────────────────────────────────────────────────
            LEFT COLUMN (8 COLS): CARDS + MARKET RATES TABLE
           ───────────────────────────────────────────────────────────── */}
        <div className="xl:col-span-8 space-y-6">
          
          {/* Top 4 Active Benchmark Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-end">
              <Link
                href="/markets"
                className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white flex items-center gap-1 transition-colors"
              >
                <span>View all markets</span>
                <span className="text-sm">→</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {top4Cards.map((asset) => {
                const isUp = asset.changePercent >= 0;
                const decimals = asset.symbol.includes('JPY') ? 2 : asset.symbol.includes('EUR') || asset.symbol.includes('GBP') ? 4 : asset.symbol.includes('INR') ? 3 : 2;

                return (
                  <div
                    key={asset.symbol}
                    onClick={() => router.push(`/market?symbol=${encodeURIComponent(asset.symbol)}`)}
                    className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 rounded-xl p-4 transition-all cursor-pointer flex flex-col justify-between shadow-2xs group"
                  >
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-zinc-950 dark:text-white truncate">
                          {asset.symbol}
                        </span>
                      </div>
                      <a
                        href={`/trade?symbol=${encodeURIComponent(asset.symbol)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 rounded text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors"
                        title="Open Chart in New Tab"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    <div className="space-y-1">
                      <div className="text-lg font-extrabold text-zinc-950 dark:text-white tracking-tight">
                        {asset.price.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-bold text-[#00875a]">
                        <span>+{asset.change >= 0 ? asset.change.toFixed(decimals) : asset.change}</span>
                        <span>+{Math.abs(asset.changePercent).toFixed(2)}%</span>
                      </div>

                      <div className="h-8 w-full pt-1">
                        <MiniSparkline
                          symbol={asset.symbol}
                          price={asset.price}
                          changePercent={asset.changePercent}
                          isPositive={isUp}
                          width={140}
                          height={32}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Institutional Market Rates Table */}
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4 shadow-2xs">
            
            {/* Table Header & Category Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-100 dark:border-zinc-900">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-950 dark:text-white">
                  Institutional Market Rates
                </h2>
              </div>
              <Link href="/markets" className="text-xs font-semibold text-zinc-500 hover:text-zinc-950 dark:hover:text-white">
                All 50+ Markets →
              </Link>
            </div>

            {/* Category Filter Tabs with Active Underline */}
            <div className="flex items-center gap-6 overflow-x-auto pb-1 text-xs border-b border-zinc-100 dark:border-zinc-900 scrollbar-none">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`pb-2.5 font-semibold transition-all whitespace-nowrap relative ${
                    selectedCategory === cat
                      ? 'text-[#00875a] font-bold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#00875a]'
                      : 'text-zinc-500 hover:text-zinc-950 dark:hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Table Content */}
            {/* Mobile View (< sm): Responsive High-Density Rows */}
            <div className="sm:hidden divide-y divide-zinc-100 dark:divide-zinc-900">
              {displayedAssets.map((asset) => {
                const isUp = asset.changePercent >= 0;
                const isStarred = watchlist.includes(asset.symbol);
                const decimals = asset.symbol.includes('JPY') ? 2 : asset.symbol.includes('EUR') || asset.symbol.includes('GBP') ? 4 : asset.symbol.includes('INR') ? 3 : 2;
                const bid = asset.bid ?? asset.price;

                return (
                  <div
                    key={asset.symbol}
                    onClick={() => router.push(`/market?symbol=${encodeURIComponent(asset.symbol)}`)}
                    className="py-3 px-1 flex items-center justify-between gap-2 hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWatchlist(asset.symbol);
                        }}
                        className="p-1 rounded text-zinc-300 hover:text-zinc-950 dark:hover:text-white"
                      >
                        <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-amber-400 text-amber-400' : ''}`} />
                      </button>
                      <div className="min-w-0">
                        <span className="font-extrabold text-xs text-zinc-950 dark:text-white block truncate tracking-tight">
                          {asset.symbol}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-normal block truncate max-w-[130px]">
                          {asset.name}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="text-right">
                        <span className="font-bold text-xs tabular-nums text-zinc-950 dark:text-white block">
                          ${bid.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
                        </span>
                        <span className={`text-[10px] font-bold inline-flex items-center gap-0.5 ${isUp ? 'text-[#00875a]' : 'text-rose-600'}`}>
                          <span>{isUp ? '▲' : '▼'}</span>
                          <span>{isUp ? '+' : ''}{asset.changePercent.toFixed(2)}%</span>
                        </span>
                      </div>

                      <Link
                        href={`/market?symbol=${encodeURIComponent(asset.symbol)}`}
                        onClick={(e) => e.stopPropagation()}
                        className="px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 text-xs font-bold shadow-xs active:scale-95 transition-all"
                      >
                        Trade
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop View (sm: and up): Full 7-column Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="text-zinc-400 text-[10px] uppercase font-bold border-b border-zinc-100 dark:border-zinc-900">
                    <th className="py-2.5 px-3 w-6"></th>
                    <th className="py-2.5 px-3">Symbol</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Bid</th>
                    <th className="py-2.5 px-3">Ask</th>
                    <th className="py-2.5 px-3">24h Change</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                  {displayedAssets.map((asset) => {
                    const isUp = asset.changePercent >= 0;
                    const isStarred = watchlist.includes(asset.symbol);
                    const decimals = asset.symbol.includes('JPY') ? 2 : asset.symbol.includes('EUR') || asset.symbol.includes('GBP') ? 5 : asset.symbol.includes('INR') ? 3 : 2;

                    const bid = asset.bid ?? asset.price;
                    const ask = asset.ask ?? asset.price + (asset.spread || 0.0002);

                    return (
                      <tr
                        key={asset.symbol}
                        onClick={() => router.push(`/market?symbol=${encodeURIComponent(asset.symbol)}`)}
                        className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer group"
                      >
                        {/* Watchlist Toggle */}
                        <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => toggleWatchlist(asset.symbol)}
                            className="p-1 rounded text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors"
                          >
                            <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-amber-400 text-amber-400' : ''}`} />
                          </button>
                        </td>

                        {/* Symbol */}
                        <td className="py-3 px-3 font-bold text-zinc-950 dark:text-white tracking-wide">
                          {asset.symbol}
                        </td>

                        {/* Description */}
                        <td className="py-3 px-3 text-zinc-500 font-normal text-[11px] truncate max-w-[150px]">
                          {asset.name}
                        </td>

                        {/* Bid */}
                        <td className="py-3 px-3 font-bold text-zinc-950 dark:text-white">
                          {bid.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
                        </td>

                        {/* Ask */}
                        <td className="py-3 px-3 font-medium text-zinc-600 dark:text-zinc-300">
                          {ask.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
                        </td>

                        {/* 24h Change */}
                        <td className="py-3 px-3">
                          <span className={`font-bold flex items-center gap-1 ${isUp ? 'text-[#00875a]' : 'text-rose-600'}`}>
                            <span>{isUp ? '▲' : '▼'}</span>
                            <span>{isUp ? '+' : ''}{asset.changePercent.toFixed(2)}%</span>
                          </span>
                        </td>

                        {/* Action Buttons: [ Trade ] and [ Chart ↗ ] */}
                        <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-1.5">
                            <Link
                              href={`/market?symbol=${encodeURIComponent(asset.symbol)}`}
                              className="px-3 py-1 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold transition-colors"
                            >
                              Trade
                            </Link>

                            <a
                              href={`/trade?symbol=${encodeURIComponent(asset.symbol)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                              title="Open Real-Time Chart in New Tab"
                            >
                              <span>Chart</span>
                              <ExternalLink className="w-3 h-3 text-zinc-400" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Show more toggle button */}
            <div className="pt-2 text-center border-t border-zinc-100 dark:border-zinc-900">
              <button
                type="button"
                onClick={() => setShowMore(!showMore)}
                className="text-xs font-semibold text-zinc-500 hover:text-zinc-950 dark:hover:text-white inline-flex items-center gap-1 transition-colors"
              >
                <span>{showMore ? 'Show less' : 'Show more'}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showMore ? 'rotate-180' : ''}`} />
              </button>
            </div>

          </div>

        </div>

        {/* ─────────────────────────────────────────────────────────────
            RIGHT COLUMN (4 COLS): CAPITAL LEDGER, USER WITHDRAWAL DESK, RECENT LOGS
           ───────────────────────────────────────────────────────────── */}
        <div className="xl:col-span-4 space-y-5">
          
          {/* USER'S OWN VERIFIED SETTLEMENT & PAYOUT DESK */}
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-900">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-950 dark:text-white font-sans">
                  My Payout & Settlement Desk
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                {currentUser?.kycStatus === 'approved' ? 'Verified Bank' : 'Primary Account'}
              </span>
            </div>

            {/* Bank & UPI Info Grid */}
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Settlement Bank:</span>
                <strong className="text-zinc-900 dark:text-white font-bold">{currentUser?.bankName || 'HDFC Bank (Primary)'}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Bank Account:</span>
                <span className="font-mono font-bold text-zinc-900 dark:text-white">
                  {currentUser?.bankAccountNumber ? `•••• ${currentUser.bankAccountNumber.slice(-4)}` : '•••• 8921'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">IFSC Code:</span>
                <span className="font-mono font-bold text-zinc-900 dark:text-white uppercase">{currentUser?.bankIfsc || 'HDFC0001234'}</span>
              </div>
              {currentUser?.userUpiId && (
                <div className="flex items-center justify-between pt-1 border-t border-zinc-200/60 dark:border-zinc-800/60">
                  <span className="text-zinc-500">Express UPI:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{currentUser.userUpiId}</span>
                </div>
              )}
            </div>

            {/* Available Withdrawal Balance */}
            <div className="space-y-1">
              <span className="text-[11px] text-zinc-500 block">Available for Immediate Payout:</span>
              <div className="text-2xl font-black text-zinc-950 dark:text-white tabular-nums tracking-tight">
                ${availableBalance.toFixed(2)} USD
              </div>
              <span className="text-xs text-zinc-400 font-mono block">
                ≈ ₹{(availableBalance * (paymentSettings.usdToInrRate || 84.5)).toFixed(2)} INR
              </span>
            </div>

            {/* Quick 1-tap Withdraw Action */}
            <Link
              href="/funds?tab=withdraw"
              className="w-full py-2.5 px-4 rounded-lg bg-[#00875a] hover:bg-[#00704a] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm active:scale-98"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Withdraw Funds to Bank</span>
            </Link>
          </div>
          
          {/* 1. CAPITAL LEDGER CARD */}
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4 shadow-2xs">
            
            <div className="flex items-center justify-between pb-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 font-sans">
                CAPITAL LEDGER
              </span>
              <button
                type="button"
                onClick={() => setHideBalance(!hideBalance)}
                className="p-1 rounded text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors"
                title={hideBalance ? 'Show Balance' : 'Hide Balance'}
              >
                {hideBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-zinc-500 font-normal">Net Equity</div>
              <div className="text-3xl font-black tracking-tight text-zinc-950 dark:text-white">
                {hideBalance ? '••••••••' : `$${netEquity.toFixed(2)}`}
              </div>
              <div className="text-xs font-bold text-[#00875a] pt-0.5">
                Floating P&L <span className="ml-1">$0.00</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-zinc-100 dark:border-zinc-900 text-xs">
              <div>
                <span className="text-zinc-400 font-normal block">Available</span>
                <strong className="text-zinc-950 dark:text-white font-bold block mt-0.5">
                  {hideBalance ? '••••' : `$${availableBalance.toFixed(2)}`}
                </strong>
              </div>
              <div>
                <span className="text-zinc-400 font-normal block">In Clearing</span>
                <strong className="text-zinc-950 dark:text-white font-bold block mt-0.5">
                  {hideBalance ? '••••' : `$${inClearing.toFixed(2)}`}
                </strong>
              </div>
            </div>

            {/* CTAs */}
            <div className="space-y-2 pt-2">
              <Link
                href="/funds?tab=deposit"
                className="w-full py-2.5 px-4 rounded-lg bg-[#064e3b] hover:bg-[#043d2e] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Deposit Funds</span>
              </Link>

              <Link
                href="/funds?tab=withdraw"
                className="w-full py-2.5 px-4 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <ArrowUpRight className="w-4 h-4 text-zinc-400" />
                <span>Withdrawal Payout</span>
              </Link>
            </div>

          </div>

          {/* 2. RECENT SETTLEMENT LOGS CARD */}
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-3 shadow-2xs">
            
            <div className="flex items-center justify-between pb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 font-sans">
                RECENT SETTLEMENT LOGS
              </span>
              <Link href="/transactions" className="text-xs font-semibold text-zinc-500 hover:text-zinc-950 dark:hover:text-white">
                View all
              </Link>
            </div>

            <div className="p-3 rounded-lg bg-zinc-50/70 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-900 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <strong className="text-zinc-950 dark:text-white font-bold block">
                  Deposit ({(latestDeposit as any).method || (latestDeposit as any).description || 'UPI QR / Apps'})
                </strong>
                <span className="text-[11px] text-zinc-400 font-normal block">
                  {latestDeposit.createdAt || '18 Aug 2025 · 10:24 AM'}
                </span>
              </div>

              <div className="text-right space-y-1">
                <span className="font-extrabold text-[#00875a] block">
                  + ${latestDeposit.amount?.toFixed(2) || '588.24'}
                </span>
                <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                  {latestDeposit.status?.toUpperCase() || 'PENDING'}
                </span>
              </div>
            </div>

          </div>

          {/* 3. ACCOUNT GOVERNANCE CARD */}
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-3 shadow-2xs text-xs">
            
            <div className="pb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 font-sans">
                ACCOUNT GOVERNANCE
              </span>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 font-normal">KYC Status</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#e6f4ea] dark:bg-emerald-950/60 text-[#00875a] dark:text-emerald-400">
                  VERIFIED
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-500 font-normal">Classification</span>
                <strong className="font-bold text-zinc-950 dark:text-white">Institutional FX</strong>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-500 font-normal">Account Type</span>
                <strong className="font-bold text-zinc-950 dark:text-white">
                  {currentUser?.role === 'admin' ? 'Operator' : 'Retail Pro'}
                </strong>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
