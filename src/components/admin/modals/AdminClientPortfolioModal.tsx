'use client';

import React, { useState, useEffect } from 'react';
import { UserProfile, TradeOrder } from '@/lib/types';
import { useAdmin } from '@/lib/admin-store';
import { formatUSD, formatDate } from '@/lib/utils';
import { X, Layers, TrendingUp, TrendingDown, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';

interface AdminClientPortfolioModalProps {
  user: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AdminClientPortfolioModal: React.FC<AdminClientPortfolioModalProps> = ({ user, isOpen, onClose }) => {
  const { closeClientTrade, updateClientTrade, showToast } = useAdmin();
  const [trades, setTrades] = useState<TradeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTrade, setEditingTrade] = useState<TradeOrder | null>(null);
  const [editSL, setEditSL] = useState('');
  const [editTP, setEditTP] = useState('');
  const [closingId, setClosingId] = useState('');

  // The "Inject Position" form was REMOVED and must not come back. It let an
  // operator write a position into a client's portfolio with a typed-in entry
  // price and a typed-in profit — the fields shipped pre-filled with a $150.00
  // gain. See the note in /api/admin/trades for what a legitimate dealing-desk
  // record has to look like instead.

  const fetchClientTrades = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/trades?userId=${user.id}`, { credentials: 'same-origin' });
      const data = await res.json();
      if (data?.trades) {
        setTrades(
          data.trades.map((t: any) => ({
            id: t.id,
            userId: t.user_id,
            symbol: t.symbol,
            pairName: t.pair_name,
            type: t.side,
            entryPrice: Number(t.entry_price),
            currentPrice: Number(t.entry_price), // mark price
            lotSize: Number(t.lot_size),
            margin: Number(t.margin),
            leverage: t.leverage,
            stopLoss: t.stop_loss ? Number(t.stop_loss) : undefined,
            takeProfit: t.take_profit ? Number(t.take_profit) : undefined,
            pnl: Number(t.pnl || 0),
            pnlPercentage: 0,
            status: t.status,
            openedAt: t.opened_at,
            closedAt: t.closed_at ?? undefined,
          }))
        );
      }
    } catch {
      showToast({ type: 'error', title: 'Error', message: 'Could not fetch client trades.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && user) {
      void fetchClientTrades();
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const openTrades = trades.filter((t) => t.status === 'OPEN');
  const totalMargin = openTrades.reduce((acc, t) => acc + t.margin, 0);
  const totalPnl = openTrades.reduce((acc, t) => acc + t.pnl, 0);

  const handleClosePosition = async (tradeId: string) => {
    setClosingId(tradeId);
    await closeClientTrade(tradeId, user.id);
    setClosingId('');
    void fetchClientTrades();
  };

  const handleSaveTradeParams = async (tradeId: string) => {
    await updateClientTrade(tradeId, {
      stopLoss: editSL ? parseFloat(editSL) : undefined,
      takeProfit: editTP ? parseFloat(editTP) : undefined,
    });
    setEditingTrade(null);
    void fetchClientTrades();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-4xl my-auto max-h-[94vh] bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-2">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200 dark:border-purple-800 font-bold shrink-0">
              <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                  Portfolio: {user.fullName}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] sm:text-[11px] font-mono truncate">
                  {user.email}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                Active positions and trade parameters
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={fetchClientTrades}
              className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Refresh Portfolio"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Portfolio Stats Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800">
          <div className="p-3 rounded-xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Wallet Balance</div>
            <div className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
              {formatUSD(user.walletBalance)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Open Margin</div>
            <div className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
              {formatUSD(totalMargin)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Floating P&L</div>
            <div className={`text-lg font-extrabold mt-0.5 ${totalPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {totalPnl >= 0 ? '+' : ''}{formatUSD(totalPnl)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Positions</div>
            <div className="text-lg font-extrabold text-purple-600 dark:text-purple-400 mt-0.5">
              {openTrades.length}
            </div>
          </div>
        </div>

        {/* Positions Table */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Active Open Positions ({openTrades.length})
          </h4>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading client positions…</div>
          ) : openTrades.length === 0 ? (
            <div className="py-12 text-center space-y-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              <ShieldCheck className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No active open positions for this client.
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Instrument</th>
                    <th className="py-3 px-4">Side / Size</th>
                    <th className="py-3 px-4">Entry Price</th>
                    <th className="py-3 px-4">Margin / Lev</th>
                    <th className="py-3 px-4">TP / SL</th>
                    <th className="py-3 px-4">Floating P&L</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-[#0f172a]">
                  {openTrades.map((trade) => (
                    <tr key={trade.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {trade.symbol}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          trade.type === 'BUY'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                        }`}>
                          {trade.type} {trade.lotSize} LOT
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                        {trade.entryPrice.toFixed(4)}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {formatUSD(trade.margin)} <span className="text-[10px]">({trade.leverage}x)</span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        TP: {trade.takeProfit ? trade.takeProfit.toFixed(2) : '—'} <br />
                        SL: {trade.stopLoss ? trade.stopLoss.toFixed(2) : '—'}
                      </td>
                      <td className={`py-3 px-4 font-bold ${
                        trade.pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {trade.pnl >= 0 ? '+' : ''}{formatUSD(trade.pnl)}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => {
                            setEditingTrade(trade);
                            setEditSL(trade.stopLoss?.toString() || '');
                            setEditTP(trade.takeProfit?.toString() || '');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-[11px] transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleClosePosition(trade.id)}
                          disabled={closingId === trade.id}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] transition-colors shadow-xs"
                        >
                          {closingId === trade.id ? 'Closing…' : 'Close'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Edit Trade Parameters Drawer/Modal */}
        {editingTrade && (
          <div className="p-5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
            <div className="text-xs">
              <span className="font-bold text-slate-900 dark:text-white">Adjust {editingTrade.symbol}:</span>
              <span className="text-slate-400 ml-1">Modify Take-Profit or Stop-Loss levels.</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                placeholder="Take Profit"
                value={editTP}
                onChange={(e) => setEditTP(e.target.value)}
                className="w-28 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0f172a] text-xs"
              />
              <input
                type="number"
                placeholder="Stop Loss"
                value={editSL}
                onChange={(e) => setEditSL(e.target.value)}
                className="w-28 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0f172a] text-xs"
              />
              <button
                onClick={() => handleSaveTradeParams(editingTrade.id)}
                className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-xs"
              >
                Save
              </button>
              <button
                onClick={() => setEditingTrade(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

