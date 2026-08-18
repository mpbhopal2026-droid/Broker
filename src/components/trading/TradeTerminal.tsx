'use client';

import React, { useState } from 'react';
import { TrendingUp, ArrowUpRight, ArrowDownRight, CheckCircle2, FlaskConical, Sliders } from 'lucide-react';
import { useApp } from '@/lib/store';
import { formatUSD } from '@/lib/utils';
import { InsufficientFundsModal } from '@/components/trading/InsufficientFundsModal';

interface TradeTerminalProps {
  symbol?: string;
}

const LOT_PRESETS = [0.01, 0.05, 0.10, 0.50, 1.00, 2.00];
const MARGIN_PRESETS = [25, 50, 100, 250, 500];

export const TradeTerminal: React.FC<TradeTerminalProps> = ({ symbol = 'XAU/USD' }) => {
  const { openTrade, currentUser, isDemo, demo } = useApp();

  const availableMargin = isDemo
    ? (demo?.equity ?? demo?.balance ?? 0)
    : (currentUser?.walletBalance ?? 0);

  const [lotSize, setLotSize] = useState<number>(0.10);
  const [margin, setMargin] = useState<number>(50.00);
  const [leverage, setLeverage] = useState<number>(100);
  const [stopLoss, setStopLoss] = useState<string>('');
  const [takeProfit, setTakeProfit] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showInsufficientFundsModal, setShowInsufficientFundsModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'BUY' | 'SELL'>('BUY');

  const handlePlaceOrder = (type: 'BUY' | 'SELL') => {
    // Gatekeeper: if live account has <= 0 balance, trigger high-converting deposit modal
    if (!isDemo && (currentUser?.walletBalance ?? 0) <= 0) {
      setPendingAction(type);
      setShowInsufficientFundsModal(true);
      return;
    }

    openTrade(
      symbol,
      symbol,
      type,
      lotSize,
      margin,
      leverage,
      stopLoss ? Number(stopLoss) : undefined,
      takeProfit ? Number(takeProfit) : undefined
    );
    setSuccessMsg(`Order placed: ${type} ${lotSize} lot ${symbol} with ${leverage}x leverage`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  return (
    <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm select-none">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-wider font-mono">
            {symbol}
          </h3>
          {isDemo && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-black tracking-wide">
              <FlaskConical className="w-2.5 h-2.5" />
              DEMO
            </span>
          )}
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-400 block font-medium">Available Margin</span>
          <span className={`text-xs font-mono font-bold ${isDemo ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {formatUSD(availableMargin)}
          </span>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Lot Size Quick Select */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs">
          <label className="text-slate-700 dark:text-slate-300 font-bold text-xs">Lot Size</label>
          <span className="text-[11px] font-mono text-slate-400 font-bold">{lotSize} Lot</span>
        </div>
        
        {/* Quick Lot Chips */}
        <div className="grid grid-cols-6 gap-1.5">
          {LOT_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setLotSize(preset)}
              className={`py-1.5 rounded-xl text-xs font-bold font-mono transition-all active:scale-95 ${
                lotSize === preset
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Margin Collateral Selection */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs">
          <label className="text-slate-700 dark:text-slate-300 font-bold text-xs">Margin Collateral ($)</label>
          <span className="text-[11px] font-mono text-slate-400 font-bold">${margin}</span>
        </div>

        {/* Quick Margin Chips */}
        <div className="grid grid-cols-5 gap-1.5">
          {MARGIN_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setMargin(p)}
              className={`py-1.5 rounded-xl text-xs font-bold font-mono transition-all active:scale-95 ${
                margin === p
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              ${p}
            </button>
          ))}
        </div>
      </div>

      {/* Order Execution Buttons */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <button
          type="button"
          onClick={() => handlePlaceOrder('BUY')}
          className="flex flex-col items-center justify-center py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
        >
          <span className="text-sm font-black">BUY</span>
          <span className="text-[10px] opacity-80 font-normal">Long {symbol}</span>
        </button>

        <button
          type="button"
          onClick={() => handlePlaceOrder('SELL')}
          className="flex flex-col items-center justify-center py-3.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
        >
          <span className="text-sm font-black">SELL</span>
          <span className="text-[10px] opacity-80 font-normal">Short {symbol}</span>
        </button>
      </div>

    </div>
  );
};
