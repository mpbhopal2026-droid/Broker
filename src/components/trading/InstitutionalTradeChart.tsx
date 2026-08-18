'use client';

import React, { useState } from 'react';
import {
  Maximize2,
  Minimize2,
  Crosshair,
  TrendingUp,
  Sliders,
  Type,
  Maximize,
  Magnet,
  Lock,
  Eye,
  Trash2,
  BarChart2,
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';

interface TradeChartProps {
  symbol: string;
  currentPrice: number;
}

export const InstitutionalTradeChart: React.FC<TradeChartProps> = ({
  symbol,
  currentPrice,
}) => {
  const [timeframe, setTimeframe] = useState<'1m' | '5m' | '15m' | '1H' | '4H' | '1D'>('15m');
  const [chartType, setChartType] = useState<'candles' | 'line'>('candles');
  const [activeTool, setActiveTool] = useState<string>('crosshair');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const timeframes: Array<'1m' | '5m' | '15m' | '1H' | '4H' | '1D'> = ['1m', '5m', '15m', '1H', '4H', '1D'];

  // Drawing toolbar items matching TradingView on left
  const tools = [
    { id: 'crosshair', icon: Crosshair, label: 'Crosshair' },
    { id: 'trendline', icon: TrendingUp, label: 'Trend Line' },
    { id: 'fibonacci', icon: Sliders, label: 'Fib Retracement' },
    { id: 'shapes', icon: Layers, label: 'Brush & Shapes' },
    { id: 'text', icon: Type, label: 'Text Note' },
    { id: 'measure', icon: Maximize, label: 'Measure Range' },
    { id: 'magnet', icon: Magnet, label: 'Magnet Mode' },
    { id: 'lock', icon: Lock, label: 'Lock Drawings' },
    { id: 'hide', icon: Eye, label: 'Hide Drawings' },
    { id: 'trash', icon: Trash2, label: 'Clear Drawings' },
  ];

  // 36 institutional candlestick data points matching the screenshot
  const candles = [
    { time: '06:00', open: 2404, high: 2407, low: 2401, close: 2405, vol: 45 },
    { time: '07:00', open: 2405, high: 2409, low: 2403, close: 2408, vol: 55 },
    { time: '08:00', open: 2408, high: 2408, low: 2400, close: 2402, vol: 80 },
    { time: '09:00', open: 2402, high: 2406, low: 2398, close: 2405, vol: 60 },
    { time: '10:00', open: 2405, high: 2412, low: 2404, close: 2410, vol: 95 },
    { time: '11:00', open: 2410, high: 2414, low: 2408, close: 2413, vol: 110 },
    { time: '12:00', open: 2413, high: 2413, low: 2406, close: 2407, vol: 70 },
    { time: '13:00', open: 2407, high: 2411, low: 2405, close: 2410, vol: 65 },
    { time: '14:00', open: 2410, high: 2415, low: 2409, close: 2414, vol: 85 },
    { time: '15:00', open: 2414, high: 2419, low: 2412, close: 2418, vol: 130 },
    { time: '16:00', open: 2418, high: 2420, low: 2414, close: 2415, vol: 90 },
    { time: '17:00', open: 2415, high: 2418, low: 2411, close: 2412, vol: 75 },
    { time: '18:00', open: 2412, high: 2416, low: 2408, close: 2415, vol: 85 },
    { time: '19:00', open: 2415, high: 2421, low: 2414, close: 2420, vol: 120 },
    { time: '20:00', open: 2420, high: 2425, low: 2419, close: 2424, vol: 145 },
    { time: '21:00', open: 2424, high: 2428, low: 2422, close: 2427, vol: 160 },
    { time: '22:00', open: 2427, high: 2427, low: 2419, close: 2421, vol: 115 },
    { time: '23:00', open: 2421, high: 2423, low: 2416, close: 2417, vol: 80 },
    { time: '00:00', open: 2417, high: 2419, low: 2410, close: 2411, vol: 95 },
    { time: '01:00', open: 2411, high: 2415, low: 2408, close: 2413, vol: 70 },
    { time: '02:00', open: 2413, high: 2418, low: 2411, close: 2417, vol: 85 },
    { time: '03:00', open: 2417, high: 2422, low: 2415, close: 2421, vol: 105 },
    { time: '04:00', open: 2421, high: 2424, low: 2417, close: 2419, vol: 90 },
    { time: '05:00', open: 2419, high: 2420, low: 2412, close: 2413, vol: 85 },
    { time: '06:00', open: 2413, high: 2415, low: 2405, close: 2407, vol: 120 },
    { time: '07:00', open: 2407, high: 2410, low: 2401, close: 2403, vol: 140 },
    { time: '08:00', open: 2403, high: 2408, low: 2400, close: 2406, vol: 95 },
    { time: '09:00', open: 2406, high: 2414, low: 2405, close: 2412, vol: 110 },
    { time: '10:00', open: 2412, high: 2418, low: 2410, close: 2416, vol: 135 },
    { time: '11:00', open: 2416, high: 2423, low: 2415, close: 2421, vol: 150 },
    { time: '12:00', open: 2421, high: 2426, low: 2419, close: 2425, vol: 165 },
    { time: '13:00', open: 2425, high: 2425, low: 2416, close: 2418, vol: 125 },
    { time: '14:00', open: 2418, high: 2420, low: 2412, close: 2414, vol: 95 },
    { time: '15:00', open: 2414, high: 2417, low: 2411, close: 2413, vol: 80 },
    { time: '16:00', open: 2413, high: 2416, low: 2410, close: 2415, vol: 90 },
    { time: '17:00', open: 2415, high: 2418, low: 2414, close: currentPrice, vol: 110 },
  ];

  const minPrice = 2390;
  const maxPrice = 2430;
  const priceRange = maxPrice - minPrice;

  // Chart coordinates
  const svgWidth = 800;
  const svgHeight = 360;
  const marginChart = { top: 20, right: 65, bottom: 45, left: 10 };
  const plotWidth = svgWidth - marginChart.left - marginChart.right;
  const plotHeight = svgHeight - marginChart.top - marginChart.bottom;

  const getX = (index: number) =>
    marginChart.left + (index / (candles.length - 1)) * plotWidth;

  const getY = (val: number) =>
    marginChart.top + plotHeight - ((val - minPrice) / priceRange) * plotHeight;

  const priceY = getY(currentPrice);

  const priceGridLevels = [2430, 2425, 2420, 2415, 2410, 2405, 2400, 2395, 2390];

  return (
    <div
      className={`bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs select-none flex flex-col ${
        isFullscreen ? 'fixed inset-4 z-50 shadow-2xl' : 'relative w-full'
      }`}
    >
      {/* 1. Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between px-3.5 py-2.5 border-b border-slate-100 bg-white gap-2 text-xs">
        
        {/* Left: Chart Tab & Timeframe Pills */}
        <div className="flex items-center gap-1 sm:gap-2">
          <span className="font-bold text-slate-900 pr-2 border-r border-slate-200">Chart</span>
          
          <div className="flex items-center gap-1">
            {timeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-1 rounded-md font-semibold text-[11px] transition-colors ${
                  timeframe === tf
                    ? 'bg-[#eff2ff] text-[#4f46e5] font-bold'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Chart Tools & Fullscreen */}
        <div className="flex items-center gap-2 text-slate-500">
          <button
            onClick={() => setChartType('candles')}
            title="Candlestick Chart"
            className={`p-1.5 rounded-md hover:bg-slate-50 ${
              chartType === 'candles' ? 'text-slate-950 font-bold' : 'text-slate-400'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setChartType('line')}
            title="Line Chart"
            className={`p-1.5 rounded-md hover:bg-slate-50 ${
              chartType === 'line' ? 'text-slate-950 font-bold' : 'text-slate-400'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
          </button>

          <button className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-slate-600 hover:bg-slate-50">
            <span className="italic font-serif">fx</span>
            <span>Indicators</span>
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className="p-1.5 rounded-md hover:bg-slate-50 text-slate-400 hover:text-slate-700"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>

      </div>

      {/* 2. OHLC Subheader Stats Bar */}
      <div className="px-4 py-1.5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono">
        <span className="font-sans font-bold text-slate-900">{symbol} · 15 · Global Forex</span>
        <span className="text-slate-400">O <strong className="text-emerald-600 font-normal">2,413.15</strong></span>
        <span className="text-slate-400">H <strong className="text-emerald-600 font-normal">2,417.23</strong></span>
        <span className="text-slate-400">L <strong className="text-emerald-600 font-normal">2,412.51</strong></span>
        <span className="text-slate-400">C <strong className="text-emerald-600 font-normal">{currentPrice.toFixed(2)}</strong></span>
        <span className="text-emerald-600 font-bold">+3.14 (+0.13%)</span>
      </div>

      {/* 3. Main Chart Canvas Area with Left Drawing Toolset */}
      <div className="flex flex-1 min-h-[380px] relative">
        
        {/* Left Vertical Drawing Toolbar */}
        <div className="w-9 border-r border-slate-100 flex flex-col items-center py-2 gap-1 text-slate-400 bg-white shrink-0">
          {tools.map((t) => {
            const ToolIcon = t.icon;
            const isSelected = activeTool === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTool(t.id)}
                title={t.label}
                className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
                  isSelected
                    ? 'bg-slate-100 text-slate-950 font-bold'
                    : 'hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <ToolIcon className="w-3.5 h-3.5" />
              </button>
            );
          })}
        </div>

        {/* SVG Candlestick Plot Area */}
        <div className="flex-1 relative overflow-hidden bg-white">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            preserveAspectRatio="none"
            className="w-full h-full"
          >
            {/* Horizontal Grid lines and Price labels on right Y-axis */}
            {priceGridLevels.map((lvl) => {
              const y = getY(lvl);
              return (
                <g key={lvl}>
                  <line
                    x1={marginChart.left}
                    y1={y}
                    x2={svgWidth - marginChart.right}
                    y2={y}
                    stroke="#f1f5f9"
                    strokeWidth="1"
                  />
                  <text
                    x={svgWidth - marginChart.right + 8}
                    y={y + 3.5}
                    fill="#94a3b8"
                    fontSize="10"
                    fontFamily="monospace"
                    textAnchor="start"
                  >
                    {lvl.toFixed(2)}
                  </text>
                </g>
              );
            })}

            {/* Volume Spikes (Bottom 15% height) */}
            {candles.map((c, i) => {
              const x = getX(i);
              const isGreen = c.close >= c.open;
              const barHeight = (c.vol / 180) * 35;
              const barY = marginChart.top + plotHeight - barHeight;
              return (
                <rect
                  key={`vol-${i}`}
                  x={x - 3}
                  y={barY}
                  width={6}
                  height={barHeight}
                  fill={isGreen ? '#bbf7d0' : '#fecdd3'}
                  opacity={0.8}
                />
              );
            })}

            {/* Candlestick Glyphs */}
            {chartType === 'candles' &&
              candles.map((c, i) => {
                const x = getX(i);
                const isGreen = c.close >= c.open;
                const topWick = getY(c.high);
                const bottomWick = getY(c.low);
                const bodyTop = getY(Math.max(c.open, c.close));
                const bodyBottom = getY(Math.min(c.open, c.close));
                const bodyHeight = Math.max(2, bodyBottom - bodyTop);

                return (
                  <g key={`candle-${i}`}>
                    {/* Wick */}
                    <line
                      x1={x}
                      y1={topWick}
                      x2={x}
                      y2={bottomWick}
                      stroke={isGreen ? '#10b981' : '#ef4444'}
                      strokeWidth="1.2"
                    />
                    {/* Candle Body */}
                    <rect
                      x={x - 4}
                      y={bodyTop}
                      width={8}
                      height={bodyHeight}
                      fill={isGreen ? '#10b981' : '#ef4444'}
                      rx="0.5"
                    />
                  </g>
                );
              })}

            {/* Line Chart option */}
            {chartType === 'line' && (
              <path
                d={candles
                  .map((c, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)},${getY(c.close).toFixed(1)}`)
                  .join(' ')}
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
              />
            )}

            {/* Current Price Dashed Crosshair Level */}
            <line
              x1={marginChart.left}
              y1={priceY}
              x2={svgWidth - marginChart.right}
              y2={priceY}
              stroke="#10b981"
              strokeWidth="1"
              strokeDasharray="3 3"
            />

            {/* Current Price Y-Axis Badge on Right */}
            <rect
              x={svgWidth - marginChart.right}
              y={priceY - 8}
              width={58}
              height={16}
              fill="#10b981"
              rx="3"
            />
            <text
              x={svgWidth - marginChart.right + 29}
              y={priceY + 3.5}
              fill="#ffffff"
              fontSize="10"
              fontFamily="monospace"
              fontWeight="bold"
              textAnchor="middle"
            >
              {currentPrice.toFixed(2)}
            </text>

            {/* X Axis Time Labels */}
            {candles
              .filter((_, idx) => idx % 6 === 0 || idx === candles.length - 1)
              .map((c, i) => {
                const idx = candles.indexOf(c);
                return (
                  <text
                    key={`time-${idx}`}
                    x={getX(idx)}
                    y={svgHeight - 8}
                    fill="#94a3b8"
                    fontSize="10"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {c.time}
                  </text>
                );
              })}
          </svg>

          {/* Watermark */}
          <div className="absolute bottom-10 left-4 pointer-events-none opacity-10 flex items-center gap-1">
            <span className="text-3xl font-black text-slate-900">▲</span>
            <span className="font-bold text-slate-900 text-sm">Global Forex</span>
          </div>
        </div>

      </div>

    </div>
  );
};
