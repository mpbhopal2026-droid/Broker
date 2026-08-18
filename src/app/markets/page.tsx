'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  ChevronRight,
  Star,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Flame
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { AssetCategory } from '@/lib/types';
import { MiniSparkline } from '@/components/charts/MiniSparkline';

export default function MarketsDiscoveryPage() {
  const router = useRouter();
  const { marketAssets, watchlist, toggleWatchlist } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'ALL', label: 'All' },
    { id: 'Forex', label: 'Forex' },
    { id: 'Commodities', label: 'Metals & Commodities' },
    { id: 'Crypto', label: 'Crypto' },
    { id: 'Indices', label: 'Indices' },
    { id: 'Equities', label: 'Equities' },
  ];

  // Popular Pairs featured row
  const popularSymbols = ['XAU/USD', 'EUR/USD', 'BTC/USD', 'GBP/USD'];
  const popularAssets = popularSymbols
    .map((s) => marketAssets.find((a) => a.symbol === s))
    .filter(Boolean) as typeof marketAssets;

  const filteredAssets = useMemo(() => {
    return marketAssets.filter((asset) => {
      const matchCat = selectedCategory === 'ALL' || asset.category === selectedCategory;
      const matchSearch =
        asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [marketAssets, selectedCategory, searchQuery]);

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Markets Discovery
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Explore global forex pairs, commodities, crypto, and equities with live institutional spreads.
        </p>
      </div>

      {/* Popular Pairs Sparkline Cards */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          <Flame className="w-3.5 h-3.5 text-amber-500" />
          <span>Popular Instruments</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {popularAssets.map((asset) => {
            const isUp = asset.changePercent >= 0;
            const mockSparkline = isUp
              ? [asset.price * 0.98, asset.price * 0.985, asset.price * 0.99, asset.price * 0.995, asset.price]
              : [asset.price * 1.02, asset.price * 1.015, asset.price * 1.01, asset.price * 1.005, asset.price];

            return (
              <div
                key={asset.symbol}
                onClick={() => router.push(`/trade?symbol=${encodeURIComponent(asset.symbol)}`)}
                className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer shadow-2xs group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-slate-950 dark:group-hover:text-emerald-400 transition-colors">
                    {asset.symbol}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">{asset.category}</span>
                </div>

                <div className="my-1.5 flex items-baseline justify-between">
                  <span className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                    ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: asset.price > 100 ? 2 : 4 })}
                  </span>
                  <span className={`text-[11px] font-bold ${isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {isUp ? '+' : ''}{asset.changePercent}%
                  </span>
                </div>

                <div className="w-full h-7 flex items-end">
                  <MiniSparkline data={mockSparkline} isPositive={isUp} width={90} height={24} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        
        {/* Category Filter Pills with Smooth Horizontal Touch Scroll */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 border ${
                selectedCategory === cat.id
                  ? 'bg-slate-950 dark:bg-emerald-600 text-white border-slate-950 dark:border-emerald-600 font-bold shadow-2xs'
                  : 'bg-white dark:bg-[#0f172a] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-950 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search XAU/USD, EUR/USD..."
            className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-slate-400 dark:focus:border-slate-700 focus:ring-1 focus:ring-slate-400 shadow-2xs"
          />
        </div>

      </div>

      {/* Markets Asset List */}
      <div className="rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
        
        {/* Mobile View (sm:hidden) */}
        <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800 p-2 space-y-1.5">
          {filteredAssets.length === 0 ? (
            <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-xs">
              No instruments found matching "{searchQuery}".
            </div>
          ) : (
            filteredAssets.map((asset) => {
              const isUp = asset.changePercent >= 0;
              const isStarred = watchlist.includes(asset.symbol);

              return (
                <div
                  key={asset.symbol}
                  onClick={() => router.push(`/trade?symbol=${encodeURIComponent(asset.symbol)}`)}
                  className="p-3 bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-xl flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWatchlist(asset.symbol);
                      }}
                      className={`p-1 rounded text-slate-400 hover:text-amber-400 ${
                        isStarred ? 'text-amber-400 fill-amber-400' : ''
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-current' : ''}`} />
                    </button>
                    <div>
                      <strong className="text-slate-900 dark:text-white font-bold text-sm block">{asset.symbol}</strong>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate max-w-[140px]">{asset.name}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-slate-900 dark:text-white text-sm block">
                      ${(asset.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: asset.price > 100 ? 2 : 4 })}
                    </span>
                    <span className={`text-xs font-semibold ${isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {isUp ? '+' : ''}{asset.changePercent}%
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table View (hidden sm:block) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase font-sans">
              <tr>
                <th className="py-3 px-4 w-10"></th>
                <th className="py-3 px-4 font-semibold">Instrument</th>
                <th className="py-3 px-4 font-semibold">Bid</th>
                <th className="py-3 px-4 font-semibold">Ask</th>
                <th className="py-3 px-4 font-semibold">24h Change</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs">
                    No instruments found matching "{searchQuery}".
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => {
                  const isUp = asset.changePercent >= 0;
                  const isStarred = watchlist.includes(asset.symbol);

                  return (
                    <tr
                      key={asset.symbol}
                      onClick={() => router.push(`/trade?symbol=${encodeURIComponent(asset.symbol)}`)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                    >
                      {/* Watchlist Star Toggle */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleWatchlist(asset.symbol)}
                          className={`p-1 rounded text-slate-400 hover:text-amber-400 transition-colors ${
                            isStarred ? 'text-amber-400 fill-amber-400' : ''
                          }`}
                        >
                          <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-current' : ''}`} />
                        </button>
                      </td>

                      {/* Instrument */}
                      <td className="py-3.5 px-4">
                        <strong className="text-slate-900 dark:text-white font-bold block group-hover:text-slate-950 dark:group-hover:text-emerald-400 transition-colors">
                          {asset.symbol}
                        </strong>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate max-w-xs">{asset.name}</span>
                      </td>

                      {/* Bid */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        ${(asset.bid ?? asset.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: (asset.bid ?? asset.price) > 100 ? 2 : 4 })}
                      </td>

                      {/* Ask */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-semibold">
                        ${(asset.ask ?? asset.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: (asset.ask ?? asset.price) > 100 ? 2 : 4 })}
                      </td>

                      {/* Change */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-0.5 font-bold ${
                          isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {isUp ? '+' : ''}{asset.changePercent}%
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="inline-flex items-center gap-1 text-slate-400 dark:text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white font-semibold text-xs transition-colors">
                          <span>Trade</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
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
