'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  ChevronRight,
  Star,
  TrendingUp,
  ExternalLink,
  Flame,
  Zap,
  Activity,
  BarChart3,
  ShieldCheck
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { MarketAsset } from '@/lib/types';
import { MiniSparkline } from '@/components/charts/MiniSparkline';
import { useLivePrices } from '@/hooks/useLivePrices';

export default function MarketsDiscoveryPage() {
  const router = useRouter();
  const { marketAssets, watchlist = [], toggleWatchlist } = useApp();
  const { prices } = useLivePrices();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'ALL', label: 'All Markets' },
    { id: 'Forex', label: 'Forex Majors & Minors' },
    { id: 'Commodities', label: 'Metals & Energy' },
    { id: 'Crypto', label: 'Digital Assets' },
    { id: 'Indices', label: 'Global Indices' },
  ];

  // Top 4 Market Benchmark Cards
  const top4Benchmarks = useMemo(() => {
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

  const filteredAssets = useMemo(() => {
    return marketAssets.filter((asset) => {
      const matchCat =
        selectedCategory === 'ALL' ||
        asset.category?.toLowerCase() === selectedCategory.toLowerCase() ||
        (selectedCategory === 'Forex' && ((asset.category as string) === 'Majors' || (asset.category as string) === 'Minors' || (asset.category as string) === 'Exotics' || (asset.category as string) === 'Forex'));

      const matchSearch =
        asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.name.toLowerCase().includes(searchQuery.toLowerCase());

      return matchCat && matchSearch;
    });
  }, [marketAssets, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto select-none font-sans text-zinc-950 dark:text-white">
      
      {/* ═══════════════════════════════════════════════════════════════
          HERO BANNER: TITLE + STATS PILLS
         ═══════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white">
              Global Markets & Instruments
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-[#e6f4ea] dark:bg-emerald-950/60 text-[#00875a] dark:text-emerald-400 text-[11px] font-bold">
              Live Feed
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 font-normal mt-1">
            Real-time institutional liquidity, razor-thin spreads, and instant 1-click execution across 50+ assets.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-[#00875a]" />
            <span>Avg Spread: <strong className="text-zinc-950 dark:text-white">0.2 Pips</strong></span>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Latency: <strong className="text-zinc-950 dark:text-white">~12ms</strong></span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          ACTIVE BENCHMARK CARDS
         ═══════════════════════════════════════════════════════════════ */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-zinc-400">
            <Flame className="w-3.5 h-3.5 text-[#00875a]" />
            <span>Active Market Benchmarks</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {top4Benchmarks.map((asset) => {
            const isUp = asset.changePercent >= 0;
            const decimals = asset.symbol.includes('JPY') ? 2 : asset.symbol.includes('EUR') || asset.symbol.includes('GBP') ? 4 : asset.symbol.includes('INR') ? 3 : 2;

            return (
              <div
                key={asset.symbol}
                onClick={() => router.push(`/market?symbol=${encodeURIComponent(asset.symbol)}`)}
                className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 rounded-xl p-4 transition-all cursor-pointer flex flex-col justify-between shadow-2xs group"
              >
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="font-bold text-xs text-zinc-950 dark:text-white tracking-wide truncate">
                    {asset.symbol}
                  </span>
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
                    ${asset.price.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
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

      {/* ═══════════════════════════════════════════════════════════════
          CONTROLS: CATEGORY TABS & SEARCH
         ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4 shadow-2xs">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-900">
          
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  selectedCategory === cat.id
                    ? 'bg-[#00875a] text-white shadow-xs'
                    : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:bg-[#e6f4ea] hover:text-[#00875a]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by symbol or name..."
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-950 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-[#00875a] transition-all"
            />
          </div>

        </div>

        {/* ═══════════════════════════════════════════════════════════════
            MARKETS ASSET TABLE
           ═══════════════════════════════════════════════════════════════ */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="text-zinc-400 text-[10px] uppercase font-bold border-b border-zinc-100 dark:border-zinc-900">
                <th className="py-3 px-3 w-8"></th>
                <th className="py-3 px-3">Instrument</th>
                <th className="py-3 px-3">Description</th>
                <th className="py-3 px-3">Bid Price</th>
                <th className="py-3 px-3">Ask Price</th>
                <th className="py-3 px-3">Spread</th>
                <th className="py-3 px-3">24h Change</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-zinc-400 text-xs">
                    No instruments found matching "{searchQuery}".
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => {
                  const isUp = asset.changePercent >= 0;
                  const isStarred = watchlist.includes(asset.symbol);
                  const decimals = asset.symbol.includes('JPY') ? 2 : asset.symbol.includes('EUR') || asset.symbol.includes('GBP') ? 5 : asset.symbol.includes('INR') ? 3 : 2;

                  const bid = asset.bid ?? asset.price;
                  const ask = asset.ask ?? asset.price + (asset.spread || 0.0002);
                  const spreadPips = (asset.spread ? (asset.spread * (decimals === 5 ? 10000 : 100)).toFixed(1) : '0.2') + ' p';

                  return (
                    <tr
                      key={asset.symbol}
                      onClick={() => router.push(`/market?symbol=${encodeURIComponent(asset.symbol)}`)}
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer group"
                    >
                      {/* Watchlist Star */}
                      <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleWatchlist(asset.symbol)}
                          className="p-1 rounded text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors"
                        >
                          <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-amber-400 text-amber-400' : ''}`} />
                        </button>
                      </td>

                      {/* Instrument Symbol */}
                      <td className="py-3 px-3">
                        <strong className="text-zinc-950 dark:text-white font-bold block text-xs tracking-wide">
                          {asset.symbol}
                        </strong>
                      </td>

                      {/* Description */}
                      <td className="py-3 px-3 text-zinc-500 font-normal text-[11px] truncate max-w-[150px]">
                        {asset.name}
                      </td>

                      {/* Bid */}
                      <td className="py-3 px-3 font-bold text-zinc-950 dark:text-white">
                        ${bid.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
                      </td>

                      {/* Ask */}
                      <td className="py-3 px-3 font-medium text-zinc-600 dark:text-zinc-300">
                        ${ask.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
                      </td>

                      {/* Spread */}
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                          {spreadPips}
                        </span>
                      </td>

                      {/* 24h Change */}
                      <td className="py-3 px-3">
                        <span className={`font-bold flex items-center gap-1 ${isUp ? 'text-[#00875a]' : 'text-rose-600'}`}>
                          <span>{isUp ? '▲' : '▼'}</span>
                          <span>{isUp ? '+' : ''}{asset.changePercent.toFixed(2)}%</span>
                        </span>
                      </td>

                      {/* Actions: [ Details & Trade ] (Mint Pill) and [ Chart ↗ ] (White Pill) */}
                      <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1.5">
                          <Link
                            href={`/market?symbol=${encodeURIComponent(asset.symbol)}`}
                            className="px-3 py-1 rounded-md bg-[#e6f4ea] dark:bg-emerald-950/60 text-[#00875a] dark:text-emerald-400 hover:bg-[#d4edd9] dark:hover:bg-emerald-900/80 border border-[#b7e4c7] dark:border-emerald-800 text-xs font-bold transition-colors shadow-2xs"
                          >
                            Details & Trade
                          </Link>

                          <a
                            href={`/trade?symbol=${encodeURIComponent(asset.symbol)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                            title="Open Real-Time Chart in New Tab"
                          >
                            <span>Chart</span>
                            <ExternalLink className="w-3 h-3 text-zinc-400" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
