'use client';

import React from 'react';

const Shimmer: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className = '', style }) => (
  <div
    style={style}
    className={`animate-pulse bg-slate-200/80 dark:bg-slate-800/70 rounded-xl relative overflow-hidden ${className}`}
  />
);

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto select-none" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading trading dashboard…</span>

      {/* Page Title Shimmer */}
      <div className="flex items-center justify-between">
        <Shimmer className="h-7 w-28 rounded-lg" />
        <Shimmer className="h-5 w-36 rounded-md hidden sm:block" />
      </div>

      {/* Main 2-Column Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Left 8-Column Zone */}
        <div className="xl:col-span-8 space-y-6">
          
          {/* Top 4 Market Overview Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Shimmer className="h-4 w-32 rounded-md" />
              <Shimmer className="h-4 w-24 rounded-md" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {[
                { symbol: 'XAU/USD', width: 'w-20' },
                { symbol: 'EUR/USD', width: 'w-20' },
                { symbol: 'GBP/USD', width: 'w-20' },
                { symbol: 'BTC/USD', width: 'w-20' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-2xs"
                >
                  <div className="space-y-1.5">
                    <Shimmer className={`h-3.5 ${item.width} rounded-md`} />
                    <Shimmer className="h-6 w-24 rounded-md" />
                    <Shimmer className="h-3 w-16 rounded-md" />
                  </div>
                  {/* Simulated Mini Sparkline curve */}
                  <div className="h-8 w-full flex items-end gap-1 pt-2">
                    {[40, 65, 55, 80, 70, 90, 85, 100].map((h, i) => (
                      <Shimmer
                        key={i}
                        className="flex-1 rounded-xs"
                        style={{ height: `${h}%` } as React.CSSProperties}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hero Candlestick Chart Skeleton */}
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
            
            {/* Chart Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <Shimmer className="h-6 w-24 rounded-lg" />
                <Shimmer className="h-6 w-28 rounded-lg" />
                <Shimmer className="h-4 w-16 rounded-md" />
              </div>

              {/* Timeframe selector pills */}
              <div className="flex items-center gap-1">
                {['1m', '5m', '15m', '1h', '4h', '1D'].map((tf) => (
                  <Shimmer key={tf} className="h-6 w-8 rounded-lg" />
                ))}
              </div>
            </div>

            {/* Simulated Candlestick Canvas */}
            <div className="h-72 sm:h-80 w-full relative flex items-end justify-between px-2 sm:px-6 pt-6 pb-2">
              {/* Background Gridlines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-30 py-4">
                <div className="border-b border-dashed border-slate-300 dark:border-slate-700 w-full" />
                <div className="border-b border-dashed border-slate-300 dark:border-slate-700 w-full" />
                <div className="border-b border-dashed border-slate-300 dark:border-slate-700 w-full" />
                <div className="border-b border-dashed border-slate-300 dark:border-slate-700 w-full" />
              </div>

              {/* Simulated Candlesticks */}
              {[45, 60, 52, 75, 68, 85, 78, 92, 88, 65, 72, 80, 95, 90, 82, 98].map((candleH, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1 z-10 w-2.5 sm:w-3.5">
                  <Shimmer className="w-0.5 h-3 rounded-full opacity-60" />
                  <Shimmer
                    className="w-full rounded-xs"
                    style={{ height: `${candleH * 1.8}px` } as React.CSSProperties}
                  />
                  <Shimmer className="w-0.5 h-3 rounded-full opacity-60" />
                </div>
              ))}
            </div>

            {/* Chart Footer stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Shimmer className="h-2.5 w-12 rounded-sm" />
                  <Shimmer className="h-4 w-20 rounded-md" />
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Grid: Open Positions & Signals */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            
            {/* Open Positions Card (7 cols) */}
            <div className="lg:col-span-7 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <Shimmer className="h-4 w-28 rounded-md" />
                <Shimmer className="h-3.5 w-14 rounded-md" />
              </div>

              <div className="space-y-2.5 py-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                    <div className="flex items-center gap-2.5">
                      <Shimmer className="w-6 h-6 rounded-md" />
                      <div className="space-y-1">
                        <Shimmer className="h-3.5 w-20 rounded-md" />
                        <Shimmer className="h-2.5 w-12 rounded-sm" />
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <Shimmer className="h-3.5 w-16 rounded-md ml-auto" />
                      <Shimmer className="h-2.5 w-10 rounded-sm ml-auto" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Market Signals Card (5 cols) */}
            <div className="lg:col-span-5 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <Shimmer className="h-4 w-28 rounded-md" />
                <Shimmer className="h-3.5 w-14 rounded-md" />
              </div>

              <div className="space-y-2.5 py-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                    <Shimmer className="h-3.5 w-16 rounded-md" />
                    <Shimmer className="h-5 w-14 rounded-md" />
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* Right 4-Column Sidebar Zone */}
        <div className="xl:col-span-4 space-y-5">
          
          {/* Account Summary Card Skeleton */}
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
            
            <div className="flex items-center justify-between">
              <Shimmer className="h-4 w-32 rounded-md" />
              <Shimmer className="w-5 h-5 rounded-full" />
            </div>

            {/* Total Balance Big Number */}
            <div className="space-y-2 py-1">
              <Shimmer className="h-3 w-20 rounded-md" />
              <Shimmer className="h-9 w-44 rounded-lg" />
              <Shimmer className="h-3.5 w-28 rounded-md" />
            </div>

            {/* Split Metrics Box */}
            <div className="grid grid-cols-2 gap-3 py-3 border-t border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <Shimmer className="h-2.5 w-20 rounded-sm" />
                <Shimmer className="h-4 w-24 rounded-md" />
              </div>
              <div className="space-y-1">
                <Shimmer className="h-2.5 w-20 rounded-sm" />
                <Shimmer className="h-4 w-24 rounded-md" />
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <Shimmer className="h-10 w-full rounded-xl" />
              <Shimmer className="h-10 w-full rounded-xl" />
            </div>
          </div>

          {/* Instant Deposit / Quick Card Skeleton */}
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <Shimmer className="h-4 w-28 rounded-md" />
              <Shimmer className="h-4 w-12 rounded-full" />
            </div>

            <div className="space-y-2.5 py-1">
              <Shimmer className="h-3 w-36 rounded-md" />
              <div className="grid grid-cols-3 gap-2">
                <Shimmer className="h-8 w-full rounded-lg" />
                <Shimmer className="h-8 w-full rounded-lg" />
                <Shimmer className="h-8 w-full rounded-lg" />
              </div>
              <Shimmer className="h-10 w-full rounded-xl mt-2" />
            </div>
          </div>

          {/* Quick Watchlist Snapshot Card */}
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <Shimmer className="h-4 w-24 rounded-md" />
              <Shimmer className="h-3.5 w-12 rounded-md" />
            </div>

            <div className="space-y-2 py-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-1.5">
                  <Shimmer className="h-3.5 w-16 rounded-md" />
                  <Shimmer className="h-3.5 w-14 rounded-md" />
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
