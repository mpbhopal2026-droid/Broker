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
  isAdmin = false,
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-8 h-8',
    lg: 'w-9 h-9',
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Precision Stylized G Emblem */}
      <div className={`relative ${iconSizes[size]} shrink-0 flex items-center justify-center`}>
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Green G Ring */}
          <path
            d="M20 5C11.7157 5 5 11.7157 5 20C5 28.2843 11.7157 35 20 35C27.5 35 33.7 29.5 34.8 22.5H20V17.5H39.8C39.9 18.3 40 19.1 40 20C40 31.0457 31.0457 40 20 40C8.9543 40 0 31.0457 0 20C0 8.9543 8.9543 0 20 0C26.5 0 32.2 3.1 35.8 7.9L31.8 11.9C29.1 8.2 24.8 5 20 5Z"
            fill="url(#gf-gradient)"
          />
          {/* Inner Mint Accent Dot / Tick */}
          <rect x="22" y="17.5" width="13" height="5" rx="1" fill="#00d674" />
          <defs>
            <linearGradient id="gf-gradient" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
              <stop stopColor="#00875a" />
              <stop offset="1" stopColor="#064e3b" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Brand Text */}
      {!isCollapsed && (
        <div className="flex items-center gap-1.5 leading-none">
          <span
            className={`font-extrabold tracking-tight text-zinc-950 dark:text-white uppercase font-sans ${textSizes[size]}`}
          >
            GLOBAL FOREX
          </span>
          {isAdmin && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-sans uppercase bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800">
              Admin
            </span>
          )}
        </div>
      )}
    </div>
  );
};
