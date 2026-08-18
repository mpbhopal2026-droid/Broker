'use client';

import React from 'react';
import { CheckCircle2, ArrowRight, X, ShieldCheck, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { TradeOrder } from '@/lib/types';
import { formatUSD } from '@/lib/utils';

interface OrderSuccessReactionModalProps {
  order: TradeOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

export const OrderSuccessReactionModal: React.FC<OrderSuccessReactionModalProps> = ({
  order,
  isOpen,
  onClose,
}) => {
  const router = useRouter();

  if (!isOpen || !order) return null;

  const isBuy = order.type === 'BUY';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-in select-none">
        
        {/* Top Celebration Bar */}
        <div className="p-6 text-center space-y-3 border-b border-slate-100 bg-linear-to-b from-emerald-50/50 to-white">
          <div className="w-14 h-14 rounded-full bg-emerald-100/80 text-emerald-600 flex items-center justify-center mx-auto shadow-inner ring-8 ring-emerald-50">
            <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
          </div>
          
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Order Executed Successfully</h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">Ref ID: {order.id.slice(0, 10).toUpperCase()}</p>
          </div>
        </div>

        {/* Order Details Grid */}
        <div className="p-5 space-y-3.5 text-xs">
          
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Instrument</span>
              <span className="text-sm font-black font-mono text-slate-900">{order.symbol}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Side</span>
              <span className={`text-sm font-black font-mono ${isBuy ? 'text-emerald-600' : 'text-rose-600'}`}>
                {order.type} {isBuy ? '(LONG)' : '(SHORT)'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Execution Price</span>
              <span className="text-sm font-bold font-mono text-slate-900">${order.entryPrice.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Position Size</span>
              <span className="text-sm font-bold font-mono text-slate-900">{order.lotSize} LOT</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Margin Allocated</span>
              <span className="text-sm font-bold font-mono text-slate-900">{formatUSD(order.margin)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Leverage</span>
              <span className="text-sm font-bold font-mono text-slate-900">{order.leverage}x</span>
            </div>
          </div>

          {/* Quick Notice */}
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 text-slate-600 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-[#4f46e5] shrink-0" />
            <span>Position is active and streaming real-time P&L to your ledger.</span>
          </div>

          {/* Action CTAs */}
          <div className="space-y-2 pt-2">
            <button
              onClick={() => {
                onClose();
                router.push('/portfolio');
              }}
              className="w-full py-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <span>View in Portfolio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onClose}
              className="w-full py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
            >
              Done / Keep Trading
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
