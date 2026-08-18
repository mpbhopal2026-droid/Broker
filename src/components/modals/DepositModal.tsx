'use client';

import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Upload,
  QrCode,
  Building2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { formatUSD, formatINR } from '@/lib/utils';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DepositModal: React.FC<DepositModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, paymentSettings, submitDeposit, showToast } = useApp();

  const [inrAmount, setInrAmount] = useState('50000');
  const [utrNumber, setUtrNumber] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const numInr = parseFloat(inrAmount) || 0;
  const rate = paymentSettings.usdToInrRate || 84.5;
  const commPercent = (paymentSettings.commissionPercent ?? 0) || 2.0;
  const grossUsd = numInr > 0 ? numInr / rate : 0;
  const commUsd = grossUsd * (commPercent / 100);
  const netUsd = Math.max(0, grossUsd - commUsd);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    showToast({ type: 'info', title: 'Copied', message: `Copied ${field} to clipboard.` });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrNumber || utrNumber.length < 6) {
      showToast({ type: 'error', title: 'Invalid UTR', message: 'Please enter a valid 12-digit UTR number.' });
      return;
    }
    if (numInr < 1000) {
      showToast({ type: 'error', title: 'Amount Too Low', message: 'Minimum deposit is ₹1,000 INR.' });
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      submitDeposit(
        numInr,
        utrNumber,
        receiptFile || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400'
      );
      setIsLoading(false);
      setIsSubmitted(true);
      showToast({ type: 'success', title: 'Deposit Submitted', message: 'Verification pending by admin.' });
    }, 1200);
  };

  const handleResetAndClose = () => {
    setIsSubmitted(false);
    setUtrNumber('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-in">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Add Funds (INR Transfer)</h3>
            <p className="text-xs text-slate-500">Instant transfer via IMPS, NEFT or UPI</p>
          </div>
          <button
            onClick={handleResetAndClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isSubmitted ? (
          /* Confirmation View */
          <div className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-lg">Deposit Submitted</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Your deposit of <strong className="text-slate-900">{formatINR(numInr)}</strong> (UTR: {utrNumber}) has been queued for admin verification.
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl text-xs font-mono text-slate-700 max-w-xs mx-auto border border-slate-200">
              Expected USD Credit: <strong className="text-emerald-600 font-bold">{formatUSD(netUsd)}</strong>
            </div>
            <button
              onClick={handleResetAndClose}
              className="w-full py-2.5 rounded-lg bg-slate-950 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
            >
              Done & Return
            </button>
          </div>
        ) : (
          /* Form View */
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 max-h-[80vh] overflow-y-auto">
            
            {/* Broker Bank Details Box */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5 text-xs">
              <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-wider">
                1. Transfer to Official Broker Account
              </span>
              
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div>
                  <span className="text-[10px] text-slate-400 block">Bank Name</span>
                  <span className="font-bold text-slate-800 font-mono">{paymentSettings.bankName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Account Holder</span>
                  <span className="font-bold text-slate-800">{paymentSettings.accountHolder}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Account Number</span>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-slate-900 font-mono">{paymentSettings.accountNumber}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(paymentSettings.accountNumber, 'Account Number')}
                      className="text-slate-400 hover:text-slate-700"
                    >
                      {copiedField === 'Account Number' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">IFSC Code</span>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-slate-900 font-mono">{paymentSettings.ifscCode}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(paymentSettings.ifscCode, 'IFSC Code')}
                      className="text-slate-400 hover:text-slate-700"
                    >
                      {copiedField === 'IFSC Code' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block">Official UPI ID</span>
                  <span className="font-bold text-slate-900 font-mono">{paymentSettings.upiId}</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(paymentSettings.upiId, 'UPI ID')}
                  className="px-2 py-1 rounded bg-white border border-slate-200 text-[10px] font-bold text-slate-700 hover:bg-slate-100"
                >
                  {copiedField === 'UPI ID' ? 'Copied' : 'Copy UPI'}
                </button>
              </div>
            </div>

            {/* Input Form Fields */}
            <div className="space-y-3">
              <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-wider">
                2. Enter Transfer Details
              </span>

              {/* Amount in INR */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Transferred Amount (INR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    value={inrAmount}
                    onChange={(e) => setInrAmount(e.target.value)}
                    placeholder="50000"
                    min="1000"
                    required
                    className="w-full bg-white border border-slate-200 rounded-lg pl-7 pr-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              {/* UTR Number */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  12-Digit UTR / Transaction Ref ID *
                </label>
                <input
                  type="text"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  placeholder="e.g. 438102948190"
                  required
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-400"
                />
              </div>

              {/* Screenshot Upload Simulator */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Payment Screenshot (Optional)
                </label>
                <div className="border border-dashed border-slate-300 rounded-lg p-3 text-center bg-slate-50/50 hover:bg-slate-50 cursor-pointer">
                  <Upload className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                  <span className="text-[11px] text-slate-600 block">Click to upload transfer receipt</span>
                  <span className="text-[9px] text-slate-400 font-mono">PNG, JPG, PDF up to 5MB</span>
                </div>
              </div>

              {/* Conversion Calculator Box */}
              <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200/80 text-xs space-y-1">
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>Exchange Rate:</span>
                  <span className="font-mono">₹{rate.toFixed(2)} / USD</span>
                </div>
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>Gross USD:</span>
                  <span className="font-mono">${grossUsd.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>Fee ({commPercent}%):</span>
                  <span className="font-mono text-rose-600">-${commUsd.toFixed(2)}</span>
                </div>
                <div className="pt-1 border-t border-emerald-200/80 flex justify-between font-bold text-slate-900">
                  <span>Net USD Margin to Credit:</span>
                  <span className="font-mono text-emerald-700 text-sm">+{formatUSD(netUsd)}</span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-lg bg-slate-950 text-white text-xs font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Deposit...</span>
                </>
              ) : (
                <>
                  <span>Submit Deposit for Verification</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

          </form>
        )}

      </div>
    </div>
  );
};
