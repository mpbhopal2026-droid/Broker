'use client';

import React, { useState } from 'react';
import { FileText, Search, Download, Filter } from 'lucide-react';
import { useAdmin } from '@/lib/admin-store';
import { formatUSD, formatDate } from '@/lib/utils';

export default function AdminLedgerPage() {
  const { ledgerEntries, users, showToast } = useAdmin();
  const [filterUser, setFilterUser] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  const filteredEntries = ledgerEntries.filter((item) => {
    const matchUser = filterUser === 'all' || item.userId === filterUser;
    const matchType = filterType === 'all' || item.type === filterType;
    return matchUser && matchType;
  });

  const handleExportCsv = () => {
    const headers = ['Date,Client,Type,Description,Credit_USD,Debit_USD,Running_Balance_USD,Reference_ID'];
    const rows = filteredEntries.map((e) =>
      `"${e.date}","${e.userFullName}","${e.type}","${e.description}",${e.credit || 0},${e.debit || 0},${e.balance},"${e.referenceId || ''}"`
    );
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Global Forex_Ledger_Audit_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast({ type: 'success', title: 'Ledger Exported', message: 'Downloaded double-entry audit CSV.' });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Double-Entry Financial Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Auditable, immutable ledger trail of all deposits, withdrawals, trade realized P&L, fees, and manual adjustments.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="px-3.5 py-2 rounded-lg bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Ledger (.CSV)</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-semibold">Filter by Client:</span>
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="bg-white dark:bg-[#0d121c] border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
          >
            <option value="all">All Clients</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.fullName}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-semibold">Type:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-white dark:bg-[#0d121c] border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="Deposit">Deposit</option>
            <option value="Withdrawal">Withdrawal</option>
            <option value="Trade P&L">Trade P&L</option>
            <option value="Adjustment">Adjustment</option>
          </select>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="rounded-xl bg-white dark:bg-[#0d121c] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {filteredEntries.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No ledger records found matching filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 dark:bg-[#080d14] text-slate-500 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase font-sans">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Credit (+)</th>
                  <th className="py-3 px-4">Debit (-)</th>
                  <th className="py-3 px-4 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredEntries.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 text-slate-400 text-[11px]">{formatDate(item.date ?? item.created_at)}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white font-sans">{item.userFullName}</td>
                    <td className="py-3 px-4 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.type === 'Deposit'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-[#00d674]'
                          : item.type === 'Withdrawal'
                          ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400'
                          : item.type === 'Trade P&L'
                          ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}>
                        {item.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-sans">{item.description}</td>
                    <td className="py-3 px-4 font-bold text-emerald-600 dark:text-[#00d674]">
                      {item.credit ? `+$${item.credit.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-3 px-4 font-bold text-rose-600 dark:text-[#ff3b57]">
                      {item.debit ? `-$${item.debit.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white text-right">
                      ${(item.balance ?? 0).toFixed(2)} USD
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
