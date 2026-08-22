'use client';

import React, { useState } from 'react';
import { UpiQr } from '@/components/payments/UpiQr';
import { UpiPayButtons } from '@/components/payments/UpiPayButtons';
import { buildUpiLink, buildPaymentReference } from '@/lib/upi';
import {
  Wallet,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  CheckCircle2,
  Clock,
  UploadCloud,
  AlertCircle,
  FileText
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { formatUSD, formatINR, formatDate } from '@/lib/utils';

export default function MonochromeFundsPage() {
  const {
    currentUser,
    paymentSettings,
    transactions,
    ledgerEntries,
    submitDeposit,
    submitWithdrawal,
    showToast,
    isDemo,
    demo,
  } = useApp();

  const initialTab = ((): 'overview' | 'deposit' | 'withdraw' => {
    if (typeof window === 'undefined') return 'overview';
    const t = new URLSearchParams(window.location.search).get('tab');
    return t === 'deposit' || t === 'withdraw' ? t : 'overview';
  })();

  const [activeTab, setActiveTab] = useState<'overview' | 'deposit' | 'withdraw'>(initialTab);
  const [depositMethod, setDepositMethod] = useState<'upi' | 'bank'>('upi');
  const [depositINR, setDepositINR] = useState<number>(10000);
  const [utrNumber, setUtrNumber] = useState('');
  const [proofImage, setProofImage] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState('');
  const [depositLoading, setDepositLoading] = useState(false);

  // Custom client payment config
  const [customPayment, setCustomPayment] = useState<any>(null);

  React.useEffect(() => {
    if (!currentUser?.id) return;
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch('/api/admin/client-payment', { credentials: 'same-origin' });
        const body = await res.json();
        if (!cancelled && res.ok && body?.config) setCustomPayment(body.config);
      } catch {
        // Platform default fallback
      }
    })();

    return () => { cancelled = true; };
  }, [currentUser]);

  // Keep activeTab in sync if the URL query parameter changes
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncTab = () => {
      const t = new URLSearchParams(window.location.search).get('tab');
      if (t === 'deposit' || t === 'withdraw' || t === 'overview') {
        setActiveTab(t);
      }
    };
    syncTab();
    window.addEventListener('popstate', syncTab);
    return () => window.removeEventListener('popstate', syncTab);
  }, []);

  const exchangeRate = paymentSettings.usdToInrRate || 90.0;

  const activeBankName = customPayment?.bankName || paymentSettings.bankName || 'HDFC Bank Ltd';
  const activeAccountHolder = customPayment?.accountHolder || paymentSettings.accountHolder || 'Global Forex Custody';
  const activeAccountNumber = customPayment?.accountNumber || paymentSettings.accountNumber || '50200098234112';
  const activeIfsc = customPayment?.ifscCode || paymentSettings.ifscCode || 'HDFC0001234';
  const activeUpiId = customPayment?.upiId || paymentSettings.upiId || 'globalforex.desk@hdfcbank';
  const activeQrImage = customPayment?.qrImageUrl || paymentSettings.qrImageUrl;

  const upiParams = React.useMemo(
    () =>
      activeUpiId
        ? {
            vpa: activeUpiId,
            payeeName: activeAccountHolder || 'Global Forex',
            amountINR: depositINR > 0 ? depositINR : undefined,
            transactionRef: currentUser?.id ? buildPaymentReference(currentUser.id, Date.now()) : undefined,
          }
        : null,
    [activeUpiId, activeAccountHolder, depositINR, currentUser?.id],
  );

  const upiLink = React.useMemo(() => (upiParams ? buildUpiLink(upiParams) : null), [upiParams]);

  // Withdrawal state
  const [withdrawUSD, setWithdrawUSD] = useState<number>(200);
  const [payoutBankName, setPayoutBankName] = useState(currentUser?.bankName ?? '');
  const [payoutAccNumber, setPayoutAccNumber] = useState(currentUser?.bankAccountNumber ?? '');
  const [payoutIfsc, setPayoutIfsc] = useState(currentUser?.bankIfsc ?? '');
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  const isKycApproved = currentUser?.kycStatus === 'approved';

  // User pending deposits
  const pendingDeposits = transactions.filter(
    (t) => t.userId === currentUser?.id && t.type === 'deposit' && t.status === 'pending'
  );
  const pendingDepositTotalINR = pendingDeposits.reduce((acc, t) => acc + (t.amountINR || 0), 0);

  // User Ledger
  const userLedger = ledgerEntries.filter((l) => l.userId === currentUser?.id);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    showToast({ type: 'info', title: 'Copied', message: `${label} copied to clipboard.` });
    setTimeout(() => setCopiedKey(''), 2000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setProofImage(reader.result as string);
    reader.readAsDataURL(file);

    try {
      const { uploadFile } = await import('@/lib/client-upload');
      const res = await uploadFile(file, 'proof');
      if (res.ok && res.path) {
        setProofImage(res.path);
        showToast({ type: 'success', title: 'Receipt Uploaded', message: 'Proof saved to secure storage.' });
      }
    } catch (err) {
      console.warn('Upload fallback:', err);
    }
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositINR || depositINR <= 0) return;
    if (!utrNumber || utrNumber.trim().length < 4) {
      showToast({ type: 'error', title: 'Invalid UTR', message: 'Please enter a valid payment UTR or reference number.' });
      return;
    }
    if (!proofImage) {
      showToast({
        type: 'error',
        title: 'Payment Screenshot Required',
        message: 'Payment screenshot is mandatory to verify your UTR and credit your deposit.',
      });
      return;
    }

    setDepositLoading(true);
    const res = await submitDeposit(depositINR, depositMethod === 'upi' ? 'UPI QR / Apps' : 'IMPS Bank Transfer', utrNumber, proofImage);
    setDepositLoading(false);

    if (res.success) {
      showToast({
        type: 'success',
        title: 'Deposit Submitted for Review',
        message: res.message || 'Your deposit claim has been submitted. Compliance desk will verify and credit your wallet.',
      });
      setUtrNumber('');
      setProofImage('');
      setActiveTab('overview');
    } else {
      showToast({
        type: 'error',
        title: 'Deposit Submission Failed',
        message: res.error || 'Could not submit deposit. Please check your details and try again.',
      });
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isKycApproved) {
      showToast({ type: 'error', title: 'KYC Required', message: 'Please verify KYC before withdrawing.' });
      return;
    }

    setWithdrawLoading(true);
    const res = await submitWithdrawal(withdrawUSD, {
      bankName: payoutBankName,
      accountNumber: payoutAccNumber,
      ifscCode: payoutIfsc,
      accountHolder: currentUser?.fullName || 'Client',
    });
    setWithdrawLoading(false);

    if (res.success) {
      setActiveTab('overview');
    } else {
      showToast({ type: 'error', title: 'Withdrawal Failed', message: res.error });
    }
  };

  return (
    <div className="space-y-4 max-w-5xl select-none">
      
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-base sm:text-lg font-bold uppercase tracking-tight text-zinc-950 dark:text-white">
            Capital Ledger & Banking Desk
          </h1>
          <p className="text-[11px] text-zinc-500 font-sans mt-0.5">
            Institutional USD-INR deposit gateway and verified domestic payout routing
          </p>
        </div>

        {/* Top Tab Switcher */}
        <div className="grid grid-cols-3 sm:flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'overview'
                ? 'bg-[#00875a] text-white shadow-xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('deposit')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'deposit'
                ? 'bg-[#00875a] text-white shadow-xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
            }`}
          >
            + Deposit
          </button>
          <button
            onClick={() => setActiveTab('withdraw')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'withdraw'
                ? 'bg-[#00875a] text-white shadow-xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
            }`}
          >
            Withdraw
          </button>
        </div>
      </div>

      {/* Top 2 Balance Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        
        {/* Available Balance Card */}
        <div className="p-5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-zinc-400 block">Available Capital</span>
          <div className="text-2xl font-black tabular-nums text-zinc-950 dark:text-white tracking-tight">
            {formatUSD(currentUser?.walletBalance)}
          </div>
          <span className="text-[11px] text-zinc-500 block tabular-nums">
            ≈ {formatINR((currentUser?.walletBalance || 0) * exchangeRate)}
          </span>

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => setActiveTab('deposit')}
              className="px-4 py-2 rounded-lg bg-[#00875a] hover:bg-[#00704a] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Deposit</span>
            </button>
            <button
              onClick={() => setActiveTab('withdraw')}
              className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-[#e6f4ea] hover:text-[#00875a] text-zinc-700 dark:text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Withdraw</span>
            </button>
          </div>
        </div>

        {/* Pending Verification Card */}
        <div className="p-4 rounded-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-zinc-400 block">In Clearing Desk</span>
            <div className="text-2xl font-bold tabular-nums text-zinc-950 dark:text-white mt-0.5">
              {formatINR(pendingDepositTotalINR)}
            </div>
          </div>

          <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span>
              {pendingDeposits.length > 0
                ? `${pendingDeposits.length} submission(s) undergoing verification.`
                : 'No pending deposit verifications.'}
            </span>
          </div>
        </div>

      </div>

      {/* TAB 1: OVERVIEW & LEDGER */}
      {activeTab === 'overview' && (
        <div className="space-y-3">
          <div className="rounded-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="p-3 border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-zinc-950 dark:text-white flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-zinc-400" />
                <span>Financial Ledger & Settlement Statement</span>
              </h2>
            </div>

            {userLedger.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400">
                No ledger transactions recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-zinc-400 text-[10px] uppercase font-bold border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/50">
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">Description</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                      <th className="py-2 px-3 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                    {userLedger.map((item) => (
                      <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                        <td className="py-2 px-3 text-zinc-500 whitespace-nowrap">{formatDate(item.date ?? item.created_at)}</td>
                        <td className="py-2 px-3 font-bold text-zinc-950 dark:text-white">{item.type}</td>
                        <td className="py-2 px-3 text-zinc-700 dark:text-zinc-300 font-sans text-xs">{item.description}</td>
                        <td className="py-2 px-3 text-right font-bold tabular-nums">
                          {item.credit ? (
                            <span className="text-emerald-600 dark:text-emerald-400">+${item.credit.toFixed(2)}</span>
                          ) : item.debit ? (
                            <span className="text-rose-600 dark:text-rose-400">-${item.debit.toFixed(2)}</span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-bold tabular-nums text-zinc-950 dark:text-white">
                          ${(item.balance ?? 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DEPOSIT (INR-Based Deposit Gateway) */}
      {activeTab === 'deposit' && (
        <form onSubmit={handleDepositSubmit} className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-5 shadow-sm">
          <div className="pb-3 border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between">
            <div>
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-950 dark:text-white">
                Add Capital via Instant INR Deposit
              </h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Pay in domestic Indian Rupees (INR). Dealing Desk verifies and credits equivalent USD balance.
              </p>
            </div>
          </div>

          {/* Direct INR Amount Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block">
              Deposit Amount in INR (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-base">₹</span>
              <input
                type="number"
                min="500"
                step="500"
                required
                value={depositINR || ''}
                onChange={(e) => setDepositINR(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder="e.g. 10000"
                className="w-full bg-zinc-50 focus:bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-3 text-base font-bold tabular-nums text-zinc-950 dark:text-white focus:outline-none focus:border-[#00875a] transition-all"
              />
            </div>

            {/* Quick Preset INR Chips */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {[2000, 5000, 10000, 25000, 50000, 100000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setDepositINR(amt)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold tabular-nums transition-all cursor-pointer ${
                    depositINR === amt
                      ? 'bg-[#00875a] text-white shadow-xs'
                      : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:border-slate-300'
                  }`}
                >
                  ₹{amt.toLocaleString('en-IN')}
                </button>
              ))}
            </div>

            <div className="p-2.5 rounded-xl bg-[#e6f4ea] text-[#00875a] border border-[#b7e4c7] text-[11px] font-medium leading-relaxed mt-2 flex items-start gap-2">
              <span className="text-sm shrink-0">ℹ️</span>
              <span>
                Your deposit is made in domestic INR. Upon UTR confirmation by the Dealing Desk, the adjusted USD capital will be deposited directly into your live trading balance.
              </span>
            </div>
          </div>

          {/* Payment Method / Routing Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-zinc-100 dark:border-zinc-900">
            {/* QR Card */}
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center text-center space-y-2.5">
              <UpiQr upiLink={upiLink} size={160} />
              <div className="space-y-0.5">
                <span className="text-[10px] text-zinc-400 block uppercase font-bold">Scan via PhonePe, GPay, Paytm</span>
                <span className="text-sm font-black text-zinc-950 dark:text-white tabular-nums">
                  Pay Exactly ₹{depositINR > 0 ? depositINR.toLocaleString('en-IN') : '0'}
                </span>
              </div>
              <div className="w-full pt-1 sm:hidden">
                <UpiPayButtons params={upiParams} />
              </div>
            </div>

            {/* Bank & UPI VPA Fields */}
            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1">
                <div className="flex justify-between items-center text-[10px] text-zinc-400 uppercase font-bold">
                  <span>UPI VPA Address</span>
                  <button type="button" onClick={() => copyToClipboard(activeUpiId, 'UPI ID')} className="text-[#00875a] font-bold hover:underline cursor-pointer">
                    {copiedKey === 'UPI ID' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <div className="font-bold text-zinc-950 dark:text-white text-xs">{activeUpiId}</div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1">
                <div className="flex justify-between items-center text-[10px] text-zinc-400 uppercase font-bold">
                  <span>Account Number & IFSC</span>
                  <button type="button" onClick={() => copyToClipboard(`${activeAccountNumber} / ${activeIfsc}`, 'Account & IFSC')} className="text-[#00875a] font-bold hover:underline cursor-pointer">
                    {copiedKey === 'Account & IFSC' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <div className="font-bold text-zinc-950 dark:text-white text-xs">{activeAccountNumber} · {activeIfsc}</div>
                <div className="text-[10px] text-zinc-500">{activeAccountHolder} ({activeBankName})</div>
              </div>
            </div>
          </div>

          {/* Proof Submission */}
          <div className="space-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-900">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block">
                Bank Transaction ID / UTR (12 Digits) *
              </label>
              <input
                type="text"
                required
                maxLength={16}
                value={utrNumber}
                onChange={(e) => setUtrNumber(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                placeholder="e.g. 423910592819"
                className="w-full bg-zinc-50 focus:bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm font-bold tabular-nums text-zinc-950 dark:text-white focus:outline-none focus:border-[#00875a] tracking-wider"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase">
                <span className="text-zinc-500">Payment Receipt Screenshot *</span>
                <span className={proofImage ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}>
                  {proofImage ? '✓ Screenshot Attached' : 'Mandatory Requirement'}
                </span>
              </div>
              <input
                type="file"
                accept="image/*,application/pdf"
                required
                onChange={handleFileUpload}
                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#00875a] file:text-white cursor-pointer"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={depositLoading || !utrNumber || !proofImage || depositINR <= 0}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#00875a] text-white hover:bg-[#00704a] disabled:opacity-40 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-98"
          >
            {depositLoading ? 'Dispatching to Clearing Desk…' : `Submit ₹${depositINR > 0 ? depositINR.toLocaleString('en-IN') : '0'} Deposit for Clearance`}
          </button>
        </form>
      )}

      {/* TAB 3: WITHDRAW */}
      {activeTab === 'withdraw' && (
        <form onSubmit={handleWithdrawSubmit} className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-5 shadow-sm">
          <div className="pb-3 border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between">
            <div>
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-950 dark:text-white">
                Withdrawal Settlement (Direct Domestic Bank Payout)
              </h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Funds are disbursed to your verified bank account via IMPS/RTGS within 15–30 minutes.
              </p>
            </div>
          </div>

          {/* Available Capital Reference Banner */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Available Capital for Payout</span>
              <span className="text-base font-black font-mono text-slate-900 dark:text-white">
                {formatUSD(currentUser?.walletBalance || 0)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setWithdrawUSD(currentUser?.walletBalance || 0)}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#00875a] hover:bg-[#e6f4ea] transition-all cursor-pointer"
            >
              Max All
            </button>
          </div>

          {!isKycApproved ? (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs space-y-2 text-center">
              <AlertCircle className="w-5 h-5 text-amber-500 mx-auto" />
              <p className="text-zinc-600 dark:text-zinc-400 font-sans">
                Approved KYC is required prior to withdrawal settlement.
              </p>
              <button
                type="button"
                onClick={() => window.location.href = '/kyc'}
                className="px-4 py-2 rounded-xl bg-[#00875a] text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                Complete KYC Verification →
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block">
                    Withdrawal Amount in USD (Min $20) *
                  </label>
                  <span className="text-[11px] font-bold text-[#00875a] font-mono">
                    ≈ ₹{((withdrawUSD || 0) * exchangeRate).toLocaleString('en-IN')} INR Payout
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-base">$</span>
                  <input
                    type="number"
                    min="20"
                    max={currentUser?.walletBalance || 0}
                    value={withdrawUSD || ''}
                    onChange={(e) => setWithdrawUSD(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 200"
                    className="w-full bg-zinc-50 focus:bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-3 text-base font-bold tabular-nums text-zinc-950 dark:text-white focus:outline-none focus:border-[#00875a] transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-900 text-xs">
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1">
                  <span className="text-[10px] text-zinc-400 block uppercase font-bold">Verified Destination Bank Account</span>
                  <p className="font-bold text-zinc-950 dark:text-white text-xs">{payoutBankName || currentUser?.bankName || 'Verified Domestic Bank'}</p>
                  <p className="text-[11px] text-zinc-500 font-mono">{payoutAccNumber || currentUser?.bankAccountNumber} · {payoutIfsc || currentUser?.bankIfsc}</p>
                </div>
              </div>

              <button
                type="submit"
                disabled={withdrawLoading || !withdrawUSD || withdrawUSD > (currentUser?.walletBalance || 0)}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#00875a] text-white hover:bg-[#00704a] disabled:opacity-40 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-98"
              >
                {withdrawLoading ? 'Processing Request…' : `Request Payout of ₹${((withdrawUSD || 0) * exchangeRate).toLocaleString('en-IN')}`}
              </button>
            </>
          )}
        </form>
      )}

    </div>
  );
}
