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
  Wallet,
  ArrowRight,
  RefreshCw,
  Lock,
  AlertCircle,
  TrendingUp,
  RotateCcw,
  Sparkles
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
    <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-slate-50 text-slate-500 rounded-xl">
      <UploadCloud className="w-5 h-5 text-slate-900 animate-pulse" aria-hidden="true" />
      <span className="text-[10px] font-bold">Uploading document…</span>
    </div>
  );
}

export default function ClientKycRealityPage() {
  const router = useRouter();
  const { currentUser, submitKYC, showToast, saveKycDraft, getKycDraft, refreshSession } = useApp();

  // 1 = Identity & Aadhaar/PAN, 2 = Payout Bank Setup
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [isResubmitting, setIsResubmitting] = useState<boolean>(false);

  // Form State: 1. Identity & Documents
  const [fullName, setFullName] = useState(currentUser?.fullName ?? '');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [aadhaarAutoFilled, setAadhaarAutoFilled] = useState(false);
  const [panNumber, setPanNumber] = useState('');
  const [aadhaarFront, setAadhaarFront] = useState<string>('');
  const [aadhaarBack, setAadhaarBack] = useState<string>('');
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);

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
      const res = await uploadFile(file, 'kyc', type === 'front' ? { documentType: 'aadhaar' } : undefined);
      if (res.ok && res.path) {
        if (type === 'front') {
          setAadhaarFront(res.path);
          if (res.detectedNumber) {
            setAadhaarNumber(res.detectedNumber);
            setAadhaarAutoFilled(true);
            showToast({
              type: 'success',
              title: 'Aadhaar number read from card',
              message: 'Check it matches your card, and correct it if not.',
            });
          } else {
            setAadhaarAutoFilled(false);
            showToast({
              type: 'success',
              title: 'Front Uploaded',
              message: res.detectionReason === 'failed-checksum'
                ? 'We could not read the number clearly — please type it below.'
                : 'Aadhaar front photo securely stored.',
            });
          }
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
        setIsResubmitting(false);
        await refreshSession();
        showToast({
          type: 'success',
          title: 'KYC & Bank Setup Submitted',
          message: 'Your verification has been dispatched to compliance desk. You may now enter the platform.',
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

  const kycStatus = currentUser?.kycStatus || 'not_submitted';

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-8 bg-[#f8fafc] text-slate-900 auth-page-clean">
      <div className="w-full max-w-xl space-y-6">
        
        {/* Main Card Container Matching Register Screen */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 space-y-6">
          
          {/* Header Brand */}
          <div className="text-center space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/logo-full.svg" alt="Global Forex" width={200} height={200} className="h-16 sm:h-20 w-auto mx-auto rounded-2xl" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Identity Verification & Bank Setup
            </h2>
            <p className="text-xs text-slate-500">
              Statutory KYC clearance and domestic payout account registration
            </p>
          </div>

          {/* ========================================================================= */}
          {/* REALITY CASE 1: VERIFIED & APPROVED STATE */}
          {/* ========================================================================= */}
          {kycStatus === 'approved' && !isResubmitting && (
            <div className="p-6 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-5 text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>

              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200 inline-block">
                  ✔ KYC Approved
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Institutional KYC Clearance Active
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  Your government identity and domestic settlement bank account are fully verified. All live deposit, trading, and payout gateways are active.
                </p>
              </div>

              {/* Verified Credentials Record Card */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 max-w-md mx-auto text-left space-y-2.5 text-xs shadow-sm">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Verified Profile</span>
                  <span className="text-[10px] font-bold text-emerald-600">Tier-1 Institutional</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Legal Name</span>
                    <span className="font-bold text-slate-900">{currentUser?.fullName || 'Verified Client'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Registered Email</span>
                    <span className="font-bold text-slate-900 truncate block">{currentUser?.email}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Settlement Bank</span>
                    <span className="font-bold text-slate-900">{currentUser?.bankName || 'Verified Domestic Bank'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">IFSC Code</span>
                    <span className="font-bold text-slate-900">{currentUser?.bankIfsc || '••••••••'}</span>
                  </div>
                </div>
              </div>

              {/* Direct Trading & Funding Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md mx-auto pt-2">
                <Link
                  href="/deposit"
                  className="py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md shadow-slate-900/10 active:scale-98"
                >
                  <Wallet className="w-4 h-4" />
                  <span>Deposit Capital</span>
                </Link>

                <Link
                  href="/dashboard"
                  className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-900 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-98"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>Enter Dashboard →</span>
                </Link>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsResubmitting(true)}
                  className="text-[11px] text-slate-500 hover:text-slate-900 transition-colors underline"
                >
                  Update or Change Payout Bank Details
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* REALITY CASE 2: PENDING CLEARANCE QUEUE */}
          {/* ========================================================================= */}
          {kycStatus === 'pending' && !isResubmitting && (
            <div className="p-6 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-4 text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center">
                <Clock className="w-7 h-7 text-amber-600 animate-pulse" />
              </div>

              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200 inline-block">
                  Compliance Queue Active
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Verification in Progress
                </h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                  Your identity documents and domestic settlement bank details have been dispatched to our compliance desk for verification (~30 mins).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-amber-200 max-w-sm mx-auto space-y-2 shadow-sm text-left">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Estimated Review Time</span>
                  <span className="text-amber-700">~30 Minutes</span>
                </div>
                <div className="h-2 rounded-full bg-amber-100 overflow-hidden">
                  <div className="h-full bg-amber-500 w-3/4 rounded-full animate-pulse" />
                </div>
                <p className="text-[10px] text-slate-500 font-sans">
                  You can explore your dashboard and place demo trades while verification is completed.
                </p>
              </div>

              <div className="pt-2 max-w-sm mx-auto">
                <Link
                  href="/dashboard"
                  className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md shadow-slate-900/10 active:scale-98"
                >
                  <span>Proceed to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* REALITY CASE 3: REJECTED STATE */}
          {/* ========================================================================= */}
          {kycStatus === 'rejected' && !isResubmitting && (
            <div className="p-6 rounded-2xl bg-rose-50/60 border border-rose-200 space-y-4 text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-rose-100 border border-rose-300 flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-rose-600" />
              </div>

              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-200 inline-block">
                  Verification Requires Resubmission
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Action Needed on KYC Documents
                </h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                  The compliance desk was unable to verify your previous submission. Please ensure photos are clear and bank details match your legal name.
                </p>
              </div>

              <div className="pt-2 max-w-xs mx-auto">
                <button
                  type="button"
                  onClick={() => {
                    setIsResubmitting(true);
                    setCurrentStep(1);
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md shadow-slate-900/10 active:scale-98 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Resubmit Verification Documents</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* REALITY CASE 4: UNVERIFIED / SUBMISSION FORM (STEP 1 & STEP 2) */}
          {/* ========================================================================= */}
          {(kycStatus === 'not_submitted' || isResubmitting) && (
            <div className="space-y-5">
              
              {/* Progress Stepper Tabs */}
              <div className="grid grid-cols-2 gap-2.5">
                <div
                  className={`p-3 rounded-2xl border transition-all flex items-center gap-2.5 ${
                    currentStep === 1
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/10'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    currentStep === 1 ? 'bg-white text-slate-900' : 'bg-slate-200 text-slate-600'
                  }`}>
                    1
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold block truncate">Aadhaar & PAN</span>
                    <span className="text-[10px] opacity-80 block truncate">Identity Proofs</span>
                  </div>
                </div>

                <div
                  className={`p-3 rounded-2xl border transition-all flex items-center gap-2.5 ${
                    currentStep === 2
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/10'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    currentStep === 2 ? 'bg-white text-slate-900' : 'bg-slate-200 text-slate-600'
                  }`}>
                    2
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold block truncate">Payout Bank</span>
                    <span className="text-[10px] opacity-80 block truncate">Double-Verified</span>
                  </div>
                </div>
              </div>

              {/* STEP 1: IDENTITY PROOF */}
              {currentStep === 1 && (
                <form onSubmit={handleStep1Submit} className="space-y-4">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 text-xs flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-slate-900 shrink-0 mt-0.5" />
                    <span>Please enter your details exactly as shown on your Government ID documents.</span>
                  </div>

                  {/* Full Legal Name */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Full Legal Name (as per PAN & Aadhaar) *
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 transition-colors"
                    />
                  </div>

                  {/* Aadhaar Number */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700">
                        12-Digit Aadhaar Number *
                      </label>
                      {aadhaarNumber.length === 12 && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isAadhaarValid
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-600 border border-rose-200'
                        }`}>
                          {isAadhaarValid ? '✔ Valid Verhoeff Checksum' : '✕ Invalid Sequence'}
                        </span>
                      )}
                    </div>

                    <input
                      type="text"
                      required
                      maxLength={12}
                      value={aadhaarNumber}
                      onChange={(e) => {
                        setAadhaarNumber(e.target.value.replace(/\D/g, '').slice(0, 12));
                        setAadhaarAutoFilled(false);
                      }}
                      placeholder="Enter 12-digit number"
                      className={`w-full bg-slate-50 focus:bg-white border rounded-xl px-3.5 py-2.5 text-xs text-slate-900 tracking-widest placeholder-slate-400 focus:outline-none transition-colors ${
                        aadhaarNumber.length === 12
                          ? isAadhaarValid
                            ? 'border-slate-900'
                            : 'border-rose-500'
                          : 'border-slate-200 focus:border-slate-400'
                      }`}
                    />

                    {aadhaarAutoFilled && (
                      <p className="text-[10px] text-emerald-700 flex items-start gap-1 pt-0.5">
                        <Check className="w-3 h-3 shrink-0 mt-px" aria-hidden="true" />
                        <span>Read from card. Please check it matches, and correct if not.</span>
                      </p>
                    )}
                  </div>

                  {/* PAN Card Number */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700">
                        Permanent Account Number (PAN) *
                      </label>
                      {panNumber.length === 10 && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isPanValid
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-600 border border-rose-200'
                        }`}>
                          {isPanValid ? '✔ Valid PAN Format' : '✕ Invalid Format'}
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
                      className={`w-full bg-slate-50 focus:bg-white border rounded-xl px-3.5 py-2.5 text-xs text-slate-900 uppercase tracking-widest placeholder-slate-400 focus:outline-none transition-colors ${
                        panNumber.length === 10
                          ? isPanValid
                            ? 'border-slate-900'
                            : 'border-rose-500'
                          : 'border-slate-200 focus:border-slate-400'
                      }`}
                    />
                  </div>

                  {/* Document Photos */}
                  <div className="space-y-2 pt-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Aadhaar Card Photos (Front & Back) *
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Front Photo */}
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-500">Front Side (Photo & Details)</span>
                        {aadhaarFront ? (
                          <div className="relative h-28 rounded-2xl overflow-hidden border border-slate-300 group bg-slate-50">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={aadhaarFront} alt="Aadhaar Front" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => setAadhaarFront('')}
                                className="p-2 rounded-full bg-rose-600 text-white"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-slate-900 text-white text-[9px] font-bold">
                              ✓ Uploaded
                            </div>
                          </div>
                        ) : (
                          <label className="h-28 rounded-2xl border-2 border-dashed border-slate-200 hover:border-slate-900 bg-slate-50 hover:bg-slate-100 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors p-3 text-center">
                            {uploadingFront ? (
                              <UploadSpinner />
                            ) : (
                              <>
                                <UploadCloud className="w-5 h-5 text-slate-400" />
                                <span className="text-[11px] font-bold text-slate-800">Upload Front Side</span>
                                <span className="text-[9px] text-slate-400">JPG, PNG (Max 5MB)</span>
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
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-500">Back Side (Address & QR)</span>
                        {aadhaarBack ? (
                          <div className="relative h-28 rounded-2xl overflow-hidden border border-slate-300 group bg-slate-50">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={aadhaarBack} alt="Aadhaar Back" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => setAadhaarBack('')}
                                className="p-2 rounded-full bg-rose-600 text-white"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-slate-900 text-white text-[9px] font-bold">
                              ✓ Uploaded
                            </div>
                          </div>
                        ) : (
                          <label className="h-28 rounded-2xl border-2 border-dashed border-slate-200 hover:border-slate-900 bg-slate-50 hover:bg-slate-100 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors p-3 text-center">
                            {uploadingBack ? (
                              <UploadSpinner />
                            ) : (
                              <>
                                <UploadCloud className="w-5 h-5 text-slate-400" />
                                <span className="text-[11px] font-bold text-slate-800">Upload Back Side</span>
                                <span className="text-[9px] text-slate-400">JPG, PNG (Max 5MB)</span>
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
                    className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-md shadow-slate-900/10 active:scale-98 flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
                  >
                    <span>Proceed to Payout Bank Details</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </form>
              )}

              {/* STEP 2: PAYOUT BANK DETAILS */}
              {currentStep === 2 && (
                <form onSubmit={handleFinalSubmit} className="space-y-4">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 text-xs flex items-start gap-2">
                    <Building2 className="w-4 h-4 text-slate-900 shrink-0 mt-0.5" />
                    <span>Enter your bank details accurately. Withdrawals are routed strictly to this verified destination.</span>
                  </div>

                  {/* Account Holder Name */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Account Holder Name (as per Bank Records) *
                    </label>
                    <input
                      type="text"
                      required
                      value={bankAccountName}
                      onChange={(e) => setBankAccountName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 transition-colors"
                    />
                  </div>

                  {/* Bank Name */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700">
                        Bank Name *
                      </label>
                      {detectedBank && (
                        <span className="text-[10px] font-bold text-emerald-700">
                          Detected: {detectedBank}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      required
                      value={bankName || detectedBank || ''}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. HDFC Bank, State Bank of India"
                      className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 transition-colors"
                    />
                  </div>

                  {/* Account Numbers */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Bank Account Number *
                      </label>
                      <input
                        type="password"
                        required
                        value={bankAccountNumber}
                        onChange={(e) => setBankAccountNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="Enter account number"
                        className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-700">
                          Confirm Account Number *
                        </label>
                        {reBankAccountNumber && (
                          <span className={`text-[10px] font-bold ${isAccountMatch ? 'text-emerald-700' : 'text-rose-500'}`}>
                            {isAccountMatch ? '✔ Match' : '✕ Mismatch'}
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        required
                        value={reBankAccountNumber}
                        onChange={(e) => setReBankAccountNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="Confirm account number"
                        className={`w-full bg-slate-50 focus:bg-white border rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-colors ${
                          reBankAccountNumber
                            ? isAccountMatch
                              ? 'border-slate-900'
                              : 'border-rose-500'
                            : 'border-slate-200 focus:border-slate-400'
                        }`}
                      />
                    </div>
                  </div>

                  {/* IFSC Codes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-700">
                          Bank IFSC Code *
                        </label>
                        {bankIfsc && (
                          <span className={`text-[10px] font-bold ${isIfscValid ? 'text-emerald-700' : 'text-rose-500'}`}>
                            {isIfscValid ? '✔ Format OK' : '✕ Invalid IFSC'}
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={11}
                        value={bankIfsc}
                        onChange={(e) => setBankIfsc(e.target.value.toUpperCase().slice(0, 11))}
                        placeholder="e.g. HDFC0001234"
                        className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 uppercase tracking-widest placeholder-slate-400 focus:outline-none focus:border-slate-400 transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-700">
                          Confirm IFSC Code *
                        </label>
                        {reBankIfsc && (
                          <span className={`text-[10px] font-bold ${isIfscMatch ? 'text-emerald-700' : 'text-rose-500'}`}>
                            {isIfscMatch ? '✔ Match' : '✕ Mismatch'}
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
                        className={`w-full bg-slate-50 focus:bg-white border rounded-xl px-3.5 py-2.5 text-xs text-slate-900 uppercase tracking-widest placeholder-slate-400 focus:outline-none transition-colors ${
                          reBankIfsc
                            ? isIfscMatch
                              ? 'border-slate-900'
                              : 'border-rose-500'
                            : 'border-slate-200 focus:border-slate-400'
                        }`}
                      />
                    </div>
                  </div>

                  {/* UPI ID */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Personal UPI ID (Optional for fast settlements)
                    </label>
                    <input
                      type="text"
                      value={userUpiId}
                      onChange={(e) => setUserUpiId(e.target.value)}
                      placeholder="e.g. name@okaxis"
                      className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 transition-colors"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !isAccountMatch || !isIfscMatch}
                      className="flex-1 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-md shadow-slate-900/10 active:scale-98 flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Submitting Verification…</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Submit & Complete Verification</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Footer Security Badge */}
          <div className="flex items-center justify-center gap-2 text-slate-400 text-[11px] pt-4 border-t border-slate-100">
            <Lock className="w-3.5 h-3.5" />
            <span>256-bit encrypted statutory compliance pipeline</span>
          </div>

        </div>

      </div>
    </div>
  );
}
