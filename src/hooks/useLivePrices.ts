'use client';

import { useState, useEffect, useCallback } from 'react';

export interface LivePriceData {
  price: number;
  prevClose: number;
  change: number;
  changePercent: string;
  high: number;
  low: number;
  bid: number;
  ask: number;
  spread: number;
  timestamp: number;
}

const DEFAULT_FALLBACK_PRICES: Record<string, LivePriceData> = {
  'XAU/USD': { price: 2915.40, prevClose: 2895.00, change: 20.40, changePercent: '+0.70%', high: 2928.00, low: 2890.50, bid: 2915.25, ask: 2915.55, spread: 0.30, timestamp: Date.now() },
  'EUR/USD': { price: 1.0875, prevClose: 1.0858, change: 0.0017, changePercent: '+0.15%', high: 1.0892, low: 1.0845, bid: 1.08744, ask: 1.08756, spread: 0.00012, timestamp: Date.now() },
  'GBP/USD': { price: 1.2940, prevClose: 1.2918, change: 0.0022, changePercent: '+0.17%', high: 1.2965, low: 1.2890, bid: 1.29392, ask: 1.29408, spread: 0.00015, timestamp: Date.now() },
  'USD/INR': { price: 86.85, prevClose: 86.72, change: 0.13, changePercent: '+0.15%', high: 86.95, low: 86.60, bid: 86.844, ask: 86.856, spread: 0.012, timestamp: Date.now() },
  'USD/JPY': { price: 154.20, prevClose: 153.80, change: 0.40, changePercent: '+0.26%', high: 154.60, low: 153.50, bid: 154.192, ask: 154.208, spread: 0.015, timestamp: Date.now() },
  'BTC/USD': { price: 96450.00, prevClose: 94200.00, change: 2250.00, changePercent: '+2.39%', high: 97100.00, low: 93800.00, bid: 96448.75, ask: 96451.25, spread: 2.50, timestamp: Date.now() },
  'ETH/USD': { price: 2740.00, prevClose: 2680.00, change: 60.00, changePercent: '+2.24%', high: 2785.00, low: 2650.00, bid: 2739.75, ask: 2740.25, spread: 0.50, timestamp: Date.now() },
  'WTI/USD': { price: 74.50, prevClose: 73.80, change: 0.70, changePercent: '+0.95%', high: 75.20, low: 73.40, bid: 74.48, ask: 74.52, spread: 0.04, timestamp: Date.now() },
};

export function useLivePrices(pollIntervalMs = 4000) {
  const [prices, setPrices] = useState<Record<string, LivePriceData>>(DEFAULT_FALLBACK_PRICES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLivePrices = useCallback(async () => {
    try {
      const res = await fetch('/api/market/prices', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success && data.prices) {
        setPrices((prev) => ({ ...prev, ...data.prices }));
        setError(null);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLivePrices();
    const interval = setInterval(fetchLivePrices, pollIntervalMs);
    return () => clearInterval(interval);
  }, [fetchLivePrices, pollIntervalMs]);

  const getPrice = useCallback(
    (symbol: string, fallback = 0) => {
      return prices[symbol]?.price ?? fallback;
    },
    [prices]
  );

  const getBidAsk = useCallback(
    (symbol: string, defaultSpread = 0.3) => {
      const data = prices[symbol];
      if (data && typeof data.bid === 'number' && typeof data.ask === 'number') {
        return { bid: data.bid, ask: data.ask, spread: data.spread };
      }
      const price = data?.price || 0;
      const half = defaultSpread / 2;
      return {
        bid: Number((price - half).toFixed(price > 100 ? 2 : 5)),
        ask: Number((price + half).toFixed(price > 100 ? 2 : 5)),
        spread: defaultSpread,
      };
    },
    [prices]
  );

  return { prices, loading, error, getPrice, getBidAsk, refetch: fetchLivePrices };
}
