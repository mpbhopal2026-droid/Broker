'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Layers,
  Plus,
  Minus,
  Sliders,
  X,
  RefreshCw,
  Star,
  Bell,
  Share2,
  ExternalLink,
  Shield,
  Info,
  Clock,
  Zap,
  BarChart2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { formatUSD } from '@/lib/utils';
import { TradingViewWidget } from '@/components/trading/TradingViewWidget';
import { InsufficientFundsModal } from '@/components/trading/InsufficientFundsModal';
import { TradeOrder } from '@/lib/types';
import { MiniSparkline } from '@/components/charts/MiniSparkline';
import { InteractiveMarketChart, ChartDataPoint } from '@/components/charts/InteractiveMarketChart';

// Detailed Market Assets Catalog
const INSTRUMENTS_DATABASE = [
  {
    symbol: 'XAU/USD',
    name: 'Gold Spot / US Dollar',
    category: 'COMMODITIES',
    tvSymbol: 'OANDA:XAUUSD',
    defaultPrice: 2436.21,
    spread: 0.30,
    change24h: '+0.75%',
    changeValue: 18.15,
    low24h: 2409.29,
    high24h: 2442.80,
    low52w: 1810.50,
    high52w: 2483.60,
    openPrice: 2418.06,
    prevClose: 2418.06,
    contractSize: '100 oz',
    leverage: '1:100',
    description: 'Gold spot traded against the US Dollar. Regarded globally as a primary hedge against inflation and safe-haven reserve asset.',
    icon: '🥇'
  },
  {
    symbol: 'EUR/USD',
    name: 'Euro / US Dollar',
    category: 'FOREX',
    tvSymbol: 'FX:EURUSD',
    defaultPrice: 1.08745,
    spread: 0.00012,
    change24h: '+0.15%',
    changeValue: 0.0016,
    low24h: 1.0845,
    high24h: 1.0892,
    low52w: 1.0448,
    high52w: 1.1275,
    openPrice: 1.0858,
    prevClose: 1.0858,
    contractSize: '100,000 EUR',
    leverage: '1:100',
    description: 'The world’s most heavily traded currency pair, representing the economies of the European Union and the United States.',
    icon: '💶'
  },
  {
    symbol: 'GBP/USD',
    name: 'British Pound / US Dollar',
    category: 'FOREX',
    tvSymbol: 'FX:GBPUSD',
    defaultPrice: 1.27330,
    spread: 0.00015,
    change24h: '+0.12%',
    changeValue: 0.0015,
    low24h: 1.2690,
    high24h: 1.2765,
    low52w: 1.2035,
    high52w: 1.3140,
    openPrice: 1.2718,
    prevClose: 1.2718,
    contractSize: '100,000 GBP',
    leverage: '1:100',
    description: 'Also known as "Cable", one of the oldest and most liquid currency pairs in global financial markets.',
    icon: '💷'
  },
  {
    symbol: 'USD/INR',
    name: 'US Dollar / Indian Rupee',
    category: 'FOREX',
    tvSymbol: 'FX_IDC:USDINR',
    defaultPrice: 84.134,
    spread: 0.012,
    change24h: '+0.06%',
    changeValue: 0.05,
    low24h: 83.95,
    high24h: 84.22,
    low52w: 82.80,
    high52w: 84.35,
    openPrice: 84.08,
    prevClose: 84.08,
    contractSize: '1,000 USD',
    leverage: '1:100',
    description: 'The exchange rate between the US Dollar and Indian Rupee, reflecting trade flows and economic trends in the Indian sub-continent.',
    icon: '🇮🇳'
  },
  {
    symbol: 'BTC/USD',
    name: 'Bitcoin / US Dollar',
    category: 'CRYPTO',
    tvSymbol: 'BINANCE:BTCUSDT',
    defaultPrice: 64150.00,
    spread: 2.50,
    change24h: '+2.40%',
    changeValue: 1500.00,
    low24h: 62400.00,
    high24h: 64800.00,
    low52w: 25100.00,
    high52w: 73750.00,
    openPrice: 62650.00,
    prevClose: 62650.00,
    contractSize: '1 BTC',
    leverage: '1:50',
    description: 'The pioneering digital cryptocurrency asset with decentralised consensus and fixed supply issuance.',
    icon: '₿'
  },
  {
    symbol: 'USD/JPY',
    name: 'US Dollar / Japanese Yen',
    category: 'FOREX',
    tvSymbol: 'FX:USDJPY',
    defaultPrice: 155.60,
    spread: 0.015,
    change24h: '+0.38%',
    changeValue: 0.58,
    low24h: 154.80,
    high24h: 156.10,
    low52w: 140.25,
    high52w: 161.95,
    openPrice: 155.02,
    prevClose: 155.02,
    contractSize: '100,000 USD',
    leverage: '1:100',
    description: 'The second most liquid currency pair globally, widely traded for interest rate differentials and carry trade strategies.',
    icon: '💴'
  },
  {
    symbol: 'ETH/USD',
    name: 'Ethereum / US Dollar',
    category: 'CRYPTO',
    tvSymbol: 'BINANCE:ETHUSDT',
    defaultPrice: 3420.00,
    spread: 0.50,
    change24h: '-1.10%',
    changeValue: -38.00,
    low24h: 3380.00,
    high24h: 3495.00,
    low52w: 1520.00,
    high52w: 4090.00,
    openPrice: 3458.00,
    prevClose: 3458.00,
    contractSize: '1 ETH',
    leverage: '1:50',
    description: 'Leading smart contract blockchain native token powering decentralized finance and digital tokenized applications.',
    icon: '⟠'
  },
  {
    symbol: 'WTI/USD',
    name: 'WTI Crude Oil',
    category: 'COMMODITIES',
    tvSymbol: 'TVC:USOIL',
    defaultPrice: 82.51,
    spread: 0.04,
    change24h: '+0.52%',
    changeValue: 0.43,
    low24h: 81.60,
    high24h: 83.10,
    low52w: 67.70,
    high52w: 93.60,
    openPrice: 82.08,
    prevClose: 82.08,
    contractSize: '1,000 bbl',
    leverage: '1:100',
    description: 'West Texas Intermediate light sweet crude oil, the global benchmark for petroleum commodities pricing.',
    icon: '🛢️'
  }
];

const LOT_CHIPS = [0.01, 0.05, 0.10, 0.50, 1.00];
const TIMEFRAMES = ['1D', '1W', '1M', '3M', '6M', '1Y', '5Y', 'ALL'];

function InstrumentDetailPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const symbolParam = searchParams.get('symbol') || searchParams.get('pair') || 'XAU/USD';

  const {
    currentUser,
    accountMode,
    setAccountMode,
    tradeOrders = [],
    openTrade,
    closeTrade,
    showToast,
    isDemo,
    demo,
    watchlist = [],
    toggleWatchlist,
  } = useApp();

  // Find or match instrument
  const instrument = useMemo(() => {
    return (
      INSTRUMENTS_DATABASE.find(
        (i) => i.symbol.toLowerCase() === symbolParam.toLowerCase() || i.symbol.replace('/', '').toLowerCase() === symbolParam.replace('/', '').toLowerCase()
      ) || INSTRUMENTS_DATABASE[0]
    );
  }, [symbolParam]);

  // Chart view mode: 'interactive' (lightweight native area/spline) or 'candlestick' (TradingView embedded)
  const [chartMode, setChartMode] = useState<'area' | 'candlestick'>('area');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('1D');
  const [hoveredPoint, setHoveredPoint] = useState<ChartDataPoint | null>(null);

  // Order Ticket State
  const [orderSide, setOrderSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [productType, setProductType] = useState<'INTRADAY' | 'OVERNIGHT'>('INTRADAY');
  const [lotSize, setLotSize] = useState<number>(0.10);
  const [limitPrice, setLimitPrice] = useState<string>(instrument.defaultPrice.toString());
  const [stopLoss, setStopLoss] = useState<string>('');
  const [takeProfit, setTakeProfit] = useState<string>('');
  const [showSlTp, setShowSlTp] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showGatekeeperModal, setShowGatekeeperModal] = useState<boolean>(false);

  // Pricing calculations
  const livePrice = instrument.defaultPrice;
  const spread = instrument.spread;
  const isUp = instrument.change24h.startsWith('+');

  // Dynamic Hover Scrubber Display Values
  const displayPrice = hoveredPoint ? hoveredPoint.price : livePrice;
  const isHovering = hoveredPoint !== null;
  const referencePrice = instrument.openPrice || livePrice;
  const displayDelta = isHovering ? displayPrice - referencePrice : instrument.changeValue;
  const displayDeltaPercent = isHovering
    ? referencePrice > 0
      ? (displayDelta / referencePrice) * 100
      : 0
    : parseFloat(instrument.change24h);
  const isDisplayUp = isHovering ? displayDelta >= 0 : isUp;
  const displayDeltaStr = isHovering
    ? `${displayDeltaPercent >= 0 ? '+' : ''}${displayDeltaPercent.toFixed(2)}%`
    : instrument.change24h;

  const bidPrice = (livePrice - spread / 2).toFixed(instrument.symbol.includes('JPY') ? 2 : instrument.symbol.includes('EUR') || instrument.symbol.includes('GBP') ? 5 : 2);
  const askPrice = (livePrice + spread / 2).toFixed(instrument.symbol.includes('JPY') ? 2 : instrument.symbol.includes('EUR') || instrument.symbol.includes('GBP') ? 5 : 2);

  // Balances & Margin
  const balance = isDemo ? (demo?.balance ?? 10000) : (currentUser?.walletBalance ?? 0);
  const userOpenTrades: TradeOrder[] = isDemo
    ? (demo?.positions?.map((p: any) => ({
        id: p.id,
        userId: currentUser?.id || 'demo',
        symbol: p.symbol,
        pairName: p.name || p.symbol,
        type: p.type || 'BUY',
        lotSize: p.lotSize || 0.10,
        entryPrice: p.entryPrice || 0,
        currentPrice: p.currentPrice || 0,
        margin: p.margin || 0,
        leverage: p.leverage || 100,
        pnl: p.pnl || 0,
        pnlPercentage: 0,
        status: 'OPEN' as const,
        openedAt: p.openedAt || new Date().toISOString(),
      })) ?? [])
    : tradeOrders.filter((t: TradeOrder) => t.status === 'OPEN' && (t.userId === currentUser?.id));

  const floatingPnl = userOpenTrades.reduce((acc: number, t: TradeOrder) => acc + (t.pnl || 0), 0);
  const usedMargin = userOpenTrades.reduce((acc: number, t: TradeOrder) => acc + (t.margin || 0), 0);
  const equity = Math.max(0, balance + floatingPnl);
  const freeMargin = Math.max(0, equity - usedMargin);
  const requiredMargin = parseFloat(((lotSize * livePrice) / 100).toFixed(2)) || 10.00;

  // Open trades specifically for this instrument
  const currentAssetTrades = userOpenTrades.filter((t) => t.symbol === instrument.symbol);

  const isFavorite = watchlist.includes(instrument.symbol);

  // Stepper increment/decrement
  const handleStepLot = (delta: number) => {
    setLotSize((prev) => {
      const next = parseFloat((prev + delta).toFixed(2));
      return next >= 0.01 ? (next <= 20.0 ? next : 20.0) : 0.01;
    });
  };

  // Execution
  const handleExecute = async () => {
    if (!isDemo && balance <= 0) {
      setShowGatekeeperModal(true);
      return;
    }

    if (!isDemo && freeMargin < requiredMargin) {
      showToast({
        type: 'error',
        title: 'Insufficient Margin',
        message: `Available free margin is ${formatUSD(freeMargin)}. Required margin is ${formatUSD(requiredMargin)}.`,
      });
      return;
    }

    setIsSubmitting(true);
    const sl = stopLoss ? parseFloat(stopLoss) : undefined;
    const tp = takeProfit ? parseFloat(takeProfit) : undefined;

    const res = await openTrade(
      instrument.symbol,
      instrument.name,
      orderSide,
      lotSize,
      requiredMargin,
      100,
      sl,
      tp
    );

    setIsSubmitting(false);

    if (res.success) {
      showToast({
        type: 'success',
        title: `${orderSide} Filled Successfully`,
        message: `${lotSize} Lots of ${instrument.symbol} @ ${orderSide === 'BUY' ? askPrice : bidPrice}`,
      });
    } else {
      showToast({
        type: 'error',
        title: 'Execution Failed',
        message: res.error || 'Could not place trade order.',
      });
    }
  };

  // Calculate position on today's range slider
  const rangePercent = Math.min(
    100,
    Math.max(0, ((livePrice - instrument.low24h) / (instrument.high24h - instrument.low24h || 1)) * 100)
  );

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6 text-zinc-950 dark:text-white select-none">
      
      {/* Top Navigation & Breadcrumb */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <Link
            href="/markets"
            className="p-1.5 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800">
                {instrument.category}
              </span>
              <span className="text-xs text-zinc-400">· 100x Leverage Available</span>
            </div>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => toggleWatchlist(instrument.symbol)}
            className={`p-2 rounded-md border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              isFavorite
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400'
                : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-950 dark:hover:text-white'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
            <span className="hidden sm:inline">{isFavorite ? 'Watchlisted' : 'Add to Watchlist'}</span>
          </button>

          <a
            href={`/trade?symbol=${encodeURIComponent(instrument.symbol)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 rounded-md bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <span>Full Terminal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Main 2-Column Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ═══════════════════════════════════════════════════════════════
            LEFT COLUMN (7 COLS): HEADER, CHART, METRICS & STATS
           ═══════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          
          {/* 1. Asset Title & Real-Time Price */}
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{instrument.icon}</span>
                <h1 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
                  {instrument.name}
                </h1>
              </div>
              <p className="text-xs text-zinc-500 font-sans mt-0.5">
                {instrument.symbol} · Real-Time Institutional Feed
              </p>
            </div>

            <div className="text-left sm:text-right">
              <div className="text-2xl sm:text-3xl font-bold tabular-nums text-zinc-950 dark:text-white transition-all">
                ${displayPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}
              </div>
              <div className="flex items-center sm:justify-end gap-1.5 text-xs font-semibold tabular-nums">
                <span className={isDisplayUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                  {isDisplayUp ? '▲ +' : '▼ -'}${Math.abs(displayDelta).toFixed(2)} ({displayDeltaStr})
                </span>
                <span className="text-zinc-400 text-[10px] font-normal">
                  {hoveredPoint ? hoveredPoint.time : selectedTimeframe === '1D' ? 'Today' : selectedTimeframe}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Interactive Chart Container */}
          <div className="rounded-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 space-y-4">
            
            {/* Chart Mode & Timeframe Selector Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-900">
              
              {/* Timeframe Pills */}
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => {
                      setSelectedTimeframe(tf);
                      setHoveredPoint(null);
                    }}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                      selectedTimeframe === tf
                        ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950'
                        : 'text-zinc-500 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>

              {/* Area vs TradingView Candlestick Toggle */}
              <div className="flex items-center gap-1 p-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs">
                <button
                  type="button"
                  onClick={() => setChartMode('area')}
                  className={`px-2.5 py-1 rounded font-bold transition-colors ${
                    chartMode === 'area'
                      ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-2xs'
                      : 'text-zinc-500 hover:text-zinc-950 dark:hover:text-white'
                  }`}
                >
                  Interactive Line
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode('candlestick')}
                  className={`px-2.5 py-1 rounded font-bold transition-colors ${
                    chartMode === 'candlestick'
                      ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-2xs'
                      : 'text-zinc-500 hover:text-zinc-950 dark:hover:text-white'
                  }`}
                >
                  Candlestick
                </button>
              </div>

            </div>

            {/* Chart Canvas Area */}
            <div className="w-full h-72 sm:h-80 relative flex items-center justify-center">
              {chartMode === 'area' ? (
                <div className="w-full h-full">
                  <InteractiveMarketChart
                    symbol={instrument.symbol}
                    currentPrice={instrument.defaultPrice}
                    timeframe={selectedTimeframe}
                    isPositive={isUp}
                    onHoverPoint={setHoveredPoint}
                    height={300}
                  />
                </div>
              ) : (
                <div className="w-full h-full rounded overflow-hidden">
                  <TradingViewWidget
                    symbol={instrument.tvSymbol}
                    height="100%"
                    interval="15"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-900 font-sans">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Market Open · Real-Time Execution</span>
              </span>
              <span>Spread: {instrument.spread} pips</span>
            </div>

          </div>

          {/* 3. Performance & 24h Range Bar */}
          <div className="rounded-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 space-y-4">
            <h3 className="text-xs font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
              Performance & Range
            </h3>

            {/* Today's Range Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium">
                <div>
                  <span className="text-[10px] text-zinc-400 block">Today's Low</span>
                  <span className="font-bold tabular-nums">${instrument.low24h}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-zinc-400 block">Today's High</span>
                  <span className="font-bold tabular-nums">${instrument.high24h}</span>
                </div>
              </div>

              {/* Progress Slider */}
              <div className="relative h-2 rounded-full bg-zinc-100 dark:bg-zinc-900 overflow-hidden border border-zinc-200 dark:border-zinc-800">
                <div
                  className="absolute top-0 bottom-0 bg-emerald-500 rounded-full"
                  style={{ width: `${rangePercent}%` }}
                />
              </div>
            </div>

            {/* 52-Week Range Slider */}
            <div className="space-y-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-900">
              <div className="flex items-center justify-between text-xs font-medium">
                <div>
                  <span className="text-[10px] text-zinc-400 block">52W Low</span>
                  <span className="font-bold tabular-nums">${instrument.low52w}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-zinc-400 block">52W High</span>
                  <span className="font-bold tabular-nums">${instrument.high52w}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Key Statistics & Contract Specifications */}
          <div className="rounded-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
            <h3 className="text-xs font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
              Instrument Fundamentals & Specifications
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] text-zinc-400 block">Open Price</span>
                <span className="font-bold tabular-nums text-zinc-950 dark:text-white">${instrument.openPrice}</span>
              </div>

              <div className="p-2.5 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] text-zinc-400 block">Prev. Close</span>
                <span className="font-bold tabular-nums text-zinc-950 dark:text-white">${instrument.prevClose}</span>
              </div>

              <div className="p-2.5 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] text-zinc-400 block">Contract Unit</span>
                <span className="font-bold text-zinc-950 dark:text-white">{instrument.contractSize}</span>
              </div>

              <div className="p-2.5 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] text-zinc-400 block">Max Leverage</span>
                <span className="font-bold text-zinc-950 dark:text-white">{instrument.leverage}</span>
              </div>
            </div>

            <div className="p-3 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 font-sans leading-relaxed">
              <span className="font-bold text-zinc-950 dark:text-white block mb-1">About {instrument.name}:</span>
              {instrument.description}
            </div>
          </div>

        </div>

        {/* ═══════════════════════════════════════════════════════════════
            RIGHT COLUMN (5 COLS): STICKY ORDER EXECUTION DESK (GROWW STYLE)
           ═══════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-5 xl:col-span-4 sticky top-6 space-y-4">
          
          {/* Order Ticket Card */}
          <div className="rounded-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5 space-y-4 shadow-sm">
            
            {/* Header / Title */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-900">
              <div>
                <h2 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-tight">
                  {instrument.symbol}
                </h2>
                <div className="flex items-center gap-2 text-[11px] text-zinc-500 tabular-nums">
                  <span>Bid: <strong>${bidPrice}</strong></span>
                  <span>·</span>
                  <span>Ask: <strong>${askPrice}</strong></span>
                </div>
              </div>

              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800">
                {accountMode.toUpperCase()}
              </span>
            </div>

            {/* BUY / SELL Tab Switcher */}
            <div className="grid grid-cols-2 p-1 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setOrderSide('BUY')}
                className={`py-2 rounded transition-all flex items-center justify-center gap-1.5 ${
                  orderSide === 'BUY'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
                }`}
              >
                <span>BUY (ASK)</span>
              </button>

              <button
                type="button"
                onClick={() => setOrderSide('SELL')}
                className={`py-2 rounded transition-all flex items-center justify-center gap-1.5 ${
                  orderSide === 'SELL'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
                }`}
              >
                <span>SELL (BID)</span>
              </button>
            </div>

            {/* Product & Order Type Switcher */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setProductType('INTRADAY')}
                className={`p-2 rounded border text-left transition-colors ${
                  productType === 'INTRADAY'
                    ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white font-bold'
                    : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <div>Intraday</div>
                <div className="text-[10px] opacity-70">100x Margin</div>
              </button>

              <button
                type="button"
                onClick={() => setProductType('OVERNIGHT')}
                className={`p-2 rounded border text-left transition-colors ${
                  productType === 'OVERNIGHT'
                    ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white font-bold'
                    : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <div>Overnight</div>
                <div className="text-[10px] opacity-70">Standard Carry</div>
              </button>
            </div>

            {/* Lot Size Stepper */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Contract Lot Size
                </label>
                <span className="text-[10px] text-zinc-400">Min 0.01 · Max 20.00</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleStepLot(-0.01)}
                  className="w-9 h-9 rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center font-bold text-sm"
                >
                  -
                </button>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="20.00"
                  value={lotSize}
                  onChange={(e) => setLotSize(parseFloat(e.target.value) || 0.01)}
                  className="flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-3 py-2 text-xs font-bold text-center text-zinc-950 dark:text-white tabular-nums outline-none focus:border-zinc-950 dark:focus:border-zinc-100"
                />
                <button
                  type="button"
                  onClick={() => handleStepLot(0.01)}
                  className="w-9 h-9 rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center font-bold text-sm"
                >
                  +
                </button>
              </div>

              {/* Quick Lot Size Chips */}
              <div className="flex items-center gap-1 pt-1">
                {LOT_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setLotSize(chip)}
                    className={`flex-1 py-1 rounded text-[10px] font-bold border transition-colors ${
                      lotSize === chip
                        ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white'
                        : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400'
                    }`}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Stop Loss & Take Profit Toggle */}
            <div className="pt-1 border-t border-zinc-100 dark:border-zinc-900">
              <button
                type="button"
                onClick={() => setShowSlTp(!showSlTp)}
                className="text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white flex items-center justify-between w-full"
              >
                <span>Risk Management (SL / TP)</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSlTp ? 'rotate-180' : ''}`} />
              </button>

              {showSlTp && (
                <div className="grid grid-cols-2 gap-2 pt-2 animate-in fade-in">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-zinc-500 block">Stop Loss ($)</label>
                    <input
                      type="number"
                      step="any"
                      value={stopLoss}
                      onChange={(e) => setStopLoss(e.target.value)}
                      placeholder="Optional"
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs tabular-nums text-zinc-950 dark:text-white outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-zinc-500 block">Take Profit ($)</label>
                    <input
                      type="number"
                      step="any"
                      value={takeProfit}
                      onChange={(e) => setTakeProfit(e.target.value)}
                      placeholder="Optional"
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs tabular-nums text-zinc-950 dark:text-white outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Margin Calculation & Balance Breakdown */}
            <div className="p-3 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1.5 text-xs">
              <div className="flex justify-between items-center text-zinc-500">
                <span>Required Margin:</span>
                <span className="font-bold tabular-nums text-zinc-950 dark:text-white">${requiredMargin.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-500">
                <span>Available Balance:</span>
                <span className="font-bold tabular-nums text-zinc-950 dark:text-white">${balance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-500 pt-1 border-t border-zinc-200 dark:border-zinc-800">
                <span>Free Margin:</span>
                <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">${freeMargin.toFixed(2)}</span>
              </div>
            </div>

            {/* Primary Order Execution CTA */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleExecute}
              className={`w-full py-3 rounded-md text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-[0.99] ${
                orderSide === 'BUY'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Submitting Order…</span>
                </>
              ) : (
                <>
                  <span>
                    {orderSide === 'BUY' ? `Buy ${instrument.symbol} @ $${askPrice}` : `Sell ${instrument.symbol} @ $${bidPrice}`}
                  </span>
                </>
              )}
            </button>

          </div>

          {/* Active Positions for this Instrument */}
          {currentAssetTrades.length > 0 && (
            <div className="rounded-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-zinc-950 dark:text-white">Active Positions ({currentAssetTrades.length})</span>
                <Link href="/orders" className="text-[10px] text-zinc-400 hover:underline">All Orders →</Link>
              </div>

              <div className="space-y-2">
                {currentAssetTrades.map((trade) => (
                  <div
                    key={trade.id}
                    className="p-2.5 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          trade.type === 'BUY' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400'
                        }`}>
                          {trade.type} {trade.lotSize}L
                        </span>
                        <span className="font-bold tabular-nums">@ ${trade.entryPrice}</span>
                      </div>
                      <span className="text-[10px] text-zinc-400">Margin: ${trade.margin}</span>
                    </div>

                    <div className="text-right">
                      <div className={`font-bold tabular-nums ${trade.pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {trade.pnl >= 0 ? '+' : ''}${trade.pnl?.toFixed(2)}
                      </div>
                      <button
                        type="button"
                        onClick={() => closeTrade(trade.id)}
                        className="text-[10px] text-rose-600 dark:text-rose-400 hover:underline font-semibold"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Gatekeeper deposit modal if live zero balance */}
      {showGatekeeperModal && (
        <InsufficientFundsModal
          isOpen={showGatekeeperModal}
          onClose={() => setShowGatekeeperModal(false)}
        />
      )}

    </div>
  );
}

export default function InstrumentDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-xs text-zinc-500">
          Loading Instrument Data…
        </div>
      }
    >
      <InstrumentDetailPageContent />
    </Suspense>
  );
}
