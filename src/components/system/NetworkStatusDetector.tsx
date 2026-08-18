'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';

export const NetworkStatusDetector: React.FC = () => {
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [showRestored, setShowRestored] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initial check
    setIsOffline(!navigator.onLine);

    const handleOffline = () => {
      setIsOffline(true);
      setShowRestored(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
      setShowRestored(true);
      const timer = setTimeout(() => {
        setShowRestored(false);
      }, 3500);
      return () => clearTimeout(timer);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const handleManualCheck = async () => {
    setIsReconnecting(true);
    try {
      // Ping health check or favicon
      const res = await fetch('/api/health', { cache: 'no-store' });
      if (res.ok) {
        setIsOffline(false);
        setShowRestored(true);
        setTimeout(() => setShowRestored(false), 3500);
      } else {
        setIsOffline(true);
      }
    } catch {
      setIsOffline(true);
    } finally {
      setIsReconnecting(false);
    }
  };

  if (!isOffline && !showRestored) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-md pointer-events-none select-none transition-all duration-300 animate-in fade-in slide-in-from-top-4">
      {isOffline ? (
        <div className="pointer-events-auto bg-rose-950/90 dark:bg-rose-950/95 text-rose-100 border border-rose-800/80 rounded-2xl p-3 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-rose-900/80 text-rose-300 flex items-center justify-center shrink-0">
              <WifiOff className="w-4 h-4 animate-pulse" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold leading-tight truncate">No Internet Connection</p>
              <p className="text-[10px] text-rose-300/80 leading-tight">Live rates & orders paused</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleManualCheck}
            disabled={isReconnecting}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-800 hover:bg-rose-700 text-white text-[11px] font-bold shrink-0 transition-colors active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isReconnecting ? 'animate-spin' : ''}`} />
            <span>{isReconnecting ? 'Checking…' : 'Retry'}</span>
          </button>
        </div>
      ) : showRestored ? (
        <div className="pointer-events-auto bg-emerald-950/90 dark:bg-emerald-950/95 text-emerald-100 border border-emerald-800/80 rounded-2xl p-2.5 shadow-2xl backdrop-blur-md flex items-center justify-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-900/80 text-emerald-300 flex items-center justify-center shrink-0">
            <Wifi className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold">Connection Restored · Live Feed Resumed</span>
        </div>
      ) : null}
    </div>
  );
};
