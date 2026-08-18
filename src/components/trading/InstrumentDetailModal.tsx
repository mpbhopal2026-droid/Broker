'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  X,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Plus,
  Minus,
  Sliders,
  ShieldCheck,
  Zap,
  Star
} from 'lucide-react';
import { MarketAsset } from '@/lib/types';
import { useApp } from '@/lib/store';
import { formatUSD } from '@/lib/utils';
import { InsufficientFundsModal } from '@/components/trading/InsufficientFundsModal';

interface InstrumentDetailModalProps {
  asset: MarketAsset | null;
  isOpen: boolean;
  onClose: () => void;
}

const LOT_CHIPS = [0.01, 0.05, 0.10, 0.50, 1.00];

export const InstrumentDetailModal: React.FC<InstrumentDetailModalProps> = ({
  asset,
  isOpen,
  onClose,
}) => {
  const {
    currentUser,
    isDemo,
    openTrade,
    showToast,
    watchlist,
    toggleWatchlist
  } = useApp();

  const [lotSize, setLotSize] = useState<number>(0.10);
  const [showGatekeeperModal, setShowGatekeeperModal] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  if (!isOpen || !asset) return null;

  const isStarred = watchlist.includes(asset.symbol);
  const isUp = asset.changePercent >= 0;
  const spreadValue = asset.spread ?? (asset.symbol.includes('XAU') ? 0.30 : 0.0002);
  const bidPrice = asset.bid ?? (asset.price - spreadValue / 2);
  const askPrice = asset.ask ?? (asset.price + spreadValue / 2);
  const decimals = asset.symbol.includes('JPY') ? 2 : asset.symbol.includes('EUR') || asset.symbol.includes('GBP') ? 4 : 2;

  const handleStepLot = (delta: number) => {
    setLotSize((prev) => {
      const next = parseFloat((prev + delta).toFixed(2));
      return next > 0.01 ? (next <= 20.0 ? next : 20.0) : 0.01;
    });
  };

  const handleExecute = async (side: 'BUY' | 'SELL') => {
    const balance = isDemo ? 10000 : (currentUser?.walletBalance ?? 0);
    if (!isDemo && balance <= 0) {
      setShowGatekeeperModal(true);
      return;
    }

    setIsExecuting(true);
    const calculatedMargin = parseFloat(((lotSize * asset.price) / 100).toFixed(2)) || 10.00;

    const res = await openTrade(
      asset.symbol,
      asset.name,
      side,
      lotSize,
      calculatedMargin,
      100
    );

    setIsExecuting(false);

    if (res?.success) {
      showToast({
        type: 'success',
        title: 'Position Opened',
        message: `${side} ${lotSize} Lot ${asset.symbol} executed at ${side === 'BUY' ? askPrice.toFixed(decimals) : bidPrice.toFixed(decimals)}`,
      });
      onClose();
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xs select-none"
        onClick={onClose}
      >
        <div
          className="w-full max-w-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-t-xl sm:rounded-md p-4 sm:p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom sm:zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-900">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleWatchlist(asset.symbol)}
                className={`p-1 rounded text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors ${
                  isStarred ? 'text-zinc-950 dark:text-white' : ''
                }`}
                title="Toggle Watchlist"
              >
                <Star className={`w-4 h-4 ${isStarred ? 'fill-current' : ''}`} />
              </button>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-zinc-950 dark:text-white">{asset.symbol}</h3>
                  <span className="text-[10px] text-zinc-400 uppercase font-sans">({asset.category})</span>
                </div>
                <p className="text-[11px] text-zinc-500 font-sans truncate">{asset.name}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Primary Quote Stats Ribbon */}
          <div className="grid grid-cols-3 gap-2 p-3 rounded-md bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center">
            <div>
              <span className="text-[10px] text-zinc-400 block uppercase">Last Price</span>
              <span className="text-sm font-bold tabular-nums text-zinc-950 dark:text-white">
                ${asset.price.toFixed(decimals)}
              </span>
            </div>
            <div className="border-x border-zinc-200 dark:border-zinc-800">
              <span className="text-[10px] text-zinc-400 block uppercase">24h Delta</span>
              <span className={`text-sm font-bold tabular-nums ${isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {isUp ? '▲ +' : '▼ -'}{Math.abs(asset.changePercent).toFixed(2)}%
              </span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 block uppercase">Spread</span>
              <span className="text-sm font-bold tabular-nums text-zinc-950 dark:text-white">
                {spreadValue} pips
              </span>
            </div>
          </div>

          {/* Additional Quote Metrics */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded bg-zinc-50/60 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 flex justify-between">
              <span className="text-zinc-400">24h High:</span>
              <span className="font-bold tabular-nums text-zinc-950 dark:text-white">${(asset.high24h ?? asset.price * 1.01).toFixed(decimals)}</span>
            </div>
            <div className="p-2 rounded bg-zinc-50/60 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 flex justify-between">
              <span className="text-zinc-400">24h Low:</span>
              <span className="font-bold tabular-nums text-zinc-950 dark:text-white">${(asset.low24h ?? asset.price * 0.99).toFixed(decimals)}</span>
            </div>
          </div>

          {/* DEDICATED REAL-TIME CHART BUTTON (Opens in New Tab) */}
          <div className="pt-1">
            <a
              href={`/trade?symbol=${encodeURIComponent(asset.symbol)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2 px-3 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-950 dark:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors group"
            >
              <span>View Real-Time Candlestick Chart</span>
              <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-950 dark:group-hover:text-white transition-colors" />
            </a>
          </div>

          {/* Order Stepper & Chips */}
          <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-900">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-zinc-400">Contract Lot Size</span>
              <span className="text-[10px] text-zinc-500">100x Leverage</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Counter */}
              <div className="flex items-center bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md p-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleStepLot(-0.01)}
                  className="p-1 rounded text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={lotSize}
                  onChange={(e) => setLotSize(parseFloat(e.target.value) || 0.01)}
                  className="w-12 text-center bg-transparent text-xs font-bold tabular-nums text-zinc-950 dark:text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleStepLot(0.01)}
                  className="p-1 rounded text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {/* Chips */}
              <div className="flex items-center gap-1 overflow-x-auto flex-1 no-scrollbar">
                {LOT_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setLotSize(chip)}
                    className={`px-2 py-1 rounded text-xs font-bold tabular-nums transition-colors ${
                      lotSize === chip
                        ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950'
                        : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800'
                    }`}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Instant Split BUY & SELL Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                disabled={isExecuting}
                onClick={() => handleExecute('SELL')}
                className="py-2.5 px-3 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white flex flex-col items-center justify-center transition-colors cursor-pointer active:scale-[0.98]"
              >
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-zinc-400">
                  <TrendingDown className="w-3 h-3 text-rose-400" />
                  <span>SELL (BID)</span>
                </div>
                <span className="text-sm font-bold tabular-nums">{bidPrice.toFixed(decimals)}</span>
              </button>

              <button
                type="button"
                disabled={isExecuting}
                onClick={() => handleExecute('BUY')}
                className="py-2.5 px-3 rounded-md bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 flex flex-col items-center justify-center transition-colors cursor-pointer active:scale-[0.98]"
              >
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-600">
                  <TrendingUp className="w-3 h-3 text-emerald-600" />
                  <span>BUY (ASK)</span>
                </div>
                <span className="text-sm font-bold tabular-nums">{askPrice.toFixed(decimals)}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <InsufficientFundsModal
        isOpen={showGatekeeperModal}
        onClose={() => setShowGatekeeperModal(false)}
        symbol={asset.symbol}
      />
    </>
  );
};
