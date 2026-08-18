'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  UploadCloud,
  ChevronRight,
  ArrowLeft,
  CreditCard,
  Building2,
  Check,
  Trash2,
  AlertCircle,
  Shield,
  FileCheck,
  Wallet,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Lock
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { uploadFile } from '@/lib/client-upload';
import {
  validateAadhaarVerhoeff,
  formatAadhaar,
  validatePAN,
  validateIFSC,
  getBankNameFromIFSC
} from '@/lib/verhoeff';

function UploadSpinner() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-[#0A0E17] text-slate-400">
      <UploadCloud className="w-5 h-5 text-emerald-400 animate-pulse" aria-hidden="true" />
      <span className="text-[10px] font-semibold">Uploading securely…</span>
    </div>
  );
}

export default function KycPage() {
  const router = useRouter();
  const { currentUser, submitKYC, showToast, saveKycDraft, getKycDraft } = useApp();

  // 1 = Identity & Aadhaar/PAN, 2 = Payout Bank Setup, 3 = 30-Min Under Verification
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);

  // Form State: 1. Identity & Documents
  const [fullName, setFullName] = useState(currentUser?.fullName ?? '');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [aadhaarFront, setAadhaarFront] = useState<string>('');
  const [aadhaarBack, setAadhaarBack] = useState<string>('');
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);
  const [ocrMatched, setOcrMatched] = useState<boolean>(true);

  // Form State: 2. Double-Checked Payout Bank Details
  const [bankAccountName, setBankAccountName] = useState(currentUser?.bankAccountName ?? currentUser?.fullName ?? '');
  const [bankName, setBankName] = useState(currentUser?.bankName ?? '');
  const [bankAccountNumber, setBankAccountNumber] = useState(currentUser?.bankAccountNumber ?? '');
  const [reBankAccountNumber, setReBankAccountNumber] = useState(currentUser?.bankAccountNumber ?? '');
  const [bankIfsc, setBankIfsc] = useState(currentUser?.bankIfsc ?? '');
  const [reBankIfsc, setReBankIfsc] = useState(currentUser?.bankIfsc ?? '');
  const [userUpiId, setUserUpiId] = useState(currentUser?.userUpiId ?? '');

  // Validation States
  const isAadhaarValid = validateAadhaarVerhoeff(aadhaarNumber);
  const isPanValid = validatePAN(panNumber);
  const isIfscValid = validateIFSC(bankIfsc);
  const isReIfscValid = validateIFSC(reBankIfsc);
  const isAccountMatch = bankAccountNumber.trim() !== '' && bankAccountNumber === reBankAccountNumber;
  const isIfscMatch = bankIfsc.trim() !== '' && bankIfsc.toUpperCase() === reBankIfsc.toUpperCase();
  const detectedBank = getBankNameFromIFSC(bankIfsc);

  // If already submitted or verified, set status
  useEffect(() => {
    if (currentUser?.kycStatus === 'pending' || currentUser?.kycStatus === 'approved') {
      setCurrentStep(3);
    }
  }, [currentUser]);

  // Restore draft
  useEffect(() => {
    const draft = getKycDraft();
    if (draft) {
      if (draft.fullName) setFullName(draft.fullName);
      if (draft.aadhaarNumber) setAadhaarNumber(draft.aadhaarNumber);
      if (draft.panNumber) setPanNumber(draft.panNumber);
      if (draft.aadhaarFront) setAadhaarFront(draft.aadhaarFront);
      if (draft.aadhaarBack) setAadhaarBack(draft.aadhaarBack);
      if (draft.bankAccountName) setBankAccountName(draft.bankAccountName);
      if (draft.bankName) setBankName(draft.bankName);
      if (draft.bankAccountNumber) {
        setBankAccountNumber(draft.bankAccountNumber);
        setReBankAccountNumber(draft.bankAccountNumber);
      }
      if (draft.bankIfsc) {
        setBankIfsc(draft.bankIfsc);
        setReBankIfsc(draft.bankIfsc);
      }
      if (draft.upiId) setUserUpiId(draft.upiId);
    }
  }, [getKycDraft]);

  // Handle Document Uploads
  const handleUpload = async (file: File, type: 'front' | 'back') => {
    if (type === 'front') setUploadingFront(true);
    else setUploadingBack(true);

    try {
      const res = await uploadFile(file, 'kyc');
      if (res.ok && res.path) {
        if (type === 'front') {
          setAadhaarFront(res.path);
          showToast({ type: 'success', title: 'Front Uploaded', message: 'Aadhaar front photo securely stored.' });
        } else {
          setAadhaarBack(res.path);
          showToast({ type: 'success', title: 'Back Uploaded', message: 'Aadhaar back photo securely stored.' });
        }
      } else {
        showToast({ type: 'error', title: 'Upload Failed', message: res.error || 'Could not upload document.' });
      }
    } catch {
      showToast({ type: 'error', title: 'Upload Error', message: 'Network error uploading file.' });
    } finally {
      if (type === 'front') setUploadingFront(false);
      else setUploadingBack(false);
    }
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAadhaarValid) {
      showToast({ type: 'error', title: 'Invalid Aadhaar', message: 'Please enter a valid 12-digit Aadhaar number with valid checksum.' });
      return;
    }
    if (!isPanValid) {
      showToast({ type: 'error', title: 'Invalid PAN', message: 'Please enter a valid 10-character PAN number (e.g. ABCDE1234F).' });
      return;
    }
    if (!aadhaarFront || !aadhaarBack) {
      showToast({ type: 'error', title: 'Photos Required', message: 'Please upload both front and back photos of your Aadhaar card.' });
      return;
    }
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAccountMatch) {
      showToast({ type: 'error', title: 'Account Mismatch', message: 'Bank account numbers do not match.' });
      return;
    }
    if (!isIfscMatch || !isIfscValid) {
      showToast({ type: 'error', title: 'Invalid IFSC', message: 'Please verify the bank IFSC code format.' });
      return;
    }

    setLoading(true);

    try {
      const res = await submitKYC(
        'aadhaar',
        aadhaarNumber.replace(/\s+/g, ''),
        [aadhaarFront, aadhaarBack].filter(Boolean),
        {
          fullName: fullName || currentUser?.fullName || '',
          panNumber: panNumber.trim().toUpperCase(),
          bankAccountName: bankAccountName || fullName,
          bankName: bankName || detectedBank || 'Indian Scheduled Bank',
          bankAccountNumber: bankAccountNumber.trim(),
          bankIfsc: bankIfsc.trim().toUpperCase(),
          upiId: userUpiId.trim() || undefined,
        }
      );

      setLoading(false);

      if (res && res.success) {
        setCurrentStep(3);
        showToast({
          type: 'success',
          title: 'KYC Submitted',
          message: 'Your documents have been dispatched to the institutional compliance queue.',
        });
      } else {
        showToast({
          type: 'error',
          title: 'Submission Failed',
          message: res?.error || 'Could not complete verification.',
        });
      }
    } catch {
      setLoading(false);
      showToast({ type: 'error', title: 'Error', message: 'Network error submitting verification.' });
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 text-white select-none">
      
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#1F293D]">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 rounded-xl bg-[#121824] hover:bg-[#1A2232] border border-[#1F293D] text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Institutional KYC & Bank Setup</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Verify your identity and link your payout bank account
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#121824] border border-[#1F293D] text-[11px] font-mono text-slate-400">
          <Lock className="w-3 h-3 text-emerald-400" />
          <span>256-Bit Encrypted</span>
        </div>
      </div>

      {/* Progress Steps (2-Step Clean Bar) */}
      {currentStep < 3 && (
        <div className="grid grid-cols-2 gap-2">
          <div
            className={`p-3 rounded-2xl border transition-all flex items-center gap-2.5 ${
              currentStep === 1
                ? 'bg-[#121824] border-emerald-500 text-white shadow-xs'
                : 'bg-[#0A0E17] border-[#1F293D] text-slate-500'
            }`}
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              currentStep === 1 ? 'bg-emerald-500 text-slate-950' : 'bg-[#121824] text-slate-400'
            }`}>
              1
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">Aadhaar & PAN ID</span>
              <span className="text-[10px] text-slate-400 block truncate">Verhoeff & Photo</span>
            </div>
          </div>

          <div
            className={`p-3 rounded-2xl border transition-all flex items-center gap-2.5 ${
              currentStep === 2
                ? 'bg-[#121824] border-emerald-500 text-white shadow-xs'
                : 'bg-[#0A0E17] border-[#1F293D] text-slate-500'
            }`}
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              currentStep === 2 ? 'bg-emerald-500 text-slate-950' : 'bg-[#121824] text-slate-400'
            }`}>
              2
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">Payout Bank Account</span>
              <span className="text-[10px] text-slate-400 block truncate">Double-Entry Verified</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1: IDENTITY PROOF (AADHAAR + PAN + FRONT/BACK PHOTOS) */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <form onSubmit={handleStep1Submit} className="p-5 sm:p-6 rounded-3xl bg-[#121824] border border-[#1F293D] space-y-5 shadow-2xl animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-[#1F293D]">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span>Step 1: Government Identity Proof</span>
            </h2>
            <span className="text-[11px] text-slate-400">Step 1 of 2</span>
          </div>

          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">
              Full Legal Name (as per PAN & Aadhaar) *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full bg-[#0A0E17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-semibold"
            />
          </div>

          {/* 12-Digit Aadhaar Input with Verhoeff Checksum */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-300">
                12-Digit Aadhaar Card Number *
              </label>
              {aadhaarNumber.length === 12 && (
                <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  isAadhaarValid
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                }`}>
                  {isAadhaarValid ? '✔ Valid Verhoeff Checksum' : '⚠️ Invalid Aadhaar Sequence'}
                </span>
              )}
            </div>

            <input
              type="text"
              required
              maxLength={12}
              value={aadhaarNumber}
              onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
              placeholder="Enter 12-digit number (e.g. 582910293847)"
              className={`w-full bg-[#0A0E17] border rounded-xl px-3.5 py-2.5 text-xs text-white font-mono tracking-widest placeholder-slate-600 focus:outline-none ${
                aadhaarNumber.length === 12
                  ? isAadhaarValid
                    ? 'border-emerald-500 focus:border-emerald-400'
                    : 'border-rose-500 focus:border-rose-400'
                  : 'border-[#1F293D] focus:border-emerald-500'
              }`}
            />
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Mathematical Verhoeff checksum algorithm is verified instantly in your browser.
            </p>
          </div>

          {/* PAN Card Number */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-300">
                Permanent Account Number (PAN) *
              </label>
              {panNumber.length === 10 && (
                <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  isPanValid
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                }`}>
                  {isPanValid ? '✔ Valid PAN Format' : '⚠️ Invalid PAN Format'}
                </span>
              )}
            </div>

            <input
              type="text"
              required
              maxLength={10}
              value={panNumber}
              onChange={(e) => setPanNumber(e.target.value.toUpperCase().slice(0, 10))}
              placeholder="e.g. ABCDE1234F"
              className={`w-full bg-[#0A0E17] border rounded-xl px-3.5 py-2.5 text-xs text-white font-mono uppercase tracking-widest placeholder-slate-600 focus:outline-none ${
                panNumber.length === 10
                  ? isPanValid
                    ? 'border-emerald-500 focus:border-emerald-400'
                    : 'border-rose-500 focus:border-rose-400'
                  : 'border-[#1F293D] focus:border-emerald-500'
              }`}
            />
          </div>

          {/* Front & Back Photo Uploaders */}
          <div className="space-y-3 pt-1">
            <label className="block text-xs font-bold text-slate-300">
              Aadhaar Card Photos (Front & Back) *
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Front Photo */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-slate-400 font-medium">Front Side (Photo & Aadhaar No.)</span>
                {aadhaarFront ? (
                  <div className="relative h-32 rounded-2xl overflow-hidden border border-emerald-500/50 group bg-[#0A0E17]">
                    <img src={aadhaarFront} alt="Aadhaar Front" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAadhaarFront('')}
                        className="p-1.5 rounded-lg bg-rose-600 text-white"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-emerald-500 text-slate-950 text-[9px] font-bold">
                      ✓ Uploaded
                    </div>
                  </div>
                ) : (
                  <label className="h-32 rounded-2xl border-2 border-dashed border-[#1F293D] hover:border-emerald-500 bg-[#0A0E17] flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors p-3 text-center">
                    {uploadingFront ? (
                      <UploadSpinner />
                    ) : (
                      <>
                        <UploadCloud className="w-6 h-6 text-slate-500" />
                        <span className="text-[11px] font-bold text-slate-300">Upload Front Photo</span>
                        <span className="text-[9px] text-slate-500">JPG, PNG or PDF (Max 5MB)</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'front')}
                        />
                      </>
                    )}
                  </label>
                )}
              </div>

              {/* Back Photo */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-slate-400 font-medium">Back Side (Address & QR)</span>
                {aadhaarBack ? (
                  <div className="relative h-32 rounded-2xl overflow-hidden border border-emerald-500/50 group bg-[#0A0E17]">
                    <img src={aadhaarBack} alt="Aadhaar Back" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAadhaarBack('')}
                        className="p-1.5 rounded-lg bg-rose-600 text-white"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-emerald-500 text-slate-950 text-[9px] font-bold">
                      ✓ Uploaded
                    </div>
                  </div>
                ) : (
                  <label className="h-32 rounded-2xl border-2 border-dashed border-[#1F293D] hover:border-emerald-500 bg-[#0A0E17] flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors p-3 text-center">
                    {uploadingBack ? (
                      <UploadSpinner />
                    ) : (
                      <>
                        <UploadCloud className="w-6 h-6 text-slate-500" />
                        <span className="text-[11px] font-bold text-slate-300">Upload Back Photo</span>
                        <span className="text-[9px] text-slate-500">JPG, PNG or PDF (Max 5MB)</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'back')}
                        />
                      </>
                    )}
                  </label>
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={!isAadhaarValid || !isPanValid || !aadhaarFront || !aadhaarBack}
            className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <span>Continue to Bank Details</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: DOUBLE-CHECKED PAYOUT BANK SETUP */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <form onSubmit={handleFinalSubmit} className="p-5 sm:p-6 rounded-3xl bg-[#121824] border border-[#1F293D] space-y-5 shadow-2xl animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-[#1F293D]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-sky-400" />
                <span>Step 2: Client Payout Bank Details</span>
              </h2>
            </div>
            <span className="text-[11px] text-slate-400">Step 2 of 2</span>
          </div>

          <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-sky-400" />
            <p className="text-[11px] leading-relaxed">
              To guarantee zero payout errors, enter your bank account number and IFSC code twice. Withdrawals will be wired directly to this account.
            </p>
          </div>

          {/* Account Holder Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">
              Beneficiary Account Holder Name *
            </label>
            <input
              type="text"
              required
              value={bankAccountName}
              onChange={(e) => setBankAccountName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full bg-[#0A0E17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-semibold"
            />
          </div>

          {/* Bank Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">
              Bank Name {detectedBank && <span className="text-emerald-400 font-mono font-normal">({detectedBank})</span>}
            </label>
            <input
              type="text"
              value={bankName || detectedBank || ''}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g. HDFC Bank Ltd"
              className="w-full bg-[#0A0E17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Double Entry: Account Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                Bank Account Number *
              </label>
              <input
                type="password"
                required
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value.trim())}
                placeholder="Enter account number"
                className="w-full bg-[#0A0E17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono tracking-widest placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-300">
                  Re-enter Account Number *
                </label>
                {reBankAccountNumber && (
                  <span className={`text-[10px] font-bold ${isAccountMatch ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isAccountMatch ? '✔ Matched' : '✕ Mismatched'}
                  </span>
                )}
              </div>
              <input
                type="text"
                required
                value={reBankAccountNumber}
                onChange={(e) => setReBankAccountNumber(e.target.value.trim())}
                placeholder="Confirm account number"
                className={`w-full bg-[#0A0E17] border rounded-xl px-3.5 py-2.5 text-xs text-white font-mono tracking-widest placeholder-slate-600 focus:outline-none ${
                  reBankAccountNumber
                    ? isAccountMatch
                      ? 'border-emerald-500'
                      : 'border-rose-500'
                    : 'border-[#1F293D] focus:border-emerald-500'
                }`}
              />
            </div>
          </div>

          {/* Double Entry: IFSC Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                Bank IFSC Code *
              </label>
              <input
                type="text"
                required
                maxLength={11}
                value={bankIfsc}
                onChange={(e) => setBankIfsc(e.target.value.toUpperCase().slice(0, 11))}
                placeholder="e.g. HDFC0000128"
                className="w-full bg-[#0A0E17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono uppercase tracking-widest placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-300">
                  Re-enter IFSC Code *
                </label>
                {reBankIfsc && (
                  <span className={`text-[10px] font-bold ${isIfscMatch ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isIfscMatch ? '✔ Matched' : '✕ Mismatched'}
                  </span>
                )}
              </div>
              <input
                type="text"
                required
                maxLength={11}
                value={reBankIfsc}
                onChange={(e) => setReBankIfsc(e.target.value.toUpperCase().slice(0, 11))}
                placeholder="Confirm IFSC code"
                className={`w-full bg-[#0A0E17] border rounded-xl px-3.5 py-2.5 text-xs text-white font-mono uppercase tracking-widest placeholder-slate-600 focus:outline-none ${
                  reBankIfsc
                    ? isIfscMatch
                      ? 'border-emerald-500'
                      : 'border-rose-500'
                    : 'border-[#1F293D] focus:border-emerald-500'
                }`}
              />
            </div>
          </div>

          {/* Optional UPI ID for Fast Payouts */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">
              Personal UPI ID (Optional for fast payouts)
            </label>
            <input
              type="text"
              value={userUpiId}
              onChange={(e) => setUserUpiId(e.target.value)}
              placeholder="e.g. name@okaxis"
              className="w-full bg-[#0A0E17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-4 py-3.5 rounded-2xl bg-[#0A0E17] hover:bg-[#1A2232] border border-[#1F293D] text-slate-300 font-bold text-xs"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading || !isAccountMatch || !isIfscMatch}
              className="flex-1 py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Submitting to Clearing Desk…</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Submit for Institutional Approval</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: 30-MINUTE INSTITUTIONAL HOLDING SCREEN */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <div className="p-6 sm:p-8 rounded-3xl bg-[#121824] border border-[#1F293D] space-y-6 text-center shadow-2xl animate-scale-in">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <Clock className="w-8 h-8 text-amber-400 animate-pulse" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-wider font-mono inline-block">
              ⏳ Compliance Review In Progress
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              KYC Under Verification
            </h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Your Aadhaar and Payout Bank account details have been recorded. Our compliance clearing desk is verifying your records.
            </p>
          </div>

          {/* 30-Minute Estimated Timer */}
          <div className="p-4 rounded-2xl bg-[#0A0E17] border border-[#1F293D] max-w-sm mx-auto space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-semibold">Estimated Completion</span>
              <span className="text-emerald-400 font-mono font-bold">~30 Minutes</span>
            </div>
            <div className="h-2 rounded-full bg-[#121824] overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 w-3/4 animate-pulse" />
            </div>
            <p className="text-[10px] text-slate-500 text-left">
              You will receive an automated notification once approved.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Link
              href="/funds?tab=deposit"
              className="py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <Wallet className="w-4 h-4" />
              <span>Add Funds (Deposit)</span>
            </Link>

            <Link
              href="/dashboard"
              className="py-3 px-4 rounded-2xl bg-[#0A0E17] hover:bg-[#1A2232] border border-[#1F293D] text-slate-300 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <span>Explore Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

    </div>
  );
}
