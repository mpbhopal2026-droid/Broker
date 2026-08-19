'use client';

import React from 'react';

interface MiniSparklineProps {
  data?: number[];
  symbol?: string;
  price?: number;
  changePercent?: number;
  isPositive: boolean;
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Deterministic pseudo-random generator to produce realistic, smooth market price action curves.
 */
function generateRealisticTrend(
  symbol = 'ASSET',
  basePrice = 100,
  changePercent = 0.5,
  count = 20
): number[] {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = (hash << 5) - hash + symbol.charCodeAt(i);
    hash |= 0;
  }

  const isUp = changePercent >= 0;
  const startPrice = basePrice * (1 - changePercent / 100);
  const points: number[] = [];

  // Seeded random helper
  let seed = Math.abs(hash) || 12345;
  const nextRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  let current = startPrice;
  const deltaPerStep = (basePrice - startPrice) / count;
  const volatility = Math.max(Math.abs(basePrice - startPrice) * 0.45, basePrice * 0.0035);

  points.push(startPrice);

  for (let i = 1; i < count - 1; i++) {
    const trendPull = startPrice + deltaPerStep * i;
    const noise = (nextRandom() - 0.48) * volatility;
    
    // Add periodic market micro-swings
    const swing = Math.sin((i / count) * Math.PI * 3 + (hash % 5)) * (volatility * 0.6);
    current = trendPull + noise + swing;
    points.push(current);
  }

  points.push(basePrice);
  return points;
}

/**
 * Creates smooth SVG bezier curve path from a list of coordinates
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

export const MiniSparkline: React.FC<MiniSparklineProps> = ({
  data,
  symbol = 'ASSET',
  price = 100,
  changePercent = 0.5,
  isPositive,
  width = 120,
  height = 36,
  className = '',
}) => {
  // Use provided multi-point data if 8+ points, otherwise generate rich organic curve
  const pointsData = React.useMemo(() => {
    if (data && data.length >= 8) {
      return data;
    }
    return generateRealisticTrend(symbol, price, isPositive ? Math.abs(changePercent || 0.5) : -Math.abs(changePercent || 0.5));
  }, [data, symbol, price, changePercent, isPositive]);

  if (!pointsData || pointsData.length < 2) return null;

  const min = Math.min(...pointsData);
  const max = Math.max(...pointsData);
  const range = max - min || 1;
  const paddingX = 2;
  const paddingY = 4;
  const effectiveHeight = height - paddingY * 2;
  const effectiveWidth = width - paddingX * 2;

  const coords = pointsData.map((val, idx) => {
    const x = paddingX + (idx / (pointsData.length - 1)) * effectiveWidth;
    const y = height - paddingY - ((val - min) / range) * effectiveHeight;
    return { x, y };
  });

  const pathD = createSmoothPath(coords);
  const strokeColor = isPositive ? '#10b981' : '#f43f5e';
  const lastPoint = coords[coords.length - 1];
  const uniqueId = `spark-${symbol.replace(/[^a-zA-Z0-9]/g, '')}-${isPositive ? 'up' : 'down'}`;

  // Area under curve
  const areaD = `${pathD} L ${effectiveWidth + paddingX},${height} L ${paddingX},${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={`w-full h-full overflow-visible select-none ${className}`}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={`${uniqueId}-grad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity={0.28} />
          <stop offset="85%" stopColor={strokeColor} stopOpacity={0.02} />
          <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
        </linearGradient>
      </defs>

      {/* Area Under Curve Fill */}
      <path d={areaD} fill={`url(#${uniqueId}-grad)`} />

      {/* Smooth Line Curve */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Real-Time Price Action Pulse Dot at the End */}
      <circle
        cx={lastPoint.x}
        cy={lastPoint.y}
        r="2.2"
        fill={strokeColor}
      />
      <circle
        cx={lastPoint.x}
        cy={lastPoint.y}
        r="4.5"
        fill={strokeColor}
        opacity="0.3"
      />
    </svg>
  );
};
