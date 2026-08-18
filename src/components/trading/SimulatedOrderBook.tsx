'use client';

import React, { useState, useEffect } from 'react';
import { MarketAsset, OrderBookEntry } from '@/lib/types';

interface OrderBookProps {
  asset: MarketAsset;
}

export const SimulatedOrderBook: React.FC<OrderBookProps> = ({ asset }) => {
  const [bids, setBids] = useState<OrderBookEntry[]>([]);
  const [asks, setAsks] = useState<OrderBookEntry[]>([]);

  useEffect(() => {
    const base = asset.price;
    const step = base > 500 ? 1.5 : base > 20 ? 0.05 : 0.0004;

    const newBids: OrderBookEntry[] = [];
    const newAsks: OrderBookEntry[] = [];

    let bidTotal = 0;
    for (let i = 1; i <= 6; i++) {
      const p = Number((base - i * step).toFixed(base > 500 ? 2 : 4));
      const size = Number(((Math.random() * 2.5 + 0.2) * (base > 500 ? 0.5 : 10)).toFixed(2));
      bidTotal += size;
      newBids.push({ price: p, size, total: Number(bidTotal.toFixed(2)) });
    }

    let askTotal = 0;
    for (let i = 1; i <= 6; i++) {
      const p = Number((base + i * step).toFixed(base > 500 ? 2 : 4));
      const size = Number(((Math.random() * 2.5 + 0.2) * (base > 500 ? 0.5 : 10)).toFixed(2));
      askTotal += size;
      newAsks.push({ price: p, size, total: Number(askTotal.toFixed(2)) });
    }

    setBids(newBids);
    setAsks(newAsks.reverse());
  }, [asset.price]);

  const maxTotal = Math.max(
    ...bids.map(b => b.total),
    ...asks.map(a => a.total),
    1
  );

  return (
    <div className="rounded-xl bg-[#0d121c] border border-slate-800 p-3.5 space-y-2 text-xs font-mono select-none">
      
      {/* Header */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 font-sans uppercase font-bold tracking-wider pb-1.5 border-b border-slate-800">
        <span>Order Book (DOM)</span>
        <span className="text-[#00d674] font-mono">Spread: {asset.spread} pips</span>
      </div>

      {/* Asks (Sell orders - Red) */}
      <div className="space-y-1">
        {asks.map((ask, idx) => {
          const depthPct = Math.min(100, Math.round((ask.total / maxTotal) * 100));
          return (
            <div key={idx} className="relative flex justify-between items-center py-0.5 px-1 text-[11px] rounded overflow-hidden">
              <div
                className="absolute right-0 top-0 bottom-0 bg-[#ff3b57]/15 rounded pointer-events-none transition-all duration-300"
                style={{ width: `${depthPct}%` }}
              />
              <span className="text-[#ff3b57] font-bold z-10">{ask.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              <span className="text-slate-400 z-10">{ask.size.toFixed(2)}</span>
            </div>
          );
        })}
      </div>

      {/* Mid Market Spread Bar */}
      <div className="py-1 px-2 rounded-lg bg-[#070b12] border border-slate-800/80 flex items-center justify-between font-bold">
        <span className="text-white text-xs font-mono">{asset.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        <span className={`text-[10px] font-bold ${asset.changePercent >= 0 ? 'text-[#00d674]' : 'text-[#ff3b57]'}`}>
          {asset.changePercent >= 0 ? '▲' : '▼'} {asset.changePercent}%
        </span>
      </div>

      {/* Bids (Buy orders - Green) */}
      <div className="space-y-1">
        {bids.map((bid, idx) => {
          const depthPct = Math.min(100, Math.round((bid.total / maxTotal) * 100));
          return (
            <div key={idx} className="relative flex justify-between items-center py-0.5 px-1 text-[11px] rounded overflow-hidden">
              <div
                className="absolute right-0 top-0 bottom-0 bg-[#00d674]/15 rounded pointer-events-none transition-all duration-300"
                style={{ width: `${depthPct}%` }}
              />
              <span className="text-[#00d674] font-bold z-10">{bid.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              <span className="text-slate-400 z-10">{bid.size.toFixed(2)}</span>
            </div>
          );
        })}
      </div>

    </div>
  );
};
