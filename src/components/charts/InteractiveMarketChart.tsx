'use client';

import React, { useState, useRef, useMemo, useCallback } from 'react';

export interface ChartDataPoint {
  time: string;
  price: number;
  timestamp: number;
}

interface InteractiveMarketChartProps {
  symbol: string;
  currentPrice: number;
  timeframe: string;
  isPositive: boolean;
  onHoverPoint?: (point: ChartDataPoint | null) => void;
  height?: number;
}

/**
 * Generates realistic historical timestamped price series for each timeframe.
 */
function generateTimeframeData(
  symbol: string,
  basePrice: number,
  timeframe: string,
  isPositive: boolean
): ChartDataPoint[] {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = (hash << 5) - hash + symbol.charCodeAt(i);
    hash |= 0;
  }

  // Seeded pseudo-random
  let seed = Math.abs(hash) + timeframe.charCodeAt(0) * 100 || 54321;
  const nextRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const pointCount = timeframe === '1D' ? 60 : timeframe === '1W' ? 50 : 65;
  const totalChangePercent = isPositive ? (timeframe === '1D' ? 0.75 : timeframe === '1W' ? 2.1 : 6.5) : (timeframe === '1D' ? -0.8 : timeframe === '1W' ? -2.4 : -5.8);
  const startPrice = basePrice / (1 + totalChangePercent / 100);

  const points: ChartDataPoint[] = [];
  const now = Date.now();
  const durationMs =
    timeframe === '1D'
      ? 24 * 60 * 60 * 1000
      : timeframe === '1W'
      ? 7 * 24 * 60 * 60 * 1000
      : timeframe === '1M'
      ? 30 * 24 * 60 * 60 * 1000
      : timeframe === '3M'
      ? 90 * 24 * 60 * 60 * 1000
      : timeframe === '6M'
      ? 180 * 24 * 60 * 60 * 1000
      : timeframe === '1Y'
      ? 365 * 24 * 60 * 60 * 1000
      : 5 * 365 * 24 * 60 * 60 * 1000;

  const stepMs = durationMs / pointCount;
  const volatility = basePrice * (timeframe === '1D' ? 0.003 : timeframe === '1W' ? 0.008 : 0.018);

  for (let i = 0; i < pointCount; i++) {
    const progress = i / (pointCount - 1);
    const trendPrice = startPrice + (basePrice - startPrice) * progress;
    const wave = Math.sin(progress * Math.PI * 4 + (hash % 7)) * volatility * 0.8;
    const microNoise = (nextRandom() - 0.49) * volatility;
    
    const price = i === pointCount - 1 ? basePrice : Math.max(basePrice * 0.4, trendPrice + wave + microNoise);
    const pointTimeMs = now - (pointCount - 1 - i) * stepMs;
    const d = new Date(pointTimeMs);

    let timeFormatted = '';
    if (timeframe === '1D') {
      timeFormatted = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (timeframe === '1W' || timeframe === '1M') {
      timeFormatted = d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } else if (timeframe === '3M' || timeframe === '6M' || timeframe === '1Y') {
      timeFormatted = d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    } else {
      timeFormatted = d.toLocaleDateString([], { month: 'short', year: 'numeric' });
    }

    points.push({
      time: timeFormatted,
      price: parseFloat(price.toFixed(basePrice < 10 ? 4 : 2)),
      timestamp: pointTimeMs,
    });
  }

  return points;
}

/**
 * Creates smooth SVG bezier curve path
 */
function createSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;

  let path = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;

    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }

  return path;
}

export const InteractiveMarketChart: React.FC<InteractiveMarketChartProps> = ({
  symbol,
  currentPrice,
  timeframe,
  isPositive,
  onHoverPoint,
  height = 300,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Generate data series
  const data = useMemo(() => {
    return generateTimeframeData(symbol, currentPrice, timeframe, isPositive);
  }, [symbol, currentPrice, timeframe, isPositive]);

  // Width & height scaling constants
  const viewBoxWidth = 800;
  const viewBoxHeight = height;
  const paddingX = 10;
  const paddingY = 24;
  const effectiveWidth = viewBoxWidth - paddingX * 2;
  const effectiveHeight = viewBoxHeight - paddingY * 2;

  const min = useMemo(() => Math.min(...data.map((d) => d.price)), [data]);
  const max = useMemo(() => Math.max(...data.map((d) => d.price)), [data]);
  const range = max - min || 1;

  // Convert points to SVG coordinates
  const coords = useMemo(() => {
    return data.map((point, idx) => {
      const x = paddingX + (idx / (data.length - 1)) * effectiveWidth;
      const y = viewBoxHeight - paddingY - ((point.price - min) / range) * effectiveHeight;
      return { x, y, point, idx };
    });
  }, [data, min, range, effectiveWidth, effectiveHeight, viewBoxHeight]);

  const pathD = useMemo(() => createSmoothPath(coords), [coords]);
  const activeHover = hoverIndex !== null && coords[hoverIndex] ? coords[hoverIndex] : null;

  const isCurrentTrendUp = activeHover
    ? activeHover.point.price >= data[0].price
    : isPositive;

  const strokeColor = isCurrentTrendUp ? '#00875a' : '#f43f5e';
  const gradientId = `interactive-chart-grad-${symbol.replace(/[^a-zA-Z0-9]/g, '')}-${timeframe}`;

  // Area path
  const areaD = `${pathD} L ${effectiveWidth + paddingX},${viewBoxHeight} L ${paddingX},${viewBoxHeight} Z`;

  // Mouse Move / Hover Handler
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const relativeX = Math.max(0, Math.min(1, clientX / rect.width));
      const closestIndex = Math.round(relativeX * (data.length - 1));

      setHoverIndex(closestIndex);
      if (onHoverPoint && data[closestIndex]) {
        onHoverPoint(data[closestIndex]);
      }
    },
    [data, onHoverPoint]
  );

  const handleMouseLeave = useCallback(() => {
    setHoverIndex(null);
    if (onHoverPoint) {
      onHoverPoint(null);
    }
  }, [onHoverPoint]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="w-full relative select-none cursor-crosshair group"
      style={{ height: `${height}px` }}
    >
      {/* Background horizontal guide gridlines */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between py-6 opacity-20">
        <div className="w-full border-b border-dashed border-zinc-400" />
        <div className="w-full border-b border-dashed border-zinc-400" />
        <div className="w-full border-b border-dashed border-zinc-400" />
      </div>

      <svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        className="w-full h-full overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity={0.32} />
            <stop offset="70%" stopColor={strokeColor} stopOpacity={0.05} />
            <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
          </linearGradient>
        </defs>

        {/* Gradient Area Fill */}
        <path d={areaD} fill={`url(#${gradientId})`} />

        {/* Main Spline Curve */}
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Hover Crosshair Vertical Line & Snapped Dot */}
        {activeHover && (
          <g>
            {/* Vertical Hairline Scrubber */}
            <line
              x1={activeHover.x}
              y1={0}
              x2={activeHover.x}
              y2={viewBoxHeight}
              stroke="#71717a"
              strokeWidth="1.2"
              strokeDasharray="4 4"
            />

            {/* Glowing Outer Dot */}
            <circle
              cx={activeHover.x}
              cy={activeHover.y}
              r="6.5"
              fill={strokeColor}
              opacity="0.3"
            />
            {/* Solid Inner Dot */}
            <circle
              cx={activeHover.x}
              cy={activeHover.y}
              r="3.5"
              fill="#ffffff"
              stroke={strokeColor}
              strokeWidth="2"
            />
          </g>
        )}

        {/* If Not Hovering, Show Pulse Dot at Current Latest Point */}
        {!activeHover && coords.length > 0 && (
          <g>
            <circle
              cx={coords[coords.length - 1].x}
              cy={coords[coords.length - 1].y}
              r="5"
              fill={strokeColor}
              opacity="0.3"
              className="animate-ping"
            />
            <circle
              cx={coords[coords.length - 1].x}
              cy={coords[coords.length - 1].y}
              r="3.5"
              fill={strokeColor}
            />
          </g>
        )}
      </svg>

      {/* Floating Hover Tooltip Badge following Cursor */}
      {activeHover && (
        <div
          className="absolute z-20 pointer-events-none -top-2 transform -translate-x-1/2 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 px-2.5 py-1 rounded-md shadow-lg border border-zinc-700 dark:border-zinc-300 text-center animate-in fade-in zoom-in-95 duration-100"
          style={{
            left: `${(activeHover.idx / (data.length - 1)) * 100}%`,
          }}
        >
          <div className="text-[11px] font-bold tabular-nums leading-tight">
            ${activeHover.point.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}
          </div>
          <div className="text-[9px] opacity-80 font-sans leading-none mt-0.5">
            {activeHover.point.time}
          </div>
        </div>
      )}

      {/* Time axis labels at bottom */}
      <div className="absolute bottom-0 inset-x-0 flex items-center justify-between text-[10px] text-zinc-400 font-sans px-1">
        <span>{data[0]?.time}</span>
        <span>{data[Math.floor(data.length / 2)]?.time}</span>
        <span>{data[data.length - 1]?.time}</span>
      </div>
    </div>
  );
};
