'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Star, ChevronRight, TrendingUp, Plus } from 'lucide-react';
import { useApp } from '@/lib/store';

export default function WatchlistPage() {
  const router = useRouter();
  const { marketAssets, watchlist, toggleWatchlist } = useApp();

  const watchlistAssets = marketAssets.filter((a) => watchlist.includes(a.symbol));

  return (
    <div className="space-y-5 max-w-5xl">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Watchlist
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Track your favorite instruments and monitor real-time price movements.
          </p>
        </div>

        <Link
          href="/markets"
          className="px-3.5 py-2 rounded-xl bg-slate-950 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Instruments</span>
        </Link>
      </div>

      {/* Watchlist Content Section */}
      <div className="rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
        {watchlistAssets.length === 0 ? (
          <div className="p-10 sm:p-12 text-center text-xs text-slate-400 dark:text-slate-500 space-y-3">
            <p>Your watchlist is currently empty.</p>
            <Link
              href="/markets"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-950 dark:bg-emerald-600 text-white font-bold text-xs shadow-2xs hover:bg-slate-800 dark:hover:bg-emerald-500 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Browse All Markets</span>
            </Link>
          </div>
        ) : (
          <>
            {/* Mobile View (sm:hidden) */}
            <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800 p-2 space-y-1.5">
              {watchlistAssets.map((asset) => {
                const isUp = asset.changePercent >= 0;

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
                        className="p-1 rounded text-amber-400 fill-amber-400 hover:text-slate-400"
                      >
                        <Star className="w-3.5 h-3.5 fill-current" />
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
              })}
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
                  {watchlistAssets.map((asset) => {
                    const isUp = asset.changePercent >= 0;

                    return (
                      <tr
                        key={asset.symbol}
                        onClick={() => router.push(`/trade?symbol=${encodeURIComponent(asset.symbol)}`)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => toggleWatchlist(asset.symbol)}
                            className="p-1 rounded text-amber-400 fill-amber-400 hover:text-slate-400 transition-colors"
                          >
                            <Star className="w-3.5 h-3.5 fill-current" />
                          </button>
                        </td>

                        <td className="py-3.5 px-4">
                          <strong className="text-slate-900 dark:text-white font-bold block group-hover:text-slate-950 dark:group-hover:text-emerald-400 transition-colors">
                            {asset.symbol}
                          </strong>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate max-w-xs">{asset.name}</span>
                        </td>

                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                          ${(asset.bid ?? asset.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: (asset.bid ?? asset.price) > 100 ? 2 : 4 })}
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-semibold">
                          ${(asset.ask ?? asset.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: (asset.ask ?? asset.price) > 100 ? 2 : 4 })}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-0.5 font-bold ${
                            isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            {isUp ? '+' : ''}{asset.changePercent}%
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <span className="inline-flex items-center gap-1 text-slate-400 dark:text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white font-semibold text-xs transition-colors">
                            <span>Trade</span>
                            <ChevronRight className="w-3.5 h-3.5" />
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
