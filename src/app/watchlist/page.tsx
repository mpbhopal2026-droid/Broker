'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Star, ChevronRight, Plus, ExternalLink } from 'lucide-react';
import { useApp } from '@/lib/store';
import { MarketAsset } from '@/lib/types';
import { InstrumentDetailModal } from '@/components/trading/InstrumentDetailModal';

export default function MonochromeWatchlistPage() {
  const router = useRouter();
  const { marketAssets, watchlist, toggleWatchlist } = useApp();
  const [selectedAsset, setSelectedAsset] = useState<MarketAsset | null>(null);

  const watchlistAssets = marketAssets.filter((a) => watchlist.includes(a.symbol));

  return (
    <div className="space-y-4 max-w-5xl mx-auto select-none">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-base sm:text-lg font-bold uppercase tracking-tight text-zinc-950 dark:text-white">
            Custom Watchlist ({watchlistAssets.length})
          </h1>
          <p className="text-[11px] text-zinc-500 font-sans mt-0.5">
            Click any instrument for order placement or launch live candlestick charts in a new tab.
          </p>
        </div>

        <Link
          href="/markets"
          className="px-2.5 py-1.5 rounded-md bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-bold transition-colors flex items-center gap-1 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Instruments</span>
        </Link>
      </div>

      {/* Watchlist Table */}
      <div className="rounded-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {watchlistAssets.length === 0 ? (
          <div className="p-10 text-center text-xs text-zinc-400 space-y-2.5">
            <p>Your watchlist is currently empty.</p>
            <Link
              href="/markets"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-bold text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Browse All Instruments</span>
            </Link>
          </div>
        ) : (
          <>
            {/* Mobile View */}
            <div className="sm:hidden divide-y divide-zinc-100 dark:divide-zinc-900">
              {watchlistAssets.map((asset) => {
                const isUp = asset.changePercent >= 0;
                const decimals = asset.symbol.includes('JPY') ? 2 : asset.symbol.includes('EUR') || asset.symbol.includes('GBP') ? 4 : 2;

                return (
                  <div
                    key={asset.symbol}
                    onClick={() => router.push(`/market?symbol=${encodeURIComponent(asset.symbol)}`)}
                    className="p-3 flex items-center justify-between cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWatchlist(asset.symbol);
                        }}
                        className="p-1 rounded text-zinc-950 dark:text-white"
                      >
                        <Star className="w-3.5 h-3.5 fill-current" />
                      </button>
                      <div>
                        <strong className="text-zinc-950 dark:text-white font-bold text-xs block">{asset.symbol}</strong>
                        <span className="text-[10px] text-zinc-500 font-sans block truncate max-w-[130px]">{asset.name}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="font-bold tabular-nums text-zinc-950 dark:text-white text-xs block">
                          ${asset.price.toFixed(decimals)}
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
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
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
                  {watchlistAssets.map((asset) => {
                    const isUp = asset.changePercent >= 0;
                    const decimals = asset.symbol.includes('JPY') ? 2 : asset.symbol.includes('EUR') || asset.symbol.includes('GBP') ? 4 : 2;

                    return (
                      <tr
                        key={asset.symbol}
                        onClick={() => router.push(`/market?symbol=${encodeURIComponent(asset.symbol)}`)}
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer group"
                      >
                        <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => toggleWatchlist(asset.symbol)}
                            className="p-1 rounded text-zinc-950 dark:text-white transition-colors"
                          >
                            <Star className="w-3.5 h-3.5 fill-current" />
                          </button>
                        </td>

                        <td className="py-2.5 px-3">
                          <strong className="text-zinc-950 dark:text-white font-bold block">
                            {asset.symbol}
                          </strong>
                          <span className="text-[10px] text-zinc-500 font-sans block truncate max-w-xs">{asset.name}</span>
                        </td>

                        <td className="py-2.5 px-3 font-bold tabular-nums text-zinc-950 dark:text-white">
                          ${(asset.bid ?? asset.price).toFixed(decimals)}
                        </td>

                        <td className="py-2.5 px-3 text-zinc-500 tabular-nums font-semibold">
                          ${(asset.ask ?? asset.price).toFixed(decimals)}
                        </td>

                        <td className="py-2.5 px-3">
                          <span className={`font-bold tabular-nums ${isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {isUp ? '▲ +' : '▼ -'}{Math.abs(asset.changePercent).toFixed(2)}%
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-1.5">
                            <Link
                              href={`/market?symbol=${encodeURIComponent(asset.symbol)}`}
                              className="px-3 py-1 rounded-md bg-[#e6f4ea] dark:bg-emerald-950/60 text-[#00875a] dark:text-emerald-400 hover:bg-[#d4edd9] dark:hover:bg-emerald-900/80 border border-[#b7e4c7] dark:border-emerald-800 text-xs font-bold transition-colors"
                            >
                              Details & Trade
                            </Link>

                            <a
                              href={`/trade?symbol=${encodeURIComponent(asset.symbol)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                              title="Open Real-Time Candlestick Chart in New Tab"
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
          </>
        )}
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
