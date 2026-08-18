'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronDown, Maximize2, TrendingUp, Sparkles } from 'lucide-react';
import { useApp } from '@/lib/store';

interface ExactMarketCandleChartProps {
  selectedSymbol?: string;
  onSymbolChange?: (s: string) => void;
}

const mapToTvSymbol = (symbol: string): string => {
  const clean = symbol.replace('/', '').toUpperCase();
  if (clean.includes('XAU') || clean.includes('GOLD')) return 'OANDA:XAUUSD';
  if (clean.includes('BTC')) return 'BINANCE:BTCUSDT';
  if (clean.includes('ETH')) return 'BINANCE:ETHUSDT';
  if (clean.includes('EUR')) return 'FX:EURUSD';
  if (clean.includes('GBP')) return 'FX:GBPUSD';
  if (clean.includes('JPY')) return 'FX:USDJPY';
  if (clean.includes('SOL')) return 'BINANCE:SOLUSDT';
  if (clean.includes('CRUDE') || clean.includes('OIL')) return 'TVC:USOIL';
  if (clean.includes('SILVER') || clean.includes('XAG')) return 'OANDA:XAGUSD';
  return `FX:${clean}`;
};

export const ExactMarketCandleChart: React.FC<ExactMarketCandleChartProps> = ({
  selectedSymbol = 'XAU/USD',
  onSymbolChange,
}) => {
  const { marketAssets, theme } = useApp();
  const [symbolDropdownOpen, setSymbolDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const availableSymbols = [
    'XAU/USD',
    'EUR/USD',
    'GBP/USD',
    'BTC/USD',
    'ETH/USD',
    'USD/JPY',
    'XAG/USD',
  ];

  const currentAsset = useMemo(() => {
    return (
      marketAssets.find((a) => a.symbol === selectedSymbol) || {
        symbol: selectedSymbol,
        name: 'Spot Asset',
        price: 2412.51,
        change: 18.2,
        changePercent: 0.75,
      }
    );
  }, [marketAssets, selectedSymbol]);

  const resolvedTvSymbol = mapToTvSymbol(selectedSymbol);
  const isDark = theme === 'dark';

  // Initialize Real Live TradingView Widget
  useEffect(() => {
    const currentContainer = containerRef.current;
    if (!currentContainer) return;

    currentContainer.innerHTML = '';

    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container';
    widgetContainer.style.height = '100%';
    widgetContainer.style.width = '100%';

    const widgetInner = document.createElement('div');
    widgetInner.className = 'tradingview-widget-container__widget';
    widgetInner.style.height = '100%';
    widgetInner.style.width = '100%';
    widgetContainer.appendChild(widgetInner);

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: resolvedTvSymbol,
      interval: '15',
      timezone: 'Etc/UTC',
      theme: isDark ? 'dark' : 'light',
      style: '1',
      locale: 'en',
      enable_publishing: false,
      allow_symbol_change: true,
      calendar: false,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: true,
      hide_volume: false,
      support_host: 'https://www.tradingview.com',
      backgroundColor: isDark ? 'rgba(15, 23, 42, 1)' : 'rgba(255, 255, 255, 1)',
      gridColor: isDark ? 'rgba(30, 41, 59, 1)' : 'rgba(241, 245, 249, 1)',
    });

    widgetContainer.appendChild(script);
    currentContainer.appendChild(widgetContainer);

    return () => {
      if (currentContainer) {
        currentContainer.innerHTML = '';
      }
    };
  }, [resolvedTvSymbol, isDark]);

  const isUp = (currentAsset.changePercent ?? 0) >= 0;

  return (
    <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 sm:p-5 shadow-2xs space-y-3 select-none">
      
      {/* Chart Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        
        {/* Left: Live Symbol Selector & Stats */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:inline">
            Live Chart
          </span>

          {/* Symbol Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setSymbolDropdownOpen(!symbolDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white shadow-2xs transition-all"
            >
              <span>{selectedSymbol}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {symbolDropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-36 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 z-50 text-xs">
                {availableSymbols.map((sym) => (
                  <button
                    key={sym}
                    onClick={() => {
                      onSymbolChange?.(sym);
                      setSymbolDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left font-bold transition-colors ${
                      selectedSymbol === sym
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-950 dark:text-white font-black'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    {sym}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Live Price Tag */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">
              ${(currentAsset.price ?? 2412.51).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: (currentAsset.price ?? 2412.51) > 100 ? 2 : 4 })}
            </span>
            <span className={`text-xs font-semibold ${isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {isUp ? '+' : ''}{currentAsset.changePercent ?? 0.75}%
            </span>
          </div>
        </div>

        {/* Right: Live Stream Badge */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Market Stream
          </span>
        </div>

      </div>

      {/* Real Live Streaming Chart Container */}
      <div className="w-full h-[320px] sm:h-[420px] lg:h-[480px] rounded-xl overflow-hidden bg-white dark:bg-[#0f172a] relative">
        <div
          ref={containerRef}
          className="w-full h-full relative bg-white dark:bg-[#0f172a]"
        />
      </div>

    </div>
  );
};
