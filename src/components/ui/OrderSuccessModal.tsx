'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ArrowUpRight, ArrowDownRight, Layers, X, ShieldCheck, Clock, ExternalLink } from 'lucide-react';
import { TradeOrder } from '@/lib/types';
import { formatUSD, formatINR, formatDate } from '@/lib/utils';

interface OrderSuccessModalProps {
  order: TradeOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({ order, isOpen, onClose }) => {
  const router = useRouter();

  if (!isOpen || !order) return null;

  const isBuy = order.type === 'BUY';
  const effectiveSize = order.margin * order.leverage;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-[#0d121c] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
        
        {/* Top Glow Accent Bar */}
        <div className={`h-1.5 w-full ${isBuy ? 'bg-gradient-to-r from-emerald-500 via-[#00d674] to-teal-400' : 'bg-gradient-to-r from-rose-500 via-[#ff3b57] to-amber-500'}`} />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 space-y-5 text-center">
          
          {/* Animated Success Badge */}
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 border border-slate-700 flex items-center justify-center relative shadow-lg">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isBuy ? 'bg-[#00d674]/15 text-[#00d674]' : 'bg-[#ff3b57]/15 text-[#ff3b57]'}`}>
              {isBuy ? <ArrowUpRight className="w-7 h-7 stroke-[2.5]" /> : <ArrowDownRight className="w-7 h-7 stroke-[2.5]" />}
            </div>
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#00d674] text-slate-950 flex items-center justify-center shadow">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#00d674] bg-[#00d674]/10 px-2.5 py-0.5 rounded-full border border-[#00d674]/20">
              Institutional Order Filled
            </span>
            <h3 className="text-lg sm:text-xl font-black text-white mt-1.5">
              {order.type} {order.symbol}
            </h3>
            <p className="text-xs text-slate-400">
              Executed at <strong className="text-white font-mono">${order.entryPrice.toLocaleString()}</strong> with <strong className="text-[#00d674] font-mono">{order.leverage}x leverage</strong>
            </p>
          </div>

          {/* Ticket Breakdown Card */}
          <div className="rounded-xl bg-[#070b12] border border-slate-800/90 p-4 text-xs space-y-2.5 text-left font-mono">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
              <span className="text-slate-400 font-sans">Ticket Ref ID:</span>
              <span className="text-white font-bold text-[11px]">{order.id}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-sans">Collateral Margin:</span>
              <strong className="text-white font-bold">${order.margin.toFixed(2)} USD</strong>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-sans">Effective Volume:</span>
              <strong className="text-sky-400 font-bold">${effectiveSize.toLocaleString()}.00 USD</strong>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-sans">Standard Lot Size:</span>
              <strong className="text-white font-bold">{order.lotSize} Lots</strong>
            </div>

            {order.takeProfit && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-sans">Take Profit Target:</span>
                <strong className="text-[#00d674] font-bold">${order.takeProfit.toLocaleString()}</strong>
              </div>
            )}

            {order.stopLoss && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-sans">Stop Loss Protection:</span>
                <strong className="text-[#ff3b57] font-bold">${order.stopLoss.toLocaleString()}</strong>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-slate-800/80 text-[11px]">
              <span className="text-slate-400 font-sans">Timestamp:</span>
              <span className="text-slate-300">{formatDate(order.openedAt)}</span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={() => {
                onClose();
                router.push('/dashboard');
              }}
              className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              View in Portfolio
            </button>

            <button
              onClick={onClose}
              className="py-3 px-4 rounded-xl bg-[#00d674] hover:bg-[#00bf67] text-slate-950 font-black text-xs shadow-lg shadow-[#00d674]/20 active:scale-95 transition-all"
            >
              Keep Trading
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
