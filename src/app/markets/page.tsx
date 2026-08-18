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
  Flame
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { MarketAsset } from '@/lib/types';
import { MiniSparkline } from '@/components/charts/MiniSparkline';
import { InstrumentDetailModal } from '@/components/trading/InstrumentDetailModal';

export default function MonochromeMarketsPage() {
  const router = useRouter();
  const { marketAssets, watchlist, toggleWatchlist } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<MarketAsset | null>(null);

  const categories = [
    { id: 'ALL', label: 'All' },
    { id: 'Forex', label: 'Forex' },
    { id: 'Commodities', label: 'Metals & Energy' },
    { id: 'Crypto', label: 'Crypto' },
    { id: 'Indices', label: 'Indices' },
  ];

  // Popular Pairs featured row
  const popularSymbols = ['XAU/USD', 'EUR/USD', 'BTC/USD', 'GBP/USD'];
  const popularAssets = popularSymbols
    .map((s) => marketAssets.find((a) => a.symbol === s))
    .filter(Boolean) as MarketAsset[];

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
    <div className="space-y-4 max-w-6xl mx-auto font-mono select-none">
      
      {/* Header */}
      <div className="pb-3 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-base sm:text-lg font-bold uppercase tracking-tight text-zinc-950 dark:text-white">
            Market Discovery & Quotes
          </h1>
          <p className="text-[11px] text-zinc-500 font-sans mt-0.5">
            Click on any instrument to view real-time quotes, buy/sell orders, or launch full candlestick charts in a new tab.
          </p>
        </div>
      </div>

      {/* Popular Instruments Grid */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
          <Flame className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
          <span>Active Market Benchmarks</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {popularAssets.map((asset) => {
            const isUp = asset.changePercent >= 0;
            const mockSparkline = isUp
              ? [asset.price * 0.98, asset.price * 0.985, asset.price * 0.99, asset.price * 0.995, asset.price]
              : [asset.price * 1.02, asset.price * 1.015, asset.price * 1.01, asset.price * 1.005, asset.price];

            return (
              <div
                key={asset.symbol}
                onClick={() => setSelectedAsset(asset)}
                className="p-3 rounded-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-950 dark:text-white text-xs">
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
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="my-1 flex items-baseline justify-between">
                  <span className="font-bold text-zinc-950 dark:text-white text-sm tabular-nums">
                    ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: asset.price > 100 ? 2 : 4 })}
                  </span>
                  <span className={`text-[10px] font-semibold tabular-nums ${isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {isUp ? '▲ +' : '▼ -'}{Math.abs(asset.changePercent).toFixed(2)}%
                  </span>
                </div>

                <div className="w-full h-5 flex items-end opacity-60">
                  <MiniSparkline data={mockSparkline} isPositive={isUp} width={90} height={20} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
        
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-colors shrink-0 ${
                selectedCategory === cat.id
                  ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950'
                  : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-60">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search instrument..."
            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-zinc-950 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-100"
          />
        </div>

      </div>

      {/* Markets Asset Table */}
      <div className="rounded-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        
        {/* Mobile View */}
        <div className="sm:hidden divide-y divide-zinc-100 dark:divide-zinc-900">
          {filteredAssets.length === 0 ? (
            <div className="text-center py-8 text-zinc-400 text-xs">
              No instruments found.
            </div>
          ) : (
            filteredAssets.map((asset) => {
              const isUp = asset.changePercent >= 0;
              const isStarred = watchlist.includes(asset.symbol);

              return (
                <div
                  key={asset.symbol}
                  onClick={() => setSelectedAsset(asset)}
                  className="p-3 flex items-center justify-between cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWatchlist(asset.symbol);
                      }}
                      className={`p-1 rounded text-zinc-400 hover:text-zinc-950 dark:hover:text-white ${
                        isStarred ? 'text-zinc-950 dark:text-white' : ''
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-current' : ''}`} />
                    </button>
                    <div>
                      <strong className="text-zinc-950 dark:text-white font-bold text-xs block">{asset.symbol}</strong>
                      <span className="text-[10px] text-zinc-500 font-sans block truncate max-w-[130px]">{asset.name}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="font-bold tabular-nums text-zinc-950 dark:text-white text-xs block">
                        ${asset.price.toFixed(asset.symbol.includes('JPY') ? 2 : asset.symbol.includes('EUR') || asset.symbol.includes('GBP') ? 4 : 2)}
                      </span>
                      <span className={`text-[10px] font-semibold tabular-nums ${isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {isUp ? '▲ +' : '▼ -'}{Math.abs(asset.changePercent).toFixed(2)}%
                      </span>
                    </div>

                    <a
                      href={`/trade?symbol=${encodeURIComponent(asset.symbol)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 rounded border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      title="Open Chart in New Tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-400 border-b border-zinc-100 dark:border-zinc-900 text-[10px] uppercase font-bold">
              <tr>
                <th className="py-2.5 px-3 w-8"></th>
                <th className="py-2.5 px-3">Instrument</th>
                <th className="py-2.5 px-3">Bid</th>
                <th className="py-2.5 px-3">Ask</th>
                <th className="py-2.5 px-3">24h Delta</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-zinc-400 text-xs">
                    No instruments found matching "{searchQuery}".
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => {
                  const isUp = asset.changePercent >= 0;
                  const isStarred = watchlist.includes(asset.symbol);
                  const decimals = asset.symbol.includes('JPY') ? 2 : asset.symbol.includes('EUR') || asset.symbol.includes('GBP') ? 4 : 2;

                  return (
                    <tr
                      key={asset.symbol}
                      onClick={() => setSelectedAsset(asset)}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer group"
                    >
                      {/* Watchlist Toggle */}
                      <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleWatchlist(asset.symbol)}
                          className={`p-1 rounded text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors ${
                            isStarred ? 'text-zinc-950 dark:text-white' : ''
                          }`}
                        >
                          <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-current' : ''}`} />
                        </button>
                      </td>

                      {/* Instrument */}
                      <td className="py-2.5 px-3">
                        <strong className="text-zinc-950 dark:text-white font-bold block">
                          {asset.symbol}
                        </strong>
                        <span className="text-[10px] text-zinc-500 font-sans block truncate max-w-xs">{asset.name}</span>
                      </td>

                      {/* Bid */}
                      <td className="py-2.5 px-3 font-bold tabular-nums text-zinc-950 dark:text-white">
                        ${(asset.bid ?? asset.price).toFixed(decimals)}
                      </td>

                      {/* Ask */}
                      <td className="py-2.5 px-3 text-zinc-500 tabular-nums font-semibold">
                        ${(asset.ask ?? asset.price).toFixed(decimals)}
                      </td>

                      {/* Change */}
                      <td className="py-2.5 px-3">
                        <span className={`font-bold tabular-nums ${isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {isUp ? '▲ +' : '▼ -'}{Math.abs(asset.changePercent).toFixed(2)}%
                        </span>
                      </td>

                      {/* Actions: Trade Modal / Dedicated Chart in New Tab */}
                      <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedAsset(asset)}
                            className="px-2 py-1 rounded bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-[11px] font-bold transition-colors"
                          >
                            Quote & Order
                          </button>

                          <a
                            href={`/trade?symbol=${encodeURIComponent(asset.symbol)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-[11px] font-bold inline-flex items-center gap-1 transition-colors"
                            title="Open Real-Time Candlestick Chart in New Tab"
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

      {/* Interactive Asset Detail & Order Modal */}
      <InstrumentDetailModal
        asset={selectedAsset}
        isOpen={Boolean(selectedAsset)}
        onClose={() => setSelectedAsset(null)}
      />

    </div>
  );
}
