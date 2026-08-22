'use client';

import React, { useState, Suspense, useMemo } from 'react';
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
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { formatUSD } from '@/lib/utils';
import { TradingViewWidget } from '@/components/trading/TradingViewWidget';
import { InsufficientFundsModal } from '@/components/trading/InsufficientFundsModal';
import { TradeOrder } from '@/lib/types';
import { useLivePrices } from '@/hooks/useLivePrices';

const INSTRUMENTS = [
  { symbol: 'XAU/USD', name: 'Gold vs US Dollar', tvSymbol: 'OANDA:XAUUSD', defaultPrice: 2915.40, spread: 0.30, change24h: '+0.84%' },
  { symbol: 'EUR/USD', name: 'Euro vs US Dollar', tvSymbol: 'FX:EURUSD', defaultPrice: 1.0875, spread: 0.00012, change24h: '+0.15%' },
  { symbol: 'GBP/USD', name: 'British Pound vs US Dollar', tvSymbol: 'FX:GBPUSD', defaultPrice: 1.2940, spread: 0.00015, change24h: '-0.22%' },
  { symbol: 'BTC/USD', name: 'Bitcoin vs US Dollar', tvSymbol: 'BINANCE:BTCUSDT', defaultPrice: 96450.00, spread: 1.50, change24h: '+2.40%' },
  { symbol: 'USD/JPY', name: 'US Dollar vs Japanese Yen', tvSymbol: 'FX:USDJPY', defaultPrice: 154.20, spread: 0.015, change24h: '+0.38%' },
  { symbol: 'ETH/USD', name: 'Ethereum vs US Dollar', tvSymbol: 'BINANCE:ETHUSDT', defaultPrice: 2740.00, spread: 0.50, change24h: '-1.10%' },
];

const LOT_CHIPS = [0.01, 0.05, 0.10, 0.50, 1.00];
const TIMEFRAMES = [
  { label: 'M1', value: '1' },
  { label: 'M5', value: '5' },
  { label: 'M15', value: '15' },
  { label: 'H1', value: '60' },
  { label: 'H4', value: '240' },
  { label: 'D1', value: 'D' },
];

function TradePageInner() {
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
  } = useApp();

  const { prices } = useLivePrices();

  // Selected Instrument
  const [selectedSymbol, setSelectedSymbol] = useState<string>(symbolParam);
  const [showSymbolPicker, setShowSymbolPicker] = useState(false);
  const [currentTimeframe, setCurrentTimeframe] = useState('15');

  const currentInstrument = useMemo(() => {
    return INSTRUMENTS.find((i) => i.symbol === selectedSymbol) || INSTRUMENTS[0];
  }, [selectedSymbol]);

  const liveData = prices[selectedSymbol];

  // Pricing & Live Spreads
  const livePrice = liveData?.price ?? currentInstrument.defaultPrice;
  const spreadValue = liveData?.spread ?? currentInstrument.spread;
  const bidPrice = (liveData?.bid ?? (livePrice - spreadValue / 2)).toFixed(selectedSymbol.includes('JPY') ? 2 : selectedSymbol.includes('EUR') || selectedSymbol.includes('GBP') ? 4 : 2);
  const askPrice = (liveData?.ask ?? (livePrice + spreadValue / 2)).toFixed(selectedSymbol.includes('JPY') ? 2 : selectedSymbol.includes('EUR') || selectedSymbol.includes('GBP') ? 4 : 2);

  // Financial Metrics Ribbon (Balance, Equity, Free Margin)
  const balance = isDemo ? (demo?.balance ?? 10000) : (currentUser?.walletBalance ?? 0);
  
  // Calculate Open and Closed Trades
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

  const userClosedTrades: TradeOrder[] = tradeOrders.filter(
    (t: TradeOrder) => t.status === 'CLOSED' && (!currentUser || t.userId === currentUser.id)
  );

  const floatingPnl = userOpenTrades.reduce((acc: number, t: TradeOrder) => acc + (t.pnl || 0), 0);
  const usedMargin = userOpenTrades.reduce((acc: number, t: TradeOrder) => acc + (t.margin || 0), 0);
  const equity = Math.max(0, balance + floatingPnl);
  const freeMargin = Math.max(0, equity - usedMargin);

  // Order Dock State
  const [lotSize, setLotSize] = useState<number>(0.10);
  const [enableSl, setEnableSl] = useState(false);
  const [enableTp, setEnableTp] = useState(false);
  const [stopLoss, setStopLoss] = useState<string>('');
  const [takeProfit, setTakeProfit] = useState<string>('');
  const [showSlTpAccordion, setShowSlTpAccordion] = useState(false);

  // Modals & Bottom Drawer State
  const [showGatekeeperModal, setShowGatekeeperModal] = useState(false);
  const [showPositionsDrawer, setShowPositionsDrawer] = useState(false);
  const [showBrokerModal, setShowBrokerModal] = useState(false);
  const [pendingOrderIntent, setPendingOrderIntent] = useState<{ side: 'BUY' | 'SELL'; lot: number; price: string | number; margin: number } | null>(null);
  const [drawerTab, setDrawerTab] = useState<'open' | 'closed'>('open');
  const [closingId, setClosingId] = useState<string | null>(null);

  // Stepper increment/decrement
  const handleStepLot = (delta: number) => {
    setLotSize((prev) => {
      const next = parseFloat((prev + delta).toFixed(2));
      return next > 0.01 ? (next <= 20.0 ? next : 20.0) : 0.01;
    });
  };

  // Execution Handler
  const handleExecuteOrder = async (side: 'BUY' | 'SELL') => {
    const calculatedMargin = parseFloat(((lotSize * livePrice) / 100).toFixed(2)) || 10.00;

    if (!isDemo) {
      // Live Trading Lock: Present Broker Clearance & Dealing Desk Routing Popup
      setPendingOrderIntent({
        side,
        lot: lotSize,
        price: side === 'BUY' ? askPrice : bidPrice,
        margin: calculatedMargin,
      });
      setShowBrokerModal(true);
      return;
    }

    if (balance <= 0) {
      setShowGatekeeperModal(true);
      return;
    }

    if (!isDemo && freeMargin < calculatedMargin) {
      showToast({
        type: 'error',
        title: 'Insufficient Free Margin',
        message: `Available free margin is ${formatUSD(freeMargin)}. Deposit funds or reduce lot size.`,
      });
      return;
    }

    const res = await openTrade(
      currentInstrument.symbol,
      currentInstrument.name,
      side,
      lotSize,
      calculatedMargin,
      100,
      enableSl && stopLoss ? parseFloat(stopLoss) : undefined,
      enableTp && takeProfit ? parseFloat(takeProfit) : undefined
    );

    if (res?.success) {
      showToast({
        type: 'success',
        title: 'Order Executed',
        message: `${side} ${lotSize} Lot ${currentInstrument.symbol} opened at ${side === 'BUY' ? askPrice : bidPrice}`,
      });
      setShowPositionsDrawer(true);
      setDrawerTab('open');
    }
  };

  const handleClosePosition = async (tradeId: string) => {
    setClosingId(tradeId);
    await closeTrade(tradeId);
    setClosingId(null);
    showToast({ type: 'success', title: 'Position Closed', message: 'Trade closed and P/L settled to balance.' });
  };

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-black text-white select-none overflow-hidden">
      
      {/* ═══════════════════════════════════════════════════════════════
          HEADER BAR — Strict Monochrome Single Strip
         ═══════════════════════════════════════════════════════════════ */}
      <header className="shrink-0 bg-zinc-950 border-b border-zinc-800 px-3 py-2 space-y-1.5">
        
        {/* Row 1: Back + Symbol Picker + Account Mode + Positions Count */}
        <div className="flex items-center justify-between gap-2">
          
          {/* Left: Back & Symbol Dropdown */}
          <div className="flex items-center gap-2 min-w-0">
            <Link
              href="/dashboard"
              className="p-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            {/* Symbol Picker */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSymbolPicker(!showSymbolPicker)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors cursor-pointer"
              >
                <span className="text-xs sm:text-sm font-bold tracking-tight text-white">{currentInstrument.symbol}</span>
                <span className={`text-[10px] font-semibold tabular-nums px-1 rounded ${
                  currentInstrument.change24h.startsWith('+') ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
                }`}>
                  {currentInstrument.change24h.startsWith('+') ? '▲' : '▼'} {currentInstrument.change24h}
                </span>
                <ChevronDown className="w-3 h-3 text-zinc-400" />
              </button>

              {/* Dropdown Menu */}
              {showSymbolPicker && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSymbolPicker(false)} />
                  <div className="absolute top-full left-0 mt-1 w-64 rounded-md bg-zinc-950 border border-zinc-800 shadow-2xl p-1 z-50 space-y-0.5">
                    <div className="px-2.5 py-1.5 text-[10px] uppercase font-bold text-zinc-500 tracking-wider border-b border-zinc-900">
                      Market Instruments
                    </div>
                    {INSTRUMENTS.map((inst) => (
                      <button
                        key={inst.symbol}
                        type="button"
                        onClick={() => {
                          setSelectedSymbol(inst.symbol);
                          setShowSymbolPicker(false);
                        }}
                        className={`w-full p-2 rounded-md flex items-center justify-between text-left text-xs transition-colors ${
                          selectedSymbol === inst.symbol ? 'bg-zinc-900 text-white border border-zinc-700' : 'hover:bg-zinc-900 text-zinc-300'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-white">{inst.symbol}</div>
                          <div className="text-[10px] text-zinc-500 font-sans">{inst.name}</div>
                        </div>
                        <span className={`text-[10px] font-bold tabular-nums ${
                          inst.change24h.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {inst.change24h}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right: Neutral Real/Demo Pill + Positions Button */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setAccountMode(isDemo ? 'live' : 'demo')}
              className="px-2.5 py-1 rounded-md text-[11px] font-bold border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 flex items-center gap-1.5 transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span>{isDemo ? 'DEMO ACCOUNT' : `LIVE: ${formatUSD(balance)}`}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPositionsDrawer(true)}
              className="px-2 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-bold text-zinc-300 flex items-center gap-1"
            >
              <Layers className="w-3.5 h-3.5 text-zinc-400" />
              <span>{userOpenTrades.length}</span>
            </button>
          </div>
        </div>

        {/* Row 2: Equity Ribbon (Compact 3-Metric Bar) */}
        <div className="grid grid-cols-3 gap-px bg-zinc-800 rounded-md overflow-hidden text-center text-[10px]">
          <div className="bg-zinc-950 py-1.5">
            <span className="text-zinc-500 block uppercase tracking-wider">Balance</span>
            <span className="font-bold text-white tabular-nums text-xs">{formatUSD(balance)}</span>
          </div>
          <div className="bg-zinc-950 py-1.5">
            <span className="text-zinc-500 block uppercase tracking-wider">Equity</span>
            <span className={`font-bold tabular-nums text-xs ${floatingPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatUSD(equity)}
            </span>
          </div>
          <div className="bg-zinc-950 py-1.5">
            <span className="text-zinc-500 block uppercase tracking-wider">Free Margin</span>
            <span className="font-bold text-white tabular-nums text-xs">{formatUSD(freeMargin)}</span>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════
          TIMEFRAME STRIP & LIVE SPREAD (Single Non-Overlapping Bar)
         ═══════════════════════════════════════════════════════════════ */}
      <div className="shrink-0 flex items-center justify-between px-3 py-1 bg-black border-b border-zinc-800 text-xs">
        <div className="flex items-center gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              type="button"
              onClick={() => setCurrentTimeframe(tf.value)}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                currentTimeframe === tf.value
                  ? 'bg-white text-zinc-950'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* Spread Badge */}
        <div className="text-[10px] text-zinc-400 flex items-center gap-1">
          <span className="text-zinc-500 uppercase">Spread:</span>
          <span className="text-white font-bold tabular-nums">{spreadValue} pips</span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          CHART VIEWPORT — Full Height TradingView Area
         ═══════════════════════════════════════════════════════════════ */}
      <main className="flex-1 min-h-0 overflow-hidden bg-black">
        <TradingViewWidget
          symbol={currentInstrument.tvSymbol}
          interval={currentTimeframe}
          height="100%"
          allowSymbolChange={false}
        />
      </main>

      {/* ═══════════════════════════════════════════════════════════════
          ORDER EXECUTION DOCK (Strict Monochrome Split Actions)
         ═══════════════════════════════════════════════════════════════ */}
      <div className="shrink-0 bg-zinc-950 border-t border-zinc-800 px-3 py-2.5 space-y-2 pb-safe">
        
        {/* Lot Size Stepper & Quick Lot Chips */}
        <div className="flex items-center gap-2">
          {/* Stepper Input */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-md p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => handleStepLot(-0.01)}
              className="p-1.5 rounded text-zinc-400 hover:text-white active:bg-zinc-800"
              aria-label="Decrease Lot"
            >
              <Minus className="w-3 h-3" />
            </button>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="20"
              value={lotSize}
              onChange={(e) => setLotSize(parseFloat(e.target.value) || 0.01)}
              className="w-12 text-center bg-transparent text-xs font-bold tabular-nums text-white focus:outline-none"
            />
            <button
              type="button"
              onClick={() => handleStepLot(0.01)}
              className="p-1.5 rounded text-zinc-400 hover:text-white active:bg-zinc-800"
              aria-label="Increase Lot"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          {/* Quick Lot Selection Chips */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1">
            {LOT_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setLotSize(chip)}
                className={`px-2 py-1 rounded-md text-[11px] font-bold tabular-nums transition-colors whitespace-nowrap ${
                  lotSize === chip
                    ? 'bg-white text-zinc-950'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* SL/TP Options Toggle */}
          <button
            type="button"
            onClick={() => setShowSlTpAccordion(!showSlTpAccordion)}
            className={`p-1.5 rounded-md border text-xs shrink-0 transition-colors ${
              showSlTpAccordion || enableSl || enableTp
                ? 'bg-white text-zinc-950 border-white'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400'
            }`}
            title="Stop Loss / Take Profit"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Expandable SL / TP Inputs */}
        {showSlTpAccordion && (
          <div className="grid grid-cols-2 gap-2 p-2 rounded-md bg-zinc-900 border border-zinc-800 text-xs">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Stop Loss ($)</label>
                <input
                  type="checkbox"
                  checked={enableSl}
                  onChange={(e) => setEnableSl(e.target.checked)}
                  className="rounded accent-white"
                />
              </div>
              <input
                type="number"
                disabled={!enableSl}
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="e.g. 2390.00"
                className="w-full bg-black border border-zinc-800 rounded px-2 py-1 text-xs text-white tabular-nums placeholder-zinc-600 disabled:opacity-30 focus:outline-none focus:border-zinc-500"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Take Profit ($)</label>
                <input
                  type="checkbox"
                  checked={enableTp}
                  onChange={(e) => setEnableTp(e.target.checked)}
                  className="rounded accent-white"
                />
              </div>
              <input
                type="number"
                disabled={!enableTp}
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                placeholder="e.g. 2440.00"
                className="w-full bg-black border border-zinc-800 rounded px-2 py-1 text-xs text-white tabular-nums placeholder-zinc-600 disabled:opacity-30 focus:outline-none focus:border-zinc-500"
              />
            </div>
          </div>
        )}

        {/*
          Live accounts do not self-execute. Orders are placed with the dealing
          desk, which fills them in the market and records the actual fill.

          Buy and sell buttons are not merely disabled here, they are absent.
          A disabled button still tells a client that self-execution is a thing
          this account does, and the prices printed on those buttons read as
          dealable — they are indicative only. Showing the instruction instead
          is what makes the model legible.

        {/* Dealable Action Buttons: BUY and SELL */}
        <div className="grid grid-cols-2 gap-2">
          {/* Left: SELL Order Button */}
          <button
            type="button"
            onClick={() => handleExecuteOrder('SELL')}
            className="py-2.5 px-3 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white active:scale-[0.98] transition-colors flex flex-col items-center justify-center cursor-pointer shadow-sm"
          >
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-zinc-400">
              <TrendingDown className="w-3 h-3 text-rose-400" />
              <span>SELL (BID)</span>
            </div>
            <span className="text-base font-bold tabular-nums tracking-tight">{bidPrice}</span>
          </button>

          {/* Right: BUY Order Button */}
          <button
            type="button"
            onClick={() => handleExecuteOrder('BUY')}
            className="py-2.5 px-3 rounded-md bg-white hover:bg-zinc-200 text-zinc-950 active:scale-[0.98] transition-colors flex flex-col items-center justify-center cursor-pointer shadow-sm"
          >
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-zinc-600">
              <TrendingUp className="w-3 h-3 text-emerald-600" />
              <span>BUY (ASK)</span>
            </div>
            <span className="text-base font-bold tabular-nums tracking-tight">{askPrice}</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          POSITIONS DRAWER (High-Density Monochrome Sheet)
         ═══════════════════════════════════════════════════════════════ */}
      {showPositionsDrawer && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-xs" onClick={() => setShowPositionsDrawer(false)}>
          <div
            className="w-full max-w-lg bg-zinc-950 border-t border-zinc-800 rounded-t-xl p-4 space-y-3 max-h-[70vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header & Tabs */}
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setDrawerTab('open')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                    drawerTab === 'open' ? 'bg-white text-zinc-950' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                  }`}
                >
                  Open ({userOpenTrades.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerTab('closed')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                    drawerTab === 'closed' ? 'bg-white text-zinc-950' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                  }`}
                >
                  Closed ({userClosedTrades.length})
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowPositionsDrawer(false)}
                className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content List */}
            <div className="overflow-y-auto flex-1 space-y-1.5">
              {drawerTab === 'open' ? (
                userOpenTrades.length === 0 ? (
                  <div className="py-8 text-center text-xs text-zinc-500">
                    No active open positions.
                  </div>
                ) : (
                  userOpenTrades.map((trade) => (
                    <div
                      key={trade.id}
                      className="p-2.5 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-1 rounded text-[9px] font-bold uppercase ${
                            trade.type === 'BUY' ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
                          }`}>
                            {trade.type} {trade.lotSize}L
                          </span>
                          <strong className="text-white font-bold">{trade.symbol}</strong>
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-0.5 tabular-nums">
                          Entry: {trade.entryPrice} · Margin: ${trade.margin}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className={`font-bold tabular-nums ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {trade.pnl >= 0 ? `+$${trade.pnl.toFixed(2)}` : `-$${Math.abs(trade.pnl).toFixed(2)}`}
                          </div>
                          <div className="text-[9px] text-zinc-500">P/L</div>
                        </div>

                        <button
                          type="button"
                          disabled={closingId === trade.id}
                          onClick={() => handleClosePosition(trade.id)}
                          className="px-2 py-1 rounded border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-[10px] transition-colors"
                        >
                          {closingId === trade.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Close'}
                        </button>
                      </div>
                    </div>
                  ))
                )
              ) : (
                userClosedTrades.length === 0 ? (
                  <div className="py-8 text-center text-xs text-zinc-500">
                    No finalized trade history.
                  </div>
                ) : (
                  userClosedTrades.map((trade: TradeOrder) => (
                    <div
                      key={trade.id}
                      className="p-2.5 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-white">{trade.symbol} · {trade.type}</div>
                        <div className="text-[10px] text-zinc-500">Closed: {trade.closedAt || 'Settled'}</div>
                      </div>
                      <div className={`font-bold tabular-nums ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {trade.pnl >= 0 ? `+$${trade.pnl.toFixed(2)}` : `-$${Math.abs(trade.pnl).toFixed(2)}`}
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* BROKER ROUTING & LIVE TRADE LOCK POPUP MODAL */}
      {showBrokerModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in"
          onClick={() => setShowBrokerModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[#0f172a] border border-slate-800 p-5 space-y-4 shadow-2xl text-white animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Live Trading Lock & Broker Clearance</h3>
                  <span className="text-[10px] text-slate-400 font-mono">Dealing Desk Execution</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBrokerModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {pendingOrderIntent && (
              <div className="p-3.5 rounded-xl bg-[#080d14] border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Order Side & Volume:</span>
                  <span className="font-black font-mono text-emerald-400">
                    {pendingOrderIntent.side} {pendingOrderIntent.lot} Lot {currentInstrument.symbol}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Indicative Execution Price:</span>
                  <span className="font-bold font-mono text-white">${pendingOrderIntent.price}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Required Margin:</span>
                  <span className="font-bold font-mono text-white">${pendingOrderIntent.margin.toFixed(2)} USD</span>
                </div>
              </div>
            )}

            <p className="text-xs text-slate-300 leading-relaxed">
              Real-time market rates and charts are streaming live. In institutional dealing desk mode, live order fills are routed and confirmed with your assigned broker desk.
            </p>

            <div className="space-y-2 pt-1">
              <Link
                href="/support"
                className="w-full py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
              >
                <span>Dispatch Order to Dealing Desk</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                type="button"
                onClick={() => {
                  setShowBrokerModal(false);
                  setAccountMode('demo');
                  showToast({
                    type: 'info',
                    title: 'Demo Simulator Ready',
                    message: 'Switched to $10,000 demo margin practice.',
                  });
                }}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all border border-slate-700 cursor-pointer"
              >
                Practice with $10,000 Demo Balance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GATEKEEPER MODAL */}
      <InsufficientFundsModal
        isOpen={showGatekeeperModal}
        onClose={() => setShowGatekeeperModal(false)}
        symbol={currentInstrument.symbol}
      />

    </div>
  );
}

export default function TradePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-zinc-500 font-mono">Initializing Terminal…</div>}>
      <TradePageInner />
    </Suspense>
  );
}
