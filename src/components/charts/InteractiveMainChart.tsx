'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Maximize2, BarChart2, TrendingUp, Sparkles } from 'lucide-react';

interface ChartPoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface InteractiveMainChartProps {
  symbol?: string;
  basePrice?: number;
  height?: number;
}

export const InteractiveMainChart: React.FC<InteractiveMainChartProps> = ({
  symbol = 'XAU/USD',
  basePrice = 2412.33,
  height = 320,
}) => {
  const [timeframe, setTimeframe] = useState<'1m' | '5m' | '15m' | '1H' | '4H' | '1D'>('15m');
  const [chartType, setChartType] = useState<'line' | 'candles'>('line');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate realistic OHLC points based on timeframe & basePrice
  const data = useMemo<ChartPoint[]>(() => {
    const points: ChartPoint[] = [];
    const count = 36;
    let current = basePrice * 0.985;
    const now = Date.now();

    for (let i = 0; i < count; i++) {
      const stepTime = new Date(now - (count - i) * 15 * 60 * 1000);
      const timeStr = `${stepTime.getHours().toString().padStart(2, '0')}:${stepTime.getMinutes().toString().padStart(2, '0')}`;
      
      const change = (Math.sin(i / 2.5) + (Math.random() - 0.48) * 2) * (basePrice * 0.003);
      const open = current;
      const close = current + change;
      const high = Math.max(open, close) + Math.random() * (basePrice * 0.002);
      const low = Math.min(open, close) - Math.random() * (basePrice * 0.002);
      const volume = Math.floor(400 + Math.random() * 1200);

      points.push({ time: timeStr, open, high, low, close, volume });
      current = close;
    }
    return points;
  }, [basePrice, timeframe]);

  const prices = data.map((d) => (chartType === 'candles' ? [d.high, d.low] : [d.close])).flat();
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;

  const maxVolume = Math.max(...data.map((d) => d.volume)) || 1;

  const width = 640;
  const paddingX = 20;
  const paddingY = 24;
  const chartHeight = height - 50;

  const getY = (val: number) => {
    return chartHeight - paddingY - ((val - minPrice) / priceRange) * (chartHeight - paddingY * 2);
  };

  const getX = (idx: number) => {
    return paddingX + (idx / (data.length - 1)) * (width - paddingX * 2);
  };

  // Line path & Area gradient
  const linePoints = data.map((d, i) => `${getX(i).toFixed(1)},${getY(d.close).toFixed(1)}`);
  const linePath = `M ${linePoints.join(' L ')}`;
  const areaPath = `${linePath} L ${getX(data.length - 1).toFixed(1)},${chartHeight} L ${getX(0).toFixed(1)},${chartHeight} Z`;

  const isUp = data[data.length - 1].close >= data[0].close;
  const strokeColor = isUp ? '#10b981' : '#f43f5e';

  const hoveredPoint = hoverIndex !== null ? data[hoverIndex] : data[data.length - 1];

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, (x - paddingX) / (rect.width - paddingX * 2)));
    const index = Math.round(ratio * (data.length - 1));
    setHoverIndex(index);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  return (
    <div ref={containerRef} className="p-5 rounded-2xl bg-white dark:bg-[#0d121c] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      
      {/* Top Header inside Chart */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                {symbol} Price Chart
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-[#00d674] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Stream
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-black font-mono text-slate-900 dark:text-white">
                ${hoveredPoint.close.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={`text-xs font-bold font-mono ${isUp ? 'text-emerald-600 dark:text-[#00d674]' : 'text-rose-600 dark:text-[#ff3b57]'}`}>
                {isUp ? '+' : ''}{((hoveredPoint.close - data[0].open) / data[0].open * 100).toFixed(2)}%
              </span>
              <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                Time: {hoveredPoint.time}
              </span>
            </div>
          </div>
        </div>

        {/* Timeframe & Chart Type Controls */}
        <div className="flex items-center gap-2">
          {/* Timeframe Pills */}
          <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            {(['1m', '5m', '15m', '1H', '4H', '1D'] as const).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 rounded-md text-xs font-bold font-mono transition-all ${
                  timeframe === tf
                    ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm font-black'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Line / Candlestick Switcher */}
          <button
            type="button"
            onClick={() => setChartType(chartType === 'line' ? 'candles' : 'line')}
            title="Toggle Candlestick / Line"
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <BarChart2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative w-full overflow-hidden" style={{ height: chartHeight }}>
        <svg
          viewBox={`0 0 ${width} ${chartHeight}`}
          preserveAspectRatio="none"
          className="w-full h-full cursor-crosshair select-none"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="main-chart-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={0.22} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map((ratio) => {
            const y = paddingY + ratio * (chartHeight - paddingY * 2);
            return (
              <line
                key={ratio}
                x1={paddingX}
                y1={y}
                x2={width - paddingX}
                y2={y}
                stroke="currentColor"
                className="text-slate-100 dark:text-slate-800/60"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
            );
          })}

          {/* Bottom Volume Bars */}
          {data.map((d, i) => {
            const barX = getX(i) - 3;
            const barHeight = (d.volume / maxVolume) * 36;
            const isCandleUp = d.close >= d.open;
            return (
              <rect
                key={`vol-${i}`}
                x={barX}
                y={chartHeight - barHeight}
                width={6}
                height={barHeight}
                className={isCandleUp ? 'fill-emerald-500/20 dark:fill-emerald-500/25' : 'fill-rose-500/20 dark:fill-rose-500/25'}
                rx={1}
              />
            );
          })}

          {chartType === 'line' ? (
            <>
              {/* Area Fill */}
              <path d={areaPath} fill="url(#main-chart-gradient)" />
              {/* Line Stroke */}
              <path
                d={linePath}
                fill="none"
                stroke={strokeColor}
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          ) : (
            /* Candlestick renderer */
            data.map((d, i) => {
              const x = getX(i);
              const isCandleUp = d.close >= d.open;
              const yHigh = getY(d.high);
              const yLow = getY(d.low);
              const yOpen = getY(d.open);
              const yClose = getY(d.close);
              const candleTop = Math.min(yOpen, yClose);
              const candleHeight = Math.max(2, Math.abs(yClose - yOpen));
              const color = isCandleUp ? '#10b981' : '#f43f5e';

              return (
                <g key={`candle-${i}`}>
                  <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth="1.2" />
                  <rect
                    x={x - 4}
                    y={candleTop}
                    width={8}
                    height={candleHeight}
                    fill={color}
                    rx={1}
                  />
                </g>
              );
            })
          )}

          {/* Hover Crosshair & Point */}
          {hoverIndex !== null && (
            <>
              <line
                x1={getX(hoverIndex)}
                y1={0}
                x2={getX(hoverIndex)}
                y2={chartHeight}
                stroke="currentColor"
                className="text-slate-400 dark:text-slate-600"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <circle
                cx={getX(hoverIndex)}
                cy={getY(hoveredPoint.close)}
                r={4.5}
                fill={strokeColor}
                className="stroke-white dark:stroke-slate-900 stroke-2"
              />
            </>
          )}
        </svg>
      </div>

      {/* Bottom Axis Time Labels */}
      <div className="flex justify-between text-[11px] font-mono text-slate-400 px-2 pt-1 border-t border-slate-100 dark:border-slate-800/60">
        <span>{data[0]?.time}</span>
        <span>{data[Math.floor(data.length / 2)]?.time}</span>
        <span className="font-bold text-slate-900 dark:text-white">{data[data.length - 1]?.time} (Now)</span>
      </div>

    </div>
  );
};
