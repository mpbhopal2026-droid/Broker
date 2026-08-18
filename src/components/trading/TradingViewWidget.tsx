'use client';

import React, { useEffect, useRef, useState } from 'react';
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
  allowSymbolChange = false,
  interval = '15',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
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
          interval: interval,
          timezone: 'Asia/Kolkata',
          theme: 'dark',
          style: '1', // Candlestick style
          locale: 'en',
          enable_publishing: false,
          allow_symbol_change: allowSymbolChange,
          container_id: containerId,
          backgroundColor: '#0b1018',
          gridColor: '#151d2b',
          hide_side_toolbar: true,
          hide_top_toolbar: true,
          withdateranges: false,
          studies: [
            'RSI@tv-basicstudies',
            'MASimple@tv-basicstudies',
            'Volume@tv-basicstudies'
          ],
          toolbar_bg: '#0b1018',
          loading_screen: { backgroundColor: '#0b1018', foregroundColor: '#10b981' },
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
  }, [symbol, interval, allowSymbolChange, containerId]);

  return (
    <div className="w-full h-full relative">
      {isLoading && (
        <div className="absolute inset-0 z-10">
          <ChartSkeleton height={typeof height === 'number' ? height : 420} />
        </div>
      )}
      <div
        id={containerId}
        ref={containerRef}
        className="w-full h-full"
      />
    </div>
  );
};
