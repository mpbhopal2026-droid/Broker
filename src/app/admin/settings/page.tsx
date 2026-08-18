'use client';

import React, { useState } from 'react';
import { Sliders, Save, Building, QrCode, DollarSign } from 'lucide-react';
import { useAdmin } from '@/lib/admin-store';

export default function AdminSettingsPage() {
  const { paymentSettings, updatePaymentSettings } = useAdmin();

  const [bankName, setBankName] = useState(paymentSettings.bankName);
  const [accountHolder, setAccountHolder] = useState(paymentSettings.accountHolder);
  const [accountNumber, setAccountNumber] = useState(paymentSettings.accountNumber);
  const [ifscCode, setIfscCode] = useState(paymentSettings.ifscCode);
  const [upiId, setUpiId] = useState(paymentSettings.upiId);
  const [qrImageUrl, setQrImageUrl] = useState(paymentSettings.qrImageUrl);
  const [usdToInrRate, setUsdToInrRate] = useState(paymentSettings.usdToInrRate);
  const [commissionPercent, setCommissionPercent] = useState((paymentSettings.commissionPercent ?? 0) || 2.0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updatePaymentSettings({
      bankName,
      accountHolder,
      accountNumber,
      ifscCode,
      upiId,
      qrImageUrl,
      usdToInrRate,
      commissionPercent,
    });
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      
      {/* Header */}
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Broker Bank & Conversion Settings
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure receiving bank accounts, receiving UPI IDs, dynamic QR codes, and USD/INR exchange rates.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 rounded-xl bg-white dark:bg-[#0d121c] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 text-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
          Receiving Domestic Bank Details (INR)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Bank Name</label>
            <input
              type="text"
              required
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Beneficiary Account Name</label>
            <input
              type="text"
              required
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Account Number</label>
            <input
              type="text"
              required
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-slate-900 dark:text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">IFSC Code</label>
            <input
              type="text"
              required
              value={ifscCode}
              onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-slate-900 dark:text-white font-mono uppercase"
            />
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Receiving UPI ID</label>
            <input
              type="text"
              required
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-slate-900 dark:text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">USD to INR Exchange Rate (₹)</label>
            <input
              type="number"
              step="any"
              required
              value={usdToInrRate}
              onChange={(e) => setUsdToInrRate(Number(e.target.value))}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-slate-900 dark:text-white font-mono font-bold"
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Broker Deposit Commission (%)</label>
          <input
            type="number"
            step="0.1"
            required
            value={commissionPercent}
            onChange={(e) => setCommissionPercent(Number(e.target.value))}
            className="w-full sm:w-48 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-slate-900 dark:text-white font-mono"
          />
        </div>

        <div>
          <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">QR Code Image URL</label>
          <input
            type="text"
            required
            value={qrImageUrl}
            onChange={(e) => setQrImageUrl(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-slate-900 dark:text-white font-mono text-[11px]"
          />
        </div>

        <button
          type="submit"
          className="py-2.5 px-5 rounded-lg bg-slate-900 dark:bg-emerald-500 hover:bg-slate-800 text-white dark:text-slate-950 font-bold text-xs shadow-sm flex items-center gap-1.5"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save Broker Settings</span>
        </button>
      </form>

    </div>
  );
}
