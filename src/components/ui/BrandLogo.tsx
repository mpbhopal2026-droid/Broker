'use client';

import React from 'react';

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
    lg: 'w-9 h-9',
  };

  const titleSizes = {
    sm: 'text-base font-black',
    md: 'text-lg font-black',
    lg: 'text-xl font-black',
  };

  const taglineSizes = {
    sm: 'text-[8.5px]',
    md: 'text-[9.5px]',
    lg: 'text-[11px]',
  };

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Precision Globe with Upward Green Growth Bars & Trend Arrow */}
      <div className={`relative ${iconSizes[size]} shrink-0 flex items-center justify-center`}>
        <svg
          viewBox="0 0 44 44"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-xs"
        >
          {/* Blue Globe Circle Background & Grid */}
          <circle cx="22" cy="22" r="18" stroke="#1d4ed8" strokeWidth="2.2" fill="#eff6ff" className="dark:fill-blue-950/40 dark:stroke-blue-500" />
          <ellipse cx="22" cy="22" rx="9" ry="18" stroke="#3b82f6" strokeWidth="1.5" className="dark:stroke-blue-400" />
          <line x1="4" y1="22" x2="40" y2="22" stroke="#3b82f6" strokeWidth="1.5" className="dark:stroke-blue-400" />
          <line x1="7" y1="13" x2="37" y2="13" stroke="#93c5fd" strokeWidth="1.1" className="dark:stroke-blue-700" />
          <line x1="7" y1="31" x2="37" y2="31" stroke="#93c5fd" strokeWidth="1.1" className="dark:stroke-blue-700" />

          {/* Ascending Green Growth Candlesticks & Arrow */}
          <rect x="11" y="27" width="2.4" height="6" rx="0.5" fill="#00875a" />
          <rect x="17" y="21" width="2.4" height="12" rx="0.5" fill="#00875a" />
          <rect x="23" y="24" width="2.4" height="9" rx="0.5" fill="#00875a" />
          <rect x="29" y="15" width="2.4" height="18" rx="0.5" fill="#00875a" />
          <path
            d="M12 28L18 22L24 25L34 13"
            stroke="#00875a"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M28 13H34V19"
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
              className={`tracking-tight text-[#0f2942] dark:text-white font-sans ${titleSizes[size]}`}
            >
              GLOBAL
            </span>
            {isAdmin && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-sans uppercase bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800">
                Admin
              </span>
            )}
          </div>
          {showTagline && (
            <div
              className={`flex items-center justify-between font-black tracking-[0.28em] text-[#00875a] font-sans mt-0.5 ${taglineSizes[size]}`}
            >
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
