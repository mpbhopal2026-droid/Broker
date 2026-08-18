'use client';

import React, { useState, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Star,
  ChevronDown,
  TrendingUp,
  ArrowUpRight,
  Info,
  Calendar,
  FileText,
  Newspaper
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { formatUSD } from '@/lib/utils';
import { RealLiveTradingChart } from '@/components/trading/RealLiveTradingChart';
import { OrderSuccessReactionModal } from '@/components/trading/OrderSuccessReactionModal';
import { TradeOrder } from '@/lib/types';

function TradePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const symbolParam = searchParams.get('symbol') || searchParams.get('pair') || 'XAU/USD';

  const {
    currentUser,
    marketAssets,
    openTrade,
    watchlist,
    toggleWatchlist,
    showToast,
  } = useApp();

  // Order state
  const [orderSide, setOrderSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState('Market Order');
  const [margin, setMargin] = useState<number>(100);
  const [leverage, setLeverage] = useState<number>(100);
  const [enableTP, setEnableTP] = useState<boolean>(false);
  const [takeProfitPrice, setTakeProfitPrice] = useState<string>('2445.00');
  const [enableSL, setEnableSL] = useState<boolean>(false);
  const [stopLossPrice, setStopLossPrice] = useState<string>('2395.00');

  // Bottom tabs state
  const [activeTab, setActiveTab] = useState<'overview' | 'news' | 'calendar' | 'specs'>('overview');

  // Reaction pop-up state
  const [executedOrder, setExecutedOrder] = useState<TradeOrder | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState<boolean>(false);

  const activeAsset = useMemo(() => {
    // Fall back to a real instrument, never an invented one. This used to
    // return a hardcoded XAU/USD at 2416.29, so an unknown or mistyped symbol
    // put a fabricated price on the trade ticket — the screen a client uses to
    // decide what to buy.
    return marketAssets.find((a) => a.symbol === symbolParam) || marketAssets[0] || null;
  }, [marketAssets, symbolParam]);

  const isWatchlisted = watchlist.includes(activeAsset.symbol);

  // Position calculations
  const price = activeAsset.price || 0;
  const positionLotSize = ((margin * leverage) / (price * 100)).toFixed(2);
  const pipValue = (parseFloat(positionLotSize) * 1.0).toFixed(2);
  const isBuy = orderSide === 'BUY';
  const estLiquidation = isBuy
    ? (price * (1 - 0.85 / leverage)).toFixed(2)
    : (price * (1 + 0.85 / leverage)).toFixed(2);

  const quickMargins = [25, 50, 100, 250, 500];
  const leverages = [10, 25, 50, 100, 200];

  const handleExecuteTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      showToast({ type: 'error', title: 'Sign In Required', message: 'Please log in to trade.' });
      return;
    }
    if (margin <= 0 || margin > currentUser.walletBalance) {
      showToast({
        type: 'error',
        title: 'Insufficient Margin',
        message: `Available balance is ${formatUSD(currentUser.walletBalance)}.`,
      });
      return;
    }

    const res = await openTrade(
      activeAsset.symbol,
      activeAsset.name || activeAsset.symbol,
      orderSide,
      parseFloat(positionLotSize) || 0.01,
      margin,
      leverage,
      enableSL ? parseFloat(stopLossPrice) : undefined,
      enableTP ? parseFloat(takeProfitPrice) : undefined
    );

    if (res?.success) {
      const newOrder: TradeOrder = {
        id: `tr_${Date.now()}`,
        userId: currentUser.id,
        symbol: activeAsset.symbol,
        pairName: activeAsset.name || activeAsset.symbol,
        type: orderSide,
        lotSize: parseFloat(positionLotSize) || 0.01,
        entryPrice: price,
        currentPrice: price,
        margin: margin,
        leverage: leverage,
        stopLoss: enableSL ? parseFloat(stopLossPrice) : undefined,
        takeProfit: enableTP ? parseFloat(takeProfitPrice) : undefined,
        pnl: 0,
        pnlPercentage: 0,
        status: 'OPEN',
        openedAt: new Date().toISOString(),
      };
      setExecutedOrder(newOrder);
      setIsSuccessModalOpen(true);
      showToast({
        type: 'success',
        title: 'Order Executed',
        message: `${orderSide} ${positionLotSize} LOT on ${activeAsset.symbol}`,
      });
    }
  };

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto select-none">
      
      {/* 1. Top Navigation Bar: Back link & Watchlist button */}
      <div className="flex items-center justify-between">
        <Link
          href="/markets"
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Markets</span>
        </Link>

        <button
          onClick={() => toggleWatchlist(activeAsset.symbol)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all shadow-2xs ${
            isWatchlisted
              ? 'bg-amber-50/80 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Star className={`w-3.5 h-3.5 ${isWatchlisted ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
          <span>{isWatchlisted ? 'Watchlisted' : 'Add to Watchlist'}</span>
        </button>
      </div>

      {/* 2. Top Instrument Header Bar */}
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        
        {/* Left: Symbol, Type, Name */}
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
              {activeAsset.symbol}
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
              {activeAsset.category || 'COMMODITIES'}
            </span>
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {activeAsset.name || 'Spot Gold / US Dollar'}
          </p>
        </div>

        {/* Middle-Left: Live Price & 24h Change */}
        <div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
            {price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            +18.20 (+0.75%)
          </span>
        </div>

        {/* Middle-Right: 24H Stats */}
        <div className="flex items-center gap-6 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-medium">24H High</span>
            <span className="font-bold text-slate-900 dark:text-white font-mono">2,428.61</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-medium">24H Low</span>
            <span className="font-bold text-slate-900 dark:text-white font-mono">2,392.11</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-medium">24H Volume</span>
            <span className="font-bold text-slate-900 dark:text-white font-mono">128.45K</span>
          </div>
        </div>

        {/* Far Right: Signal Card */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 flex items-center gap-4 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-medium uppercase">Signal</span>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-mono">
              BUY
            </span>
          </div>
          <div className="border-l border-slate-200 dark:border-slate-700 pl-3">
            <span className="text-[11px] text-slate-600 dark:text-slate-300 block">Target: <strong className="text-slate-900 dark:text-white font-mono">$2,445</strong></span>
            <span className="text-[11px] text-slate-600 dark:text-slate-300 block">ROI: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">+135%</strong></span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
          </div>
        </div>

      </div>

      {/* 3. Main 2-Column Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        
        {/* Left 8 Columns */}
        <div className="xl:col-span-8 space-y-5">
          
          {/* Real Live Streaming Candlestick Chart */}
          <RealLiveTradingChart
            symbol={activeAsset.symbol}
            tvSymbol={activeAsset.tvSymbol}
            height={500}
          />

          {/* Bottom Tabs & Details Box */}
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
            
            {/* Tabs Header */}
            <div className="flex items-center border-b border-slate-100 dark:border-slate-800 px-4 gap-6 text-xs font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-[#0f172a]">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-3 transition-colors border-b-2 ${
                  activeTab === 'overview'
                    ? 'border-slate-950 dark:border-white text-slate-950 dark:text-white'
                    : 'border-transparent hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('news')}
                className={`py-3 transition-colors border-b-2 ${
                  activeTab === 'news'
                    ? 'border-slate-950 dark:border-white text-slate-950 dark:text-white'
                    : 'border-transparent hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                News
              </button>
              <button
                onClick={() => setActiveTab('calendar')}
                className={`py-3 transition-colors border-b-2 ${
                  activeTab === 'calendar'
                    ? 'border-slate-950 dark:border-white text-slate-950 dark:text-white'
                    : 'border-transparent hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Economic Calendar
              </button>
              <button
                onClick={() => setActiveTab('specs')}
                className={`py-3 transition-colors border-b-2 ${
                  activeTab === 'specs'
                    ? 'border-slate-950 dark:border-white text-slate-950 dark:text-white'
                    : 'border-transparent hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Specifications
              </button>
            </div>

            {/* Tab 1 Content: Overview */}
            {activeTab === 'overview' && (
              <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                
                {/* 1. Instrument Info Card */}
                <div className="p-4 rounded-xl bg-slate-50/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                  <h3 className="font-bold text-slate-900 dark:text-white text-xs pb-1 border-b border-slate-200/60 dark:border-slate-800">
                    Instrument Info
                  </h3>
                  <div className="space-y-1.5 text-slate-600 dark:text-slate-300">
                    <div className="flex justify-between">
                      <span>Base Currency</span>
                      <span className="font-bold text-slate-900 dark:text-white font-mono">XAU</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Quote Currency</span>
                      <span className="font-bold text-slate-900 dark:text-white font-mono">USD</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Contract Size</span>
                      <span className="font-bold text-slate-900 dark:text-white font-mono">100 Troy Ounce</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Spread</span>
                      <span className="font-bold text-slate-900 dark:text-white font-mono">0.28</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Trading Hours (GMT)</span>
                      <span className="font-bold text-slate-900 dark:text-white font-mono">00:00 - 24:00</span>
                    </div>
                  </div>
                </div>

                {/* 2. Market Sentiment Donut Card */}
                <div className="p-4 rounded-xl bg-slate-50/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2 flex flex-col justify-between">
                  <h3 className="font-bold text-slate-900 dark:text-white text-xs pb-1 border-b border-slate-200/60 dark:border-slate-800">
                    Market Sentiment
                  </h3>
                  
                  <div className="flex items-center justify-center gap-4 py-1">
                    {/* SVG Donut Ring */}
                    <div className="relative w-18 h-18">
                      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                        <circle
                          cx="18"
                          cy="18"
                          r="14"
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="4"
                        />
                        <circle
                          cx="18"
                          cy="18"
                          r="14"
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="4"
                          strokeDasharray="100"
                          strokeDashoffset="28"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>

                    <div className="space-y-1 font-mono text-xs">
                      <div>
                        <span className="font-black text-emerald-600 dark:text-emerald-400 block text-sm">72%</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans">Buy</span>
                      </div>
                      <div>
                        <span className="font-black text-rose-600 dark:text-rose-400 block text-sm">28%</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans">Sell</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
                    Based on 1,245 client positions
                  </p>
                </div>

                {/* 3. Performance Card */}
                <div className="p-4 rounded-xl bg-slate-50/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                  <h3 className="font-bold text-slate-900 dark:text-white text-xs pb-1 border-b border-slate-200/60 dark:border-slate-800">
                    Performance
                  </h3>
                  <div className="space-y-1.5 font-mono text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400 font-sans">1D</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">+0.75%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400 font-sans">1W</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">+1.82%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400 font-sans">1M</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">+2.41%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400 font-sans">3M</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">+5.22%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400 font-sans">1Y</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">+18.45%</span>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* Tab 2: News */}
            {activeTab === 'news' && (
              <div className="p-5 space-y-3 text-xs">
                <div className="p-3 rounded-lg border border-slate-200/60 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">15 mins ago · Reuters</span>
                  <h4 className="font-bold text-slate-900 dark:text-white">Gold Hits Fresh Highs as US Inflation Data Cools</h4>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px]">Investors increase bets on Federal Reserve monetary easing as bullion demand surges.</p>
                </div>
              </div>
            )}

            {/* Tab 3: Economic Calendar */}
            {activeTab === 'calendar' && (
              <div className="p-5 space-y-2 text-xs">
                <div className="flex justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                  <span className="font-bold text-slate-900 dark:text-white">US Initial Jobless Claims</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">215K (Forecast)</span>
                </div>
              </div>
            )}

            {/* Tab 4: Specifications */}
            {activeTab === 'specs' && (
              <div className="p-5 space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-3 text-slate-700 dark:text-slate-300">
                  <p>Min Lot: <strong className="font-mono">0.01</strong></p>
                  <p>Max Leverage: <strong className="font-mono">200x</strong></p>
                  <p>Margin Call: <strong className="font-mono">50%</strong></p>
                  <p>Stop Out Level: <strong className="font-mono">30%</strong></p>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Right 4 Columns: Order Execution Ticket */}
        <div className="xl:col-span-4 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-2xs space-y-4">
          
          {/* 1. Buy / Sell Switch Tabs */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setOrderSide('BUY')}
              className={`py-2.5 rounded-lg text-xs font-bold transition-all shadow-2xs ${
                orderSide === 'BUY'
                  ? 'bg-[#009e60] text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Buy / Long
            </button>

            <button
              type="button"
              onClick={() => setOrderSide('SELL')}
              className={`py-2.5 rounded-lg text-xs font-bold transition-all shadow-2xs ${
                orderSide === 'SELL'
                  ? 'bg-[#e11d48] text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Sell / Short
            </button>
          </div>

          {/* 2. Order Type & Available Balance */}
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Order Type</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Available Balance: <strong className="text-slate-900 dark:text-white font-mono">{currentUser ? formatUSD(currentUser.walletBalance) : '$1,250.00'}</strong>
              </span>
            </div>

            <div className="relative">
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value)}
                className="w-full appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-700"
              >
                <option>Market Order</option>
                <option>Limit Order</option>
                <option>Stop Order</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 3. Margin (USD) & Quick Chips */}
          <div className="space-y-1.5 text-xs">
            <label className="block font-semibold text-slate-700 dark:text-slate-300">Margin (USD)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-slate-400 font-bold">$</span>
              <input
                type="number"
                value={margin}
                onChange={(e) => setMargin(Math.max(1, parseFloat(e.target.value) || 0))}
                min="1"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-7 pr-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-700"
              />
            </div>

            <div className="grid grid-cols-5 gap-1.5 pt-1">
              {quickMargins.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMargin(m)}
                  className={`py-1 rounded-md text-[11px] font-mono font-semibold transition-all border ${
                    margin === m
                      ? 'bg-slate-900 dark:bg-emerald-600 text-white border-slate-900 dark:border-emerald-600 font-bold'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  ${m}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Leverage Options */}
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Leverage</label>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">Max: 100x</span>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {leverages.map((lev) => (
                <button
                  key={lev}
                  type="button"
                  onClick={() => setLeverage(lev)}
                  className={`py-1 rounded-md text-[11px] font-mono font-semibold transition-all border ${
                    leverage === lev
                      ? 'bg-slate-900 dark:bg-emerald-600 text-white border-slate-900 dark:border-emerald-600 font-bold'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {lev}x
                </button>
              ))}
            </div>
          </div>

          {/* 5. Live Summary Breakdown List */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-sans">Entry Price (Market)</span>
              <span className="font-bold text-slate-900 dark:text-white">{price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-sans">Required Margin</span>
              <span className="font-bold text-slate-900 dark:text-white">{formatUSD(margin)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-sans">Leverage</span>
              <span className="font-bold text-slate-900 dark:text-white">{leverage}x</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-sans">Position Size</span>
              <span className="font-bold text-slate-900 dark:text-white">{positionLotSize} LOT</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-sans">Pip Value</span>
              <span className="font-bold text-slate-900 dark:text-white">${pipValue}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200/60 dark:border-slate-800 pt-1.5">
              <span className="text-slate-500 dark:text-slate-400 font-sans">Est. Liquidation Price</span>
              <span className="font-black text-rose-600 dark:text-rose-400">{estLiquidation}</span>
            </div>
          </div>

          {/* 6. TP / SL Checkboxes & Inputs */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 font-medium">
                <input
                  type="checkbox"
                  checked={enableTP}
                  onChange={(e) => setEnableTP(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 text-slate-900 dark:text-emerald-500 focus:ring-0"
                />
                <span>Set Take Profit</span>
              </label>
              <input
                type="text"
                value={takeProfitPrice}
                disabled={!enableTP}
                onChange={(e) => setTakeProfitPrice(e.target.value)}
                placeholder="Target price"
                className="w-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-slate-900 dark:text-white disabled:bg-slate-100 dark:disabled:bg-slate-800/60 disabled:text-slate-400 dark:disabled:text-slate-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 font-medium">
                <input
                  type="checkbox"
                  checked={enableSL}
                  onChange={(e) => setEnableSL(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 text-slate-900 dark:text-emerald-500 focus:ring-0"
                />
                <span>Set Stop Loss</span>
              </label>
              <input
                type="text"
                value={stopLossPrice}
                disabled={!enableSL}
                onChange={(e) => setStopLossPrice(e.target.value)}
                placeholder="Stop price"
                className="w-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-slate-900 dark:text-white disabled:bg-slate-100 dark:disabled:bg-slate-800/60 disabled:text-slate-400 dark:disabled:text-slate-500 focus:outline-none"
              />
            </div>
          </div>

          {/* 7. Full-Width CTA Submit Button */}
          <button
            type="button"
            onClick={handleExecuteTrade}
            className={`w-full py-3 rounded-lg text-white font-black text-xs transition-all shadow-sm ${
              orderSide === 'BUY'
                ? 'bg-[#009e60] hover:bg-[#008752]'
                : 'bg-[#e11d48] hover:bg-[#be123c]'
            }`}
          >
            Execute {orderSide} ({activeAsset.symbol})
          </button>

        </div>

      </div>

      {/* Reaction Pop-up Modal */}
      <OrderSuccessReactionModal
        order={executedOrder}
        isOpen={isSuccessModalOpen}
        onClose={() => {
          setIsSuccessModalOpen(false);
          setExecutedOrder(null);
        }}
      />

    </div>
  );
}

export default function TradePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400 text-xs">Loading market chart...</div>}>
      <TradePageInner />
    </Suspense>
  );
}
