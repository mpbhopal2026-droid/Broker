'use client';

import React, { useEffect, useRef, memo } from 'react';
import { useApp } from '@/lib/store';

interface RealLiveTradingChartProps {
  symbol?: string;
  tvSymbol?: string;
  height?: number | string;
}

const mapToTradingViewSymbol = (symbol: string, defaultTv?: string): string => {
  if (defaultTv) return defaultTv;
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

export const RealLiveTradingChart: React.FC<RealLiveTradingChartProps> = memo(
  ({ symbol = 'XAU/USD', tvSymbol, height = 480 }) => {
    const { theme } = useApp();
    const containerRef = useRef<HTMLDivElement>(null);
    const resolvedSymbol = mapToTradingViewSymbol(symbol, tvSymbol);
    const isDark = theme === 'dark';

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
        symbol: resolvedSymbol,
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
        gridColor: isDark ? 'rgba(30, 41, 59, 1)' : 'rgba(240, 243, 246, 1)',
      });

      widgetContainer.appendChild(script);
      currentContainer.appendChild(widgetContainer);

      return () => {
        if (currentContainer) {
          currentContainer.innerHTML = '';
        }
      };
    }, [resolvedSymbol, isDark]);

    return (
      <div className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
        <div
          ref={containerRef}
          style={{ height: typeof height === 'number' ? `${height}px` : height, minHeight: '440px' }}
          className="w-full relative bg-white dark:bg-[#0f172a]"
        />
      </div>
    );
  }
);

RealLiveTradingChart.displayName = 'RealLiveTradingChart';
