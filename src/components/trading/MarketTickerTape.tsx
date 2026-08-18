'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/lib/store';
import { TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export const MarketTickerTape: React.FC = () => {
  const { marketAssets } = useApp();

  const activeAssets = marketAssets.slice(0, 10);

  return (
    <div className="w-full bg-[#070b12] border-y border-slate-800/80 overflow-hidden py-1.5 select-none">
      <div className="flex items-center gap-6 overflow-x-auto scrollbar-none px-4 text-xs font-mono whitespace-nowrap">
        {activeAssets.map((asset) => {
          const isUp = asset.changePercent >= 0;
          return (
            <Link
              key={asset.symbol}
              href={`/market?pair=${encodeURIComponent(asset.symbol)}`}
              className="inline-flex items-center gap-2 hover:bg-slate-900/60 px-2 py-0.5 rounded-lg transition-colors group"
            >
              <strong className="text-white font-sans text-xs group-hover:text-[#00d674] transition-colors">{asset.symbol}</strong>
              <span className="text-slate-300 font-bold">{asset.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              <span className={`inline-flex items-center font-bold text-[11px] ${isUp ? 'text-[#00d674]' : 'text-[#ff3b57]'}`}>
                {isUp ? '+' : ''}{asset.changePercent}%
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
