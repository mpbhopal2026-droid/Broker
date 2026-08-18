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
    <div className="fixed inset-0 z-20 flex flex-col bg-[#0b1018] text-white select-none overflow-hidden">
      
      {/* ═══════════════════════════════════════════════════════════════
          HEADER BAR — Symbol + Account + Equity (compact single strip)
         ═══════════════════════════════════════════════════════════════ */}
      <header className="shrink-0 bg-[#0e1420] border-b border-[#1a2235] px-3 py-2 space-y-1.5">
        
        {/* Row 1: Back + Symbol Picker + Account Pill + Positions Count */}
        <div className="flex items-center justify-between gap-2">
          
          {/* Left: Back & Symbol */}
          <div className="flex items-center gap-2 min-w-0">
            <Link
              href="/dashboard"
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            {/* Symbol Picker */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSymbolPicker(!showSymbolPicker)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer"
              >
                <span className="text-sm font-black font-mono tracking-tight">{currentInstrument.symbol}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                  currentInstrument.change24h.startsWith('+') ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                }`}>
                  {currentInstrument.change24h}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </button>

              {/* Dropdown */}
              {showSymbolPicker && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSymbolPicker(false)} />
                  <div className="absolute top-full left-0 mt-1 w-60 rounded-xl bg-[#141c2c] border border-white/10 shadow-2xl p-1 z-50 space-y-0.5">
                    <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                      Select Instrument
                    </div>
                    {INSTRUMENTS.map((inst) => (
                      <button
                        key={inst.symbol}
                        type="button"
                        onClick={() => {
                          setSelectedSymbol(inst.symbol);
                          setShowSymbolPicker(false);
                        }}
                        className={`w-full p-2 rounded-lg flex items-center justify-between text-left text-xs transition-colors ${
                          selectedSymbol === inst.symbol ? 'bg-emerald-500/10 text-emerald-400' : 'hover:bg-white/5 text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="font-bold font-mono">{inst.symbol}</div>
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
                </>
              )}
            </div>
          </div>

          {/* Right: Account Pill + Positions Toggle */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setAccountMode(isDemo ? 'live' : 'demo')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold font-mono flex items-center gap-1.5 transition-all active:scale-95 ${
                isDemo
                  ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                  : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              <span>{isDemo ? 'DEMO' : `${formatUSD(balance)}`}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPositionsDrawer(true)}
              className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-slate-300 flex items-center gap-1"
            >
              <Layers className="w-3 h-3 text-sky-400" />
              <span>{userOpenTrades.length}</span>
            </button>
          </div>
        </div>

        {/* Row 2: Equity Ribbon (compact) */}
        <div className="grid grid-cols-3 gap-px bg-white/5 rounded-lg overflow-hidden text-center text-[10px] font-mono">
          <div className="bg-[#0e1420] py-1.5">
            <span className="text-slate-500 block uppercase tracking-wider">Balance</span>
            <span className="font-bold text-white text-[11px]">{formatUSD(balance)}</span>
          </div>
          <div className="bg-[#0e1420] py-1.5">
            <span className="text-slate-500 block uppercase tracking-wider">Equity</span>
            <span className={`font-bold text-[11px] ${floatingPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatUSD(equity)}
            </span>
          </div>
          <div className="bg-[#0e1420] py-1.5">
            <span className="text-slate-500 block uppercase tracking-wider">Free Margin</span>
            <span className="font-bold text-sky-400 text-[11px]">{formatUSD(freeMargin)}</span>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════
          TIMEFRAME STRIP — single source of truth (no duplicates)
         ═══════════════════════════════════════════════════════════════ */}
      <div className="shrink-0 flex items-center justify-between px-3 py-1.5 bg-[#0b1018] border-b border-[#1a2235]">
        <div className="flex items-center gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              type="button"
              onClick={() => setCurrentTimeframe(tf.value)}
              className={`px-2 py-1 rounded-md text-[11px] font-bold font-mono transition-all ${
                currentTimeframe === tf.value
                  ? 'bg-emerald-500 text-black'
                  : 'text-slate-500 hover:text-white hover:bg-white/5'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* Live Spread Pill */}
        <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1.5">
          <span>Spread:</span>
          <span className="text-amber-400 font-bold">{spreadValue} pips</span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          CHART VIEWPORT — fills remaining space between header and dock
         ═══════════════════════════════════════════════════════════════ */}
      <main className="flex-1 min-h-0 overflow-hidden">
        <TradingViewWidget
          symbol={currentInstrument.tvSymbol}
          interval={currentTimeframe}
          height="100%"
          allowSymbolChange={false}
        />
      </main>

      {/* ═══════════════════════════════════════════════════════════════
          ORDER EXECUTION DOCK — fixed bottom panel
         ═══════════════════════════════════════════════════════════════ */}
      <div className="shrink-0 bg-[#0e1420] border-t border-[#1a2235] px-3 py-2.5 space-y-2 pb-safe">
        
        {/* Lot Size Stepper & Quick Chips */}
        <div className="flex items-center gap-2">
          {/* Stepper Counter */}
          <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => handleStepLot(-0.01)}
              className="p-1.5 rounded text-slate-400 hover:text-white active:bg-white/10"
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
              className="w-12 text-center bg-transparent text-xs font-mono font-bold text-white focus:outline-none"
            />
            <button
              type="button"
              onClick={() => handleStepLot(0.01)}
              className="p-1.5 rounded text-slate-400 hover:text-white active:bg-white/10"
              aria-label="Increase Lot"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          {/* Quick Lot Chips */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1">
            {LOT_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setLotSize(chip)}
                className={`px-2 py-1 rounded-md text-[11px] font-mono font-bold transition-colors whitespace-nowrap ${
                  lotSize === chip
                    ? 'bg-white/15 text-white'
                    : 'text-slate-500 hover:text-white hover:bg-white/5'
                }`}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* SL/TP Toggle */}
          <button
            type="button"
            onClick={() => setShowSlTpAccordion(!showSlTpAccordion)}
            className={`p-1.5 rounded-lg border text-xs shrink-0 transition-colors ${
              showSlTpAccordion || enableSl || enableTp
                ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                : 'bg-white/5 border-white/10 text-slate-500'
            }`}
            title="Stop Loss / Take Profit"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Expandable SL / TP Inputs */}
        {showSlTpAccordion && (
          <div className="grid grid-cols-2 gap-2 p-2 rounded-lg bg-white/5 border border-white/10 text-xs">
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
                className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-white font-mono placeholder-slate-600 disabled:opacity-30 focus:outline-none focus:border-rose-500"
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
                className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-white font-mono placeholder-slate-600 disabled:opacity-30 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        )}

        {/* Dual Action Split Buttons */}
        <div className="grid grid-cols-2 gap-2">
          {/* SELL Button (Red) */}
          <button
            type="button"
            onClick={() => handleExecuteOrder('SELL')}
            className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-lg shadow-rose-600/20 active:scale-[0.97] transition-all flex flex-col items-center justify-center cursor-pointer"
          >
            <div className="flex items-center gap-1 text-[10px] font-extrabold tracking-wider uppercase opacity-80">
              <TrendingDown className="w-3 h-3" />
              <span>SELL</span>
            </div>
            <span className="text-base font-black font-mono tracking-tight">{bidPrice}</span>
          </button>

          {/* BUY Button (Green) */}
          <button
            type="button"
            onClick={() => handleExecuteOrder('BUY')}
            className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black shadow-lg shadow-emerald-500/20 active:scale-[0.97] transition-all flex flex-col items-center justify-center cursor-pointer"
          >
            <div className="flex items-center gap-1 text-[10px] font-black tracking-wider uppercase opacity-80">
              <TrendingUp className="w-3 h-3" />
              <span>BUY</span>
            </div>
            <span className="text-base font-black font-mono tracking-tight">{askPrice}</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          POSITIONS & ORDERS DRAWER (SLIDE-UP SHEET)
         ═══════════════════════════════════════════════════════════════ */}
      {showPositionsDrawer && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowPositionsDrawer(false)}>
          <div
            className="w-full max-w-lg bg-[#0e1420] border-t border-white/10 rounded-t-2xl shadow-2xl p-4 space-y-3 max-h-[70vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header & Tabs */}
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setDrawerTab('open')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    drawerTab === 'open' ? 'bg-emerald-500 text-black' : 'bg-white/5 text-slate-400'
                  }`}
                >
                  Open ({userOpenTrades.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerTab('closed')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    drawerTab === 'closed' ? 'bg-emerald-500 text-black' : 'bg-white/5 text-slate-400'
                  }`}
                >
                  Closed ({userClosedTrades.length})
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowPositionsDrawer(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="overflow-y-auto flex-1 space-y-2">
              {drawerTab === 'open' ? (
                userOpenTrades.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-500 font-mono">
                    No active open positions.
                  </div>
                ) : (
                  userOpenTrades.map((trade) => (
                    <div
                      key={trade.id}
                      className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase font-mono ${
                            trade.type === 'BUY' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                          }`}>
                            {trade.type} {trade.lotSize} Lot
                          </span>
                          <strong className="text-xs font-mono">{trade.symbol}</strong>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          Open: {trade.entryPrice} · Margin: ${trade.margin}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right font-mono">
                          <div className={`text-xs font-black ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {trade.pnl >= 0 ? `+$${trade.pnl.toFixed(2)}` : `-$${Math.abs(trade.pnl).toFixed(2)}`}
                          </div>
                          <div className="text-[9px] text-slate-500">P/L</div>
                        </div>

                        <button
                          type="button"
                          disabled={closingId === trade.id}
                          onClick={() => handleClosePosition(trade.id)}
                          className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-[11px] active:scale-95 transition-all"
                        >
                          {closingId === trade.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Close'}
                        </button>
                      </div>
                    </div>
                  ))
                )
              ) : (
                userClosedTrades.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-500 font-mono">
                    No finalized trade history.
                  </div>
                ) : (
                  userClosedTrades.map((trade: TradeOrder) => (
                    <div
                      key={trade.id}
                      className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs font-mono"
                    >
                      <div>
                        <div className="font-bold">{trade.symbol} · {trade.type}</div>
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
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500 font-mono">Loading Trading Terminal…</div>}>
      <TradePageInner />
    </Suspense>
  );
}
