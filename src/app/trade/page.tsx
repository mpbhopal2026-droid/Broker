'use client';

import React, { useState, Suspense, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Clock,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Minus,
  Sliders,
  ChevronUp,
  X,
  Wallet,
  FlaskConical,
  ShieldCheck,
  Zap,
  CheckCircle2,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { formatUSD } from '@/lib/utils';
import { TradingViewWidget } from '@/components/trading/TradingViewWidget';
import { InsufficientFundsModal } from '@/components/trading/InsufficientFundsModal';
import { TradeOrder } from '@/lib/types';

const INSTRUMENTS = [
  { symbol: 'XAU/USD', name: 'Gold vs US Dollar', tvSymbol: 'OANDA:XAUUSD', defaultPrice: 2418.50, spread: 0.30, change24h: '+0.84%' },
  { symbol: 'EUR/USD', name: 'Euro vs US Dollar', tvSymbol: 'FX:EURUSD', defaultPrice: 1.0875, spread: 0.00012, change24h: '+0.15%' },
  { symbol: 'GBP/USD', name: 'British Pound vs US Dollar', tvSymbol: 'FX:GBPUSD', defaultPrice: 1.2940, spread: 0.00015, change24h: '-0.22%' },
  { symbol: 'BTC/USD', name: 'Bitcoin vs US Dollar', tvSymbol: 'BINANCE:BTCUSDT', defaultPrice: 63850.00, spread: 1.50, change24h: '+2.40%' },
  { symbol: 'USD/JPY', name: 'US Dollar vs Japanese Yen', tvSymbol: 'FX:USDJPY', defaultPrice: 155.60, spread: 0.015, change24h: '+0.38%' },
  { symbol: 'ETH/USD', name: 'Ethereum vs US Dollar', tvSymbol: 'BINANCE:ETHUSDT', defaultPrice: 3420.00, spread: 0.50, change24h: '-1.10%' },
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

  // Selected Instrument
  const [selectedSymbol, setSelectedSymbol] = useState<string>(symbolParam);
  const [showSymbolPicker, setShowSymbolPicker] = useState(false);
  const [currentTimeframe, setCurrentTimeframe] = useState('15');

  const currentInstrument = useMemo(() => {
    return INSTRUMENTS.find((i) => i.symbol === selectedSymbol) || INSTRUMENTS[0];
  }, [selectedSymbol]);

  // Pricing & Live Spreads
  const livePrice = currentInstrument.defaultPrice;
  const spreadValue = currentInstrument.spread;
  const bidPrice = (livePrice - spreadValue / 2).toFixed(selectedSymbol.includes('JPY') ? 2 : selectedSymbol.includes('EUR') || selectedSymbol.includes('GBP') ? 4 : 2);
  const askPrice = (livePrice + spreadValue / 2).toFixed(selectedSymbol.includes('JPY') ? 2 : selectedSymbol.includes('EUR') || selectedSymbol.includes('GBP') ? 4 : 2);

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
    // 1. Gatekeeper Check: if in Live mode and Balance is 0 or less than minimum required ($20)
    if (!isDemo && balance <= 0) {
      setShowGatekeeperModal(true);
      return;
    }

    const calculatedMargin = parseFloat(((lotSize * livePrice) / 100).toFixed(2)) || 10.00;

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
      100, // 100x institutional leverage
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
    <div className="min-h-screen bg-[#0A0E17] text-white flex flex-col pb-36 select-none">
      
      {/* ========================================================================= */}
      {/* 1. HEADER & ACCOUNT STRIP (OCTAFX LAYOUT) */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-30 bg-[#0A0E17]/95 backdrop-blur-md border-b border-[#1F293D] px-3 sm:px-4 py-2.5 space-y-2">
        
        {/* Top Navigation Row */}
        <div className="flex items-center justify-between gap-2">
          
          {/* Left: Back & Symbol Dropdown Picker */}
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="p-1.5 rounded-xl bg-[#121824] hover:bg-[#1A2232] border border-[#1F293D] text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            {/* Symbol Picker Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSymbolPicker(!showSymbolPicker)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#121824] hover:bg-[#1A2232] border border-[#1F293D] transition-all cursor-pointer"
              >
                <span className="text-xs sm:text-sm font-black font-mono tracking-tight">{currentInstrument.symbol}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
                  currentInstrument.change24h.startsWith('+') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                }`}>
                  {currentInstrument.change24h}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Dropdown Menu */}
              {showSymbolPicker && (
                <div className="absolute top-full left-0 mt-2 w-64 rounded-2xl bg-[#121824] border border-[#1F293D] shadow-2xl p-1.5 z-50 space-y-1 animate-scale-in">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                    Select Market Instrument
                  </div>
                  {INSTRUMENTS.map((inst) => (
                    <button
                      key={inst.symbol}
                      type="button"
                      onClick={() => {
                        setSelectedSymbol(inst.symbol);
                        setShowSymbolPicker(false);
                      }}
                      className={`w-full p-2 rounded-xl flex items-center justify-between text-left text-xs font-semibold transition-colors ${
                        selectedSymbol === inst.symbol ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'hover:bg-[#1A2232] text-slate-300'
                      }`}
                    >
                      <div>
                        <div className="font-bold font-mono text-white">{inst.symbol}</div>
                        <div className="text-[10px] text-slate-500">{inst.name}</div>
                      </div>
                      <span className={`text-[10px] font-bold font-mono ${
                        inst.change24h.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {inst.change24h}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Real / Demo Account Switcher Pill */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setAccountMode(isDemo ? 'live' : 'demo')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold font-mono flex items-center gap-1.5 transition-all shadow-xs active:scale-95 ${
                isDemo
                  ? 'bg-amber-500/10 border border-amber-500/40 text-amber-400'
                  : 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-400'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
              <span>{isDemo ? `DEMO: ${formatUSD(balance)}` : `REAL: ${formatUSD(balance)}`}</span>
            </button>

            {/* Quick Drawer Toggle */}
            <button
              type="button"
              onClick={() => setShowPositionsDrawer(true)}
              className="px-2.5 py-1.5 rounded-xl bg-[#121824] hover:bg-[#1A2232] border border-[#1F293D] text-xs font-bold text-slate-300 flex items-center gap-1"
            >
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span>{userOpenTrades.length}</span>
            </button>
          </div>

        </div>

        {/* Floating Equity Ribbon */}
        <div className="grid grid-cols-3 gap-2 px-3 py-2 rounded-xl bg-[#121824] border border-[#1F293D] text-[11px] font-mono text-center">
          <div>
            <span className="text-[10px] text-slate-500 block uppercase">Balance</span>
            <span className="font-bold text-white">{formatUSD(balance)}</span>
          </div>
          <div className="border-x border-[#1F293D]">
            <span className="text-[10px] text-slate-500 block uppercase">Equity</span>
            <span className={`font-bold ${floatingPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatUSD(equity)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block uppercase">Free Margin</span>
            <span className="font-bold text-sky-400">{formatUSD(freeMargin)}</span>
          </div>
        </div>

      </header>

      {/* ========================================================================= */}
      {/* 2. CHARTING VIEWPORT & TIMEFRAME STRIP */}
      {/* ========================================================================= */}
      <main className="flex-1 flex flex-col px-3 sm:px-4 py-2 space-y-2">
        
        {/* Timeframe Selector Strip & Spread Indicator */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-1">
          {/* Horizontal Timeframe Pills */}
          <div className="flex items-center gap-1">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.value}
                type="button"
                onClick={() => setCurrentTimeframe(tf.value)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all ${
                  currentTimeframe === tf.value
                    ? 'bg-emerald-500 text-slate-950 shadow-xs'
                    : 'bg-[#121824] text-slate-400 hover:text-white border border-[#1F293D]'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Live Spread Indicator Pill */}
          <div className="px-2.5 py-1 rounded-full bg-[#121824] border border-[#1F293D] text-[11px] font-mono font-bold text-slate-400 flex items-center gap-1 shrink-0">
            <span className="text-slate-500">Spread:</span>
            <span className="text-amber-400">{spreadValue} pips</span>
          </div>
        </div>

        {/* Embedded Real-Time TradingView Candlestick Chart */}
        <div className="w-full flex-1 min-h-[380px] sm:min-h-[460px] rounded-2xl overflow-hidden border border-[#1F293D] shadow-2xl relative">
          <TradingViewWidget
            symbol={currentInstrument.tvSymbol}
            interval={currentTimeframe}
            height="100%"
            allowSymbolChange={false}
          />
        </div>

      </main>

      {/* ========================================================================= */}
      {/* 3. OCTAFX ORDER EXECUTION DOCK (FIXED BOTTOM PANEL) */}
      {/* ========================================================================= */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0A0E17]/95 backdrop-blur-xl border-t border-[#1F293D] p-3 sm:p-4 space-y-2.5 max-w-2xl mx-auto shadow-2xl">
        
        {/* Lot Size Stepper & Quick Chips */}
        <div className="flex items-center justify-between gap-2">
          {/* Stepper Counter */}
          <div className="flex items-center bg-[#121824] border border-[#1F293D] rounded-xl p-1 shrink-0">
            <button
              type="button"
              onClick={() => handleStepLot(-0.01)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white active:bg-[#1A2232]"
              aria-label="Decrease Lot"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="20"
              value={lotSize}
              onChange={(e) => setLotSize(parseFloat(e.target.value) || 0.01)}
              className="w-14 text-center bg-transparent text-xs font-mono font-bold text-white focus:outline-none"
            />
            <button
              type="button"
              onClick={() => handleStepLot(0.01)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white active:bg-[#1A2232]"
              aria-label="Increase Lot"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Lot Chips */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {LOT_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setLotSize(chip)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-colors ${
                  lotSize === chip
                    ? 'bg-slate-200 text-slate-950'
                    : 'bg-[#121824] text-slate-400 hover:text-white border border-[#1F293D]'
                }`}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* SL/TP Toggle Accordion Trigger */}
          <button
            type="button"
            onClick={() => setShowSlTpAccordion(!showSlTpAccordion)}
            className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1 transition-colors ${
              showSlTpAccordion || enableSl || enableTp
                ? 'bg-sky-500/10 border-sky-500/40 text-sky-400'
                : 'bg-[#121824] border-[#1F293D] text-slate-400'
            }`}
            title="Stop Loss / Take Profit"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Expandable SL / TP Inputs */}
        {showSlTpAccordion && (
          <div className="grid grid-cols-2 gap-2 p-2.5 rounded-2xl bg-[#121824] border border-[#1F293D] text-xs animate-in fade-in">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-rose-400 uppercase">Stop Loss ($)</label>
                <input
                  type="checkbox"
                  checked={enableSl}
                  onChange={(e) => setEnableSl(e.target.checked)}
                  className="rounded accent-rose-500"
                />
              </div>
              <input
                type="number"
                disabled={!enableSl}
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="e.g. 2390.00"
                className="w-full bg-[#0A0E17] border border-[#1F293D] rounded-lg px-2 py-1 text-xs text-white font-mono placeholder-slate-600 disabled:opacity-40 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-emerald-400 uppercase">Take Profit ($)</label>
                <input
                  type="checkbox"
                  checked={enableTp}
                  onChange={(e) => setEnableTp(e.target.checked)}
                  className="rounded accent-emerald-500"
                />
              </div>
              <input
                type="number"
                disabled={!enableTp}
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                placeholder="e.g. 2440.00"
                className="w-full bg-[#0A0E17] border border-[#1F293D] rounded-lg px-2 py-1 text-xs text-white font-mono placeholder-slate-600 disabled:opacity-40 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        )}

        {/* Dual Action Split Buttons (OctaFX Large Touch Targets) */}
        <div className="grid grid-cols-2 gap-3">
          {/* Left: SELL Button (Crimson) */}
          <button
            type="button"
            onClick={() => handleExecuteOrder('SELL')}
            className="py-3 px-4 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-lg shadow-rose-600/25 active:scale-95 transition-all flex flex-col items-center justify-center cursor-pointer"
          >
            <div className="flex items-center gap-1 text-[11px] font-extrabold tracking-wider uppercase opacity-90">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>SELL</span>
            </div>
            <span className="text-base sm:text-lg font-black font-mono tracking-tight">{bidPrice}</span>
          </button>

          {/* Right: BUY Button (Emerald) */}
          <button
            type="button"
            onClick={() => handleExecuteOrder('BUY')}
            className="py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all flex flex-col items-center justify-center cursor-pointer"
          >
            <div className="flex items-center gap-1 text-[11px] font-black tracking-wider uppercase opacity-90">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>BUY</span>
            </div>
            <span className="text-base sm:text-lg font-black font-mono tracking-tight">{askPrice}</span>
          </button>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 4. POSITIONS & ORDERS DRAWER (SLIDE-UP SHEET) */}
      {/* ========================================================================= */}
      {showPositionsDrawer && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl bg-[#0A0E17] border border-[#1F293D] rounded-t-3xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 space-y-4 max-h-[80vh] flex flex-col animate-scale-in">
            
            {/* Header & Tabs */}
            <div className="flex items-center justify-between pb-3 border-b border-[#1F293D]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDrawerTab('open')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    drawerTab === 'open' ? 'bg-emerald-500 text-slate-950' : 'bg-[#121824] text-slate-400'
                  }`}
                >
                  Open Positions ({userOpenTrades.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerTab('closed')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    drawerTab === 'closed' ? 'bg-emerald-500 text-slate-950' : 'bg-[#121824] text-slate-400'
                  }`}
                >
                  Closed History ({userClosedTrades.length})
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowPositionsDrawer(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#121824]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="overflow-y-auto flex-1 space-y-2.5">
              {drawerTab === 'open' ? (
                userOpenTrades.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500 font-mono">
                    No active open positions. Execute a BUY or SELL order above.
                  </div>
                ) : (
                  userOpenTrades.map((trade) => (
                    <div
                      key={trade.id}
                      className="p-3.5 rounded-2xl bg-[#121824] border border-[#1F293D] flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase font-mono ${
                            trade.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            {trade.type} {trade.lotSize} Lot
                          </span>
                          <strong className="text-xs font-mono text-white">{trade.symbol}</strong>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-1">
                          Open: {trade.entryPrice} · Margin: ${trade.margin}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right font-mono">
                          <div className={`text-xs font-black ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {trade.pnl >= 0 ? `+$${trade.pnl.toFixed(2)}` : `-$${Math.abs(trade.pnl).toFixed(2)}`}
                          </div>
                          <div className="text-[9px] text-slate-500">Floating P/L</div>
                        </div>

                        <button
                          type="button"
                          disabled={closingId === trade.id}
                          onClick={() => handleClosePosition(trade.id)}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs active:scale-95 transition-all"
                        >
                          {closingId === trade.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Close'}
                        </button>
                      </div>
                    </div>
                  ))
                )
              ) : (
                userClosedTrades.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500 font-mono">
                    No finalized trade history found.
                  </div>
                ) : (
                  userClosedTrades.map((trade: TradeOrder) => (
                    <div
                      key={trade.id}
                      className="p-3.5 rounded-2xl bg-[#121824] border border-[#1F293D] flex items-center justify-between text-xs font-mono"
                    >
                      <div>
                        <div className="font-bold text-white">{trade.symbol} · {trade.type}</div>
                        <div className="text-[10px] text-slate-500">Closed: {trade.closedAt || 'Settled'}</div>
                      </div>
                      <div className={`font-black text-sm ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
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

      {/* ========================================================================= */}
      {/* 5. ZERO-BALANCE GATEKEEPER MODAL */}
      {/* ========================================================================= */}
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
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500 font-mono">Loading Trading Terminal…</div>}>
      <TradePageInner />
    </Suspense>
  );
}
