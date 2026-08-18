'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, RefreshCw, Layers, TrendingUp, BarChart2 } from 'lucide-react';
import { ChartSkeleton } from '@/components/ui/Skeleton';

interface TradingViewWidgetProps {
  symbol?: string;
  height?: number | string;
  allowSymbolChange?: boolean;
  interval?: string;
}

export const TradingViewWidget: React.FC<TradingViewWidgetProps> = ({
  symbol = 'OANDA:XAUUSD',
  height = 560,
  allowSymbolChange = true,
  interval = '15',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentInterval, setCurrentInterval] = useState(interval);
  const [isLoading, setIsLoading] = useState(true);
  const [containerId] = useState(() => `tv_chart_${Math.random().toString(36).substring(2, 9)}`);

  useEffect(() => {
    setIsLoading(true);
    if (!containerRef.current) return;

    // Clear previous container contents
    containerRef.current.innerHTML = '';

    const loadWidget = () => {
      if (typeof (window as any).TradingView !== 'undefined' && containerRef.current) {
        new (window as any).TradingView.widget({
          autosize: true,
          symbol: symbol,
          interval: currentInterval,
          timezone: 'Asia/Kolkata',
          theme: 'dark',
          style: '1', // Candlestick style
          locale: 'en',
          enable_publishing: false,
          allow_symbol_change: allowSymbolChange,
          container_id: containerId,
          backgroundColor: '#06090e',
          gridColor: '#121824',
          hide_side_toolbar: false,
          hide_top_toolbar: false,
          studies: [
            'RSI@tv-basicstudies',
            'MASimple@tv-basicstudies',
            'Volume@tv-basicstudies'
          ],
          toolbar_bg: '#0a0e16',
          loading_screen: { backgroundColor: '#06090e', foregroundColor: '#00d674' },
        });
        setTimeout(() => setIsLoading(false), 600);
      }
    };

    if (!(window as any).TradingView) {
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/tv.js';
      script.async = true;
      script.onload = loadWidget;
      document.head.appendChild(script);
    } else {
      loadWidget();
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [symbol, currentInterval, allowSymbolChange, containerId]);

  const intervals = [
    { label: '1m', value: '1' },
    { label: '5m', value: '5' },
    { label: '15m', value: '15' },
    { label: '1H', value: '60' },
    { label: '4H', value: '240' },
    { label: '1D', value: 'D' },
  ];

  return (
    <div className="flex flex-col w-full rounded-2xl bg-[#06090e] border border-slate-800 overflow-hidden shadow-2xl relative">
      
      {/* Top Chart Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[#0a0e16] border-b border-slate-800 text-xs select-none">
        
        {/* Timeframe Selector */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] uppercase font-bold text-slate-500 mr-1.5 hidden sm:inline">Timeframe:</span>
          {intervals.map((tf) => (
            <button
              key={tf.value}
              type="button"
              onClick={() => setCurrentInterval(tf.value)}
              className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold transition-all ${
                currentInterval === tf.value
                  ? 'bg-[#00d674]/20 text-[#00d674] border border-[#00d674]/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* Live Candlestick Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-[#00d674] font-mono font-bold">
            <span className="w-2 h-2 rounded-full bg-[#00d674] radar-dot" />
            LIVE CANDLESTICK STREAM
          </div>
        </div>

      </div>

      {/* Canvas Area with Loading Overlay */}
      <div className="relative w-full" style={{ height: typeof height === 'number' ? `${height}px` : height }}>
        {isLoading && (
          <div className="absolute inset-0 z-10">
            <ChartSkeleton height={typeof height === 'number' ? height : 540} />
          </div>
        )}
        <div
          id={containerId}
          ref={containerRef}
          className="w-full h-full min-h-[420px]"
        />
      </div>

    </div>
  );
};
