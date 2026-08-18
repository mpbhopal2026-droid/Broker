'use client';

import React from 'react';

interface SkeletonProps {
  className?: string;
  count?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = 'h-4 w-full', count = 1 }) => {
  if (count > 1) {
    return (
      <div className="space-y-2 w-full">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={`skeleton-box ${className}`} />
        ))}
      </div>
    );
  }
  return <div className={`skeleton-box ${className}`} />;
};

export const ChartSkeleton: React.FC<{ height?: number }> = ({ height = 500 }) => {
  return (
    <div
      style={{ height: `${height}px` }}
      className="w-full rounded-xl bg-slate-950/90 border border-slate-800 p-6 flex flex-col justify-between overflow-hidden relative"
    >
      {/* Top Bar Skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-24 rounded-lg" />
          <Skeleton className="h-5 w-32 rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-16 rounded-lg" />
          <Skeleton className="h-7 w-16 rounded-lg" />
        </div>
      </div>

      {/* Candlestick Lines Simulation */}
      <div className="flex items-end justify-between gap-1.5 h-3/5 px-4 opacity-30">
        {Array.from({ length: 28 }).map((_, i) => {
          const heights = ['h-16', 'h-28', 'h-44', 'h-32', 'h-52', 'h-24', 'h-40'];
          const isUp = i % 2 === 0;
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end">
              <div className={`w-0.5 h-6 ${isUp ? 'bg-[#00d674]' : 'bg-[#ff3b57]'}`} />
              <div
                className={`w-full ${heights[i % heights.length]} rounded-sm ${
                  isUp ? 'bg-[#00d674]' : 'bg-[#ff3b57]'
                }`}
              />
              <div className={`w-0.5 h-4 ${isUp ? 'bg-[#00d674]' : 'bg-[#ff3b57]'}`} />
            </div>
          );
        })}
      </div>

      {/* Bottom Timeline Skeleton */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
};

export const MarketTableSkeleton: React.FC<{ rows?: number }> = ({ rows = 6 }) => {
  return (
    <div className="w-full rounded-xl border border-slate-800 divide-y divide-slate-800 bg-[#0d121c]">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-full" />
            <div>
              <Skeleton className="h-4 w-20 mb-1" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <div className="text-right">
            <Skeleton className="h-4 w-24 mb-1 ml-auto" />
            <Skeleton className="h-3 w-14 ml-auto" />
          </div>
        </div>
      ))}
    </div>
  );
};
