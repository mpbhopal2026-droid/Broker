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

export default function FundsPage() {
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
    demoDeposit,
    demoWithdraw,
    resetDemoAccount,
  } = useApp();

  // Honour ?tab= so "Add funds" from the KYC approval screen opens the deposit
  // form directly rather than dropping the client on an empty Overview.
  const initialTab = ((): 'overview' | 'deposit' | 'withdraw' => {
    if (typeof window === 'undefined') return 'overview';
    const t = new URLSearchParams(window.location.search).get('tab');
    return t === 'deposit' || t === 'withdraw' ? t : 'overview';
  })();

  const [activeTab, setActiveTab] = useState<'overview' | 'deposit' | 'withdraw'>(initialTab);
  const [depositMethod, setDepositMethod] = useState<'upi' | 'bank'>('upi');
  const [depositINR, setDepositINR] = useState<number>(50000);
  const [utrNumber, setUtrNumber] = useState('');
  const [proofImage, setProofImage] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState('');
  const [depositLoading, setDepositLoading] = useState(false);

  // Custom client payment config
  const [customPayment, setCustomPayment] = useState<any>(null);

  // Read routing from the server, never from localStorage.
  React.useEffect(() => {
    if (!currentUser?.id) return;
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch('/api/admin/client-payment', { credentials: 'same-origin' });
        const body = await res.json();
        if (!cancelled && res.ok && body?.config) setCustomPayment(body.config);
      } catch {
        // Leave customPayment null so the platform default is used.
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

  // Active payment details: this client's routing if an operator set one,
  // otherwise the platform default from admin payment settings.
  const activeBankName = customPayment?.bankName || paymentSettings.bankName || 'HDFC Bank Ltd';
  const activeAccountHolder = customPayment?.accountHolder || paymentSettings.accountHolder || 'Global Forex Pvt Ltd';
  const activeAccountNumber = customPayment?.accountNumber || paymentSettings.accountNumber || '50200098234112';
  const activeIfsc = customPayment?.ifscCode || paymentSettings.ifscCode || 'HDFC0001234';
  const activeUpiId = customPayment?.upiId || paymentSettings.upiId || 'globalforex.desk@hdfcbank';
  const activeQrImage = customPayment?.qrImageUrl || paymentSettings.qrImageUrl;

  // The QR encodes exactly the UPI ID and amount displayed beside it
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

    // Instant local preview
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
      console.warn('Upload fallback to data URL:', err);
    }
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositINR || depositINR <= 0) return;
    if (!utrNumber || utrNumber.length < 8) {
      showToast({ type: 'error', title: 'Invalid UTR', message: 'Please enter a valid 12-digit UTR.' });
      return;
    }

    setDepositLoading(true);
    await submitDeposit(depositINR, depositMethod === 'upi' ? 'UPI QR / Apps' : 'IMPS Bank Transfer', utrNumber, proofImage);
    setDepositLoading(false);
    setUtrNumber('');
    setProofImage('');
    setActiveTab('overview');
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
    <div className="space-y-5 max-w-5xl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Funds & Ledger
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manual ledger banking desk: Add funds in INR or request domestic bank payout settlements.
          </p>
        </div>

        {/* Top Tab Switcher */}
        <div className="grid grid-cols-3 sm:flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
              activeTab === 'overview'
                ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('deposit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
              activeTab === 'deposit'
                ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            + Add Funds
          </button>
          <button
            onClick={() => setActiveTab('withdraw')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
              activeTab === 'withdraw'
                ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Withdraw
          </button>
        </div>
      </div>

      {/* Top 2 Balance Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* Available Balance */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2.5">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Available Trading Balance</span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {formatUSD(currentUser?.walletBalance)}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 block">
            ≈ {formatINR((currentUser?.walletBalance || 0) * (paymentSettings.usdToInrRate || 85.0))}
          </span>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => setActiveTab('deposit')}
              className="px-3.5 py-1.5 rounded-xl bg-slate-950 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition-colors active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Funds</span>
            </button>
            <button
              onClick={() => setActiveTab('withdraw')}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs transition-colors active:scale-95"
            >
              Withdraw
            </button>
          </div>
        </div>

        {/* Pending Verification Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2 flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Pending Deposit Verification</span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
              {formatINR(pendingDepositTotalINR)}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
            <span>
              {pendingDeposits.length > 0
                ? `${pendingDeposits.length} deposit submission(s) undergoing verification.`
                : 'No pending deposit verifications.'}
            </span>
          </div>
        </div>

      </div>

      {/* TAB 1: OVERVIEW & LEDGER */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
            <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span>Financial Ledger & Transaction History</span>
              </h2>
            </div>

            {userLedger.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-400 dark:text-slate-500">
                No ledger transactions recorded yet.
              </div>
            ) : (
              <>
                {/* Mobile View (sm:hidden) */}
                <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800 p-2 space-y-2">
                  {userLedger.map((item) => (
                    <div key={item.id} className="p-3 bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.type === 'Deposit'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : item.type === 'Withdrawal'
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}>
                          {item.type}
                        </span>
                        <div className="font-bold text-xs">
                          {item.credit ? (
                            <span className="text-emerald-600 dark:text-emerald-400">+${item.credit.toFixed(2)}</span>
                          ) : item.debit ? (
                            <span className="text-rose-600 dark:text-rose-400">-${item.debit.toFixed(2)}</span>
                          ) : (
                            '—'
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">{item.description}</p>
                      <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                        <span>{formatDate(item.date ?? item.created_at)}</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">Bal: ${(item.balance ?? 0).toFixed(2)} USD</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop View (hidden sm:block) */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase font-sans">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Date</th>
                        <th className="py-3 px-4 font-semibold">Type</th>
                        <th className="py-3 px-4 font-semibold">Description</th>
                        <th className="py-3 px-4 font-semibold">Credit</th>
                        <th className="py-3 px-4 font-semibold">Debit</th>
                        <th className="py-3 px-4 font-semibold text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {userLedger.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-xs">{formatDate(item.date ?? item.created_at)}</td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.type === 'Deposit'
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                : item.type === 'Withdrawal'
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}>
                              {item.type}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-800 dark:text-slate-200 font-medium">{item.description}</td>
                          <td className="py-3.5 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                            {item.credit ? `+$${item.credit.toFixed(2)}` : '—'}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-rose-600 dark:text-rose-400">
                            {item.debit ? `-$${item.debit.toFixed(2)}` : '—'}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white text-right">
                            ${(item.balance ?? 0).toFixed(2)} USD
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ADD FUNDS (MANUAL LEDGER INR -> USD) */}
      {activeTab === 'deposit' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-start">
          
          {/* Step 1: Payment Details */}
          <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                1. Transfer Funds (INR)
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold font-mono">
                1 USD = ₹{paymentSettings.usdToInrRate || 85.0}
              </span>
            </div>

            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDepositMethod('upi')}
                className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                  depositMethod === 'upi'
                    ? 'bg-slate-950 dark:bg-emerald-600 text-white border-slate-950 dark:border-emerald-600 shadow-2xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                UPI QR Code
              </button>
              <button
                type="button"
                onClick={() => setDepositMethod('bank')}
                className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                  depositMethod === 'bank'
                    ? 'bg-slate-950 dark:bg-emerald-600 text-white border-slate-950 dark:border-emerald-600 shadow-2xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                Bank Transfer (IMPS/NEFT)
              </button>
            </div>

            {depositMethod === 'upi' ? (
              <div className="space-y-3">
                {/* Mobile Pay buttons */}
                <div className="sm:hidden">
                  <UpiPayButtons params={upiParams} />
                </div>

                {/* Custom Admin QR or Generated UPI QR */}
                <div className="w-44 h-44 bg-white p-2 rounded-xl mx-auto border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-2xs overflow-hidden">
                  {activeQrImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={activeQrImage} alt="Payment QR" className="w-full h-full object-contain" />
                  ) : (
                    <UpiQr upiLink={upiLink} size={156} />
                  )}
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-medium">Receiving UPI ID:</span>
                    <strong className="text-slate-900 dark:text-white font-mono">{activeUpiId}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(activeUpiId, 'UPI ID')}
                    className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95"
                  >
                    {copiedKey === 'UPI ID' ? 'Copied ✓' : 'Copy'}
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-medium">Beneficiary Name:</span>
                    <strong className="text-slate-900 dark:text-white">{activeAccountHolder}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-medium">Bank Name:</span>
                    <strong className="text-slate-900 dark:text-white">{activeBankName}</strong>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-medium">Beneficiary Name:</span>
                    <strong className="text-slate-900 dark:text-white">{activeAccountHolder}</strong>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-medium">Account Number:</span>
                    <strong className="text-slate-900 dark:text-white font-mono">{activeAccountNumber}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(activeAccountNumber, 'Account Number')}
                    className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95"
                  >
                    Copy
                  </button>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-medium">IFSC Code:</span>
                    <strong className="text-slate-900 dark:text-white font-mono uppercase">{activeIfsc}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(activeIfsc, 'IFSC Code')}
                    className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Transfer in INR using GPay, PhonePe, Paytm, BHIM, or Net Banking IMPS/NEFT.
            </div>
          </div>

          {/* Step 2: Submit UTR Form */}
          <form onSubmit={handleDepositSubmit} className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                2. Submit Deposit Details
              </span>
              <button
                type="button"
                onClick={() => {
                  setDepositINR(50000);
                  setUtrNumber(`43${Math.floor(1000000000 + Math.random() * 9000000000)}`);
                }}
                className="text-[11px] text-slate-600 dark:text-emerald-400 font-semibold hover:underline"
              >
                Auto-fill Sample UTR
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-slate-700 dark:text-slate-300 font-bold text-xs">
                  Deposit Amount (₹ INR)
                </label>
                <span className="text-slate-500 dark:text-slate-400 font-mono text-xs">
                  ≈ ${Number((depositINR / (paymentSettings.usdToInrRate || 90.0)).toFixed(2))} USD
                </span>
              </div>

              <input
                type="number"
                required
                min={500}
                value={depositINR || ''}
                onChange={(e) => setDepositINR(Number(e.target.value))}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
              />

              {/* Quick USD Presets */}
              <div className="space-y-1 pt-1">
                <span className="text-[10px] text-slate-400 font-semibold block">Quick USD Presets:</span>
                <div className="grid grid-cols-6 gap-1">
                  {[50, 100, 200, 500, 1000, 2000].map((usd) => {
                    const rate = paymentSettings.usdToInrRate || 90.0;
                    const calculatedINR = Math.round(usd * rate);
                    return (
                      <button
                        key={usd}
                        type="button"
                        onClick={() => setDepositINR(calculatedINR)}
                        className={`py-1 rounded-lg text-[11px] font-bold font-mono border transition-all ${
                          depositINR === calculatedINR
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                            : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        ${usd}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Estimated Conversion Summary */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Est. Wallet Margin to Credit:</span>
              <strong className="text-emerald-600 dark:text-emerald-400 font-bold text-sm font-mono">
                +${Number((depositINR / (paymentSettings.usdToInrRate || 90.0)).toFixed(2))} USD
              </strong>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-xs">
                12-Digit UTR / Bank Reference ID *
              </label>
              <input
                type="text"
                required
                value={utrNumber}
                onChange={(e) => setUtrNumber(e.target.value)}
                placeholder="e.g. 439201948201"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium text-sm focus:outline-none focus:border-slate-400 dark:focus:border-slate-700 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-xs">
                Upload Payment Screenshot
              </label>
              {proofImage ? (
                <div className="relative rounded-xl h-24 overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={proofImage} alt="Proof" className="w-full h-full object-contain" />
                  <button
                    type="button"
                    onClick={() => setProofImage('')}
                    className="absolute top-1.5 right-1.5 p-1 bg-slate-950/80 text-white rounded text-xs"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <UploadCloud className="w-5 h-5 text-slate-400 mb-1" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Upload Screenshot</span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              )}
            </div>

            <button
              type="submit"
              disabled={depositLoading}
              className="w-full py-2.5 rounded-xl bg-slate-950 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white font-bold text-xs shadow-2xs transition-colors"
            >
              {depositLoading ? 'Submitting...' : 'Submit Deposit for Verification'}
            </button>
          </form>

        </div>
      )}

      {/* TAB 3: WITHDRAWAL */}
      {activeTab === 'withdraw' && (
        <div className="max-w-xl mx-auto p-4 sm:p-6 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4 text-xs">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Request INR Withdrawal</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Funds will be disbursed via IMPS to your verified bank account.</p>
          </div>

          <form onSubmit={handleWithdrawSubmit} className="space-y-4">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-xs">Withdrawal Amount (USD)</label>
              <input
                type="number"
                required
                min={10}
                max={currentUser?.walletBalance || 0}
                value={withdrawUSD || ''}
                onChange={(e) => setWithdrawUSD(Number(e.target.value))}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium text-sm focus:outline-none focus:border-slate-400 dark:focus:border-slate-700"
              />
              <span className="text-xs text-slate-500 dark:text-slate-400 block mt-1">
                Est. Payout: ₹{((withdrawUSD || 0) * paymentSettings.usdToInrRate).toLocaleString('en-IN')} INR
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-xs">Bank Name</label>
                <input
                  type="text"
                  required
                  value={payoutBankName}
                  onChange={(e) => setPayoutBankName(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium text-sm focus:outline-none focus:border-slate-400 dark:focus:border-slate-700"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-xs">Account Number</label>
                <input
                  type="text"
                  required
                  value={payoutAccNumber}
                  onChange={(e) => setPayoutAccNumber(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium text-sm focus:outline-none focus:border-slate-400 dark:focus:border-slate-700"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-xs">IFSC Code</label>
                <input
                  type="text"
                  required
                  value={payoutIfsc}
                  onChange={(e) => setPayoutIfsc(e.target.value.toUpperCase())}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium text-sm uppercase focus:outline-none focus:border-slate-400 dark:focus:border-slate-700"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={withdrawLoading || !isKycApproved}
              className="w-full py-2.5 rounded-xl bg-slate-950 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-2xs transition-colors"
            >
              {withdrawLoading ? 'Processing Request...' : 'Submit Withdrawal Request'}
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
