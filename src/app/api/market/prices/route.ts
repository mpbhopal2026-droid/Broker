import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PriceData {
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

// In-memory cache for 5 seconds to provide super-fast responses and prevent rate limits
let cachedPrices: Record<string, PriceData> = {};
let lastFetchTime = 0;
const CACHE_TTL_MS = 5000;

const SYMBOLS_MAP: { key: string; ticker: string; spread: number }[] = [
  { key: 'XAU/USD', ticker: 'GC=F', spread: 0.30 },
  { key: 'EUR/USD', ticker: 'EURUSD=X', spread: 0.00012 },
  { key: 'GBP/USD', ticker: 'GBPUSD=X', spread: 0.00015 },
  { key: 'USD/INR', ticker: 'USDINR=X', spread: 0.012 },
  { key: 'USD/JPY', ticker: 'JPY=X', spread: 0.015 },
  { key: 'BTC/USD', ticker: 'BTC-USD', spread: 2.50 },
  { key: 'ETH/USD', ticker: 'ETH-USD', spread: 0.50 },
  { key: 'WTI/USD', ticker: 'CL=F', spread: 0.04 },
];

// Fallback baseline prices in case external network fails
const FALLBACK_PRICES: Record<string, PriceData> = {
  'XAU/USD': { price: 2915.40, prevClose: 2895.00, change: 20.40, changePercent: '+0.70%', high: 2928.00, low: 2890.50, bid: 2915.25, ask: 2915.55, spread: 0.30, timestamp: Date.now() },
  'EUR/USD': { price: 1.0875, prevClose: 1.0858, change: 0.0017, changePercent: '+0.15%', high: 1.0892, low: 1.0845, bid: 1.08744, ask: 1.08756, spread: 0.00012, timestamp: Date.now() },
  'GBP/USD': { price: 1.2940, prevClose: 1.2918, change: 0.0022, changePercent: '+0.17%', high: 1.2965, low: 1.2890, bid: 1.29392, ask: 1.29408, spread: 0.00015, timestamp: Date.now() },
  'USD/INR': { price: 86.85, prevClose: 86.72, change: 0.13, changePercent: '+0.15%', high: 86.95, low: 86.60, bid: 86.844, ask: 86.856, spread: 0.012, timestamp: Date.now() },
  'USD/JPY': { price: 154.20, prevClose: 153.80, change: 0.40, changePercent: '+0.26%', high: 154.60, low: 153.50, bid: 154.192, ask: 154.208, spread: 0.015, timestamp: Date.now() },
  'BTC/USD': { price: 96450.00, prevClose: 94200.00, change: 2250.00, changePercent: '+2.39%', high: 97100.00, low: 93800.00, bid: 96448.75, ask: 96451.25, spread: 2.50, timestamp: Date.now() },
  'ETH/USD': { price: 2740.00, prevClose: 2680.00, change: 60.00, changePercent: '+2.24%', high: 2785.00, low: 2650.00, bid: 2739.75, ask: 2740.25, spread: 0.50, timestamp: Date.now() },
  'WTI/USD': { price: 74.50, prevClose: 73.80, change: 0.70, changePercent: '+0.95%', high: 75.20, low: 73.40, bid: 74.48, ask: 74.52, spread: 0.04, timestamp: Date.now() },
};

async function fetchFromYahoo() {
  const promises = SYMBOLS_MAP.map(async (item) => {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${item.ticker}?interval=1d`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 5 },
      });
      if (!res.ok) return null;
      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta || typeof meta.regularMarketPrice !== 'number') return null;

      const price = meta.regularMarketPrice;
      const prevClose = meta.chartPreviousClose || meta.previousClose || price;
      const change = Number((price - prevClose).toFixed(4));
      const changePercentNum = prevClose ? (change / prevClose) * 100 : 0;
      const changePercent = (changePercentNum >= 0 ? '+' : '') + changePercentNum.toFixed(2) + '%';
      const high = meta.regularMarketDayHigh || price;
      const low = meta.regularMarketDayLow || price;
      const halfSpread = item.spread / 2;

      return {
        key: item.key,
        data: {
          price,
          prevClose,
          change,
          changePercent,
          high,
          low,
          bid: Number((price - halfSpread).toFixed(price > 100 ? 2 : 5)),
          ask: Number((price + halfSpread).toFixed(price > 100 ? 2 : 5)),
          spread: item.spread,
          timestamp: Date.now(),
        },
      };
    } catch {
      return null;
    }
  });

  const results = await Promise.all(promises);
  const updated: Record<string, PriceData> = { ...FALLBACK_PRICES, ...cachedPrices };

  for (const r of results) {
    if (r && r.data) {
      updated[r.key] = r.data;
    }
  }

  return updated;
}

export async function GET() {
  const now = Date.now();
  if (now - lastFetchTime < CACHE_TTL_MS && Object.keys(cachedPrices).length > 0) {
    return NextResponse.json({ success: true, prices: cachedPrices, cached: true });
  }

  try {
    cachedPrices = await fetchFromYahoo();
    lastFetchTime = now;
    return NextResponse.json({ success: true, prices: cachedPrices, cached: false });
  } catch (err) {
    return NextResponse.json({ success: true, prices: FALLBACK_PRICES, fallback: true });
  }
}
