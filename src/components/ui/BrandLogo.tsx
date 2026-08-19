'use client';

import React from 'react';
import Image from 'next/image';

interface BrandLogoProps {
  className?: string;
  isCollapsed?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  isAdmin?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  isCollapsed = false,
  size = 'md',
  showTagline = true,
  isAdmin = false,
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const titleSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
  };

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Precision Brand Emblem */}
      <div className={`relative ${iconSizes[size]} shrink-0 flex items-center justify-center`}>
        <svg
          viewBox="0 0 44 44"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-xs"
        >
          {/* Outer Ring & Globe Latitudes */}
          <circle
            cx="22"
            cy="22"
            r="19"
            stroke="currentColor"
            className="text-zinc-900 dark:text-zinc-100"
            strokeWidth="2.2"
            fill="currentColor"
            fillOpacity="0.04"
          />
          <ellipse
            cx="22"
            cy="22"
            rx="9"
            ry="19"
            stroke="currentColor"
            className="text-zinc-400 dark:text-zinc-600"
            strokeWidth="1.4"
          />
          <line
            x1="3"
            y1="22"
            x2="41"
            y2="22"
            stroke="currentColor"
            className="text-zinc-400 dark:text-zinc-600"
            strokeWidth="1.4"
          />
          
          {/* Institutional Emerald Bullish Candlesticks & Trend Trajectory */}
          <rect x="11" y="26" width="2.4" height="7" rx="0.6" fill="#00875a" />
          <rect x="17" y="20" width="2.4" height="13" rx="0.6" fill="#00875a" />
          <rect x="23" y="23" width="2.4" height="10" rx="0.6" fill="#00875a" />
          <rect x="29" y="14" width="2.4" height="19" rx="0.6" fill="#00875a" />
          <path
            d="M12 27L18 21L24 24L34 12"
            stroke="#00875a"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M28 12H34V18"
            stroke="#00875a"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Brand Text Typography */}
      {!isCollapsed && (
        <div className="flex flex-col leading-none text-left">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-black tracking-tight text-zinc-950 dark:text-white font-sans uppercase ${titleSizes[size]}`}
            >
              GLOBAL
            </span>
            {isAdmin && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-sans uppercase bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700">
                Admin
              </span>
            )}
          </div>
          {showTagline && (
            <div className="flex items-center justify-between text-[9px] font-extrabold tracking-[0.26em] text-[#00875a] font-sans mt-0.5">
              <span>—</span>
              <span>FOREX</span>
              <span>—</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
