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
  RotateCcw
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
    <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-zinc-50 dark:bg-zinc-900 text-zinc-500">
      <UploadCloud className="w-5 h-5 text-zinc-950 dark:text-white animate-pulse" aria-hidden="true" />
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
  // Whether the number below was read off the card rather than typed. Shown to
  // the client so they know to check it — an auto-filled field that looks typed
  // invites being skipped over.
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
      // Only the front carries the number, so only the front is OCR'd — the
      // back would bill a second call and read nothing useful.
      const res = await uploadFile(file, 'kyc', type === 'front' ? { documentType: 'aadhaar' } : undefined);
      if (res.ok && res.path) {
        if (type === 'front') {
          setAadhaarFront(res.path);

          // Fill the field, never the record. The number lands in an editable
          // input and the client confirms it — a read that passed the Verhoeff
          // checksum is still a read, and OCR confuses 5 with 6 routinely.
          if (res.detectedNumber) {
            setAadhaarNumber(res.detectedNumber);
            setAadhaarAutoFilled(true);
            showToast({
              type: 'success',
              title: 'Aadhaar number read from your card',
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

  const kycStatus = currentUser?.kycStatus || 'unverified';

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 text-zinc-950 dark:text-white select-none">
      
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
          <Link
            href="/dashboard"
            className="p-1.5 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-zinc-950 dark:text-white tracking-tight uppercase">
              Identity Verification & Bank Setup
            </h1>
            <p className="text-[11px] text-zinc-500 font-sans">
              Statutory KYC clearance and domestic payout account registration
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-600 dark:text-zinc-400">
          <Lock className="w-3 h-3 text-zinc-700 dark:text-zinc-300" />
          <span>256-Bit TLS</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* REALITY CASE 1: VERIFIED & APPROVED STATE */}
      {/* ========================================================================= */}
      {kycStatus === 'approved' && !isResubmitting && (
        <div className="p-6 rounded-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-5 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>

          <div className="space-y-1">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 inline-block">
              ✔ Identity Verified & Approved
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-zinc-950 dark:text-white uppercase tracking-tight">
              Institutional KYC Clearance Active
            </h2>
            <p className="text-xs text-zinc-500 font-sans max-w-md mx-auto leading-relaxed">
              Your government identity and domestic settlement bank account are fully verified. All live deposit, trading, and payout gateways are active.
            </p>
          </div>

          {/* Verified Credentials Record Card */}
          <div className="p-4 rounded-md bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 max-w-md mx-auto text-left space-y-2.5 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <span className="text-[10px] font-bold uppercase text-zinc-400">Verified Profile</span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Tier-1 Institutional</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-zinc-400 block">Legal Name</span>
                <span className="font-bold text-zinc-950 dark:text-white">{currentUser?.fullName || 'Verified Client'}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block">Registered Email</span>
                <span className="font-bold text-zinc-950 dark:text-white truncate block">{currentUser?.email}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-zinc-400 block">Settlement Bank</span>
                <span className="font-bold text-zinc-950 dark:text-white">{currentUser?.bankName || 'Verified Domestic Bank'}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block">IFSC Code</span>
                <span className="font-bold text-zinc-950 dark:text-white">{currentUser?.bankIfsc || '••••••••'}</span>
              </div>
            </div>
          </div>

          {/* Direct Trading & Funding Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md mx-auto pt-2">
            <Link
              href="/funds?tab=deposit"
              className="py-2.5 px-3 rounded-md bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
            >
              <Wallet className="w-4 h-4" />
              <span>Deposit Capital</span>
            </Link>

            <a
              href="/trade?symbol=XAU/USD"
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-3 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
            >
              <TrendingUp className="w-4 h-4" />
              <span>Launch Terminal ↗</span>
            </a>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setIsResubmitting(true)}
              className="text-[11px] text-zinc-500 hover:text-zinc-950 dark:hover:text-white transition-colors underline"
            >
              Update or Change Payout Bank Details
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REALITY CASE 2: PENDING CLEARANCE QUEUE (~30 MIN SCREEN) */}
      {/* ========================================================================= */}
      {kycStatus === 'pending' && !isResubmitting && (
        <div className="p-6 rounded-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-4 text-center">
          <div className="w-12 h-12 mx-auto rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
            <Clock className="w-6 h-6 text-zinc-950 dark:text-white animate-pulse" />
          </div>

          <div className="space-y-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 inline-block">
              Compliance Queue Active
            </span>
            <h2 className="text-base sm:text-lg font-bold text-zinc-950 dark:text-white uppercase tracking-tight">
              Verification in Progress
            </h2>
            <p className="text-xs text-zinc-500 font-sans max-w-sm mx-auto leading-relaxed">
              Your identity documents and domestic settlement bank details have been dispatched to our compliance desk for verification.
            </p>
          </div>

          {/* 30-Minute Estimated Timer */}
          <div className="p-3.5 rounded-md bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 max-w-sm mx-auto space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Estimated Review Time</span>
              <span className="text-zinc-950 dark:text-white font-bold">~30 Minutes</span>
            </div>
            <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
              <div className="h-full bg-zinc-950 dark:bg-white w-3/4 rounded-full" />
            </div>
            <p className="text-[10px] text-zinc-400 text-left font-sans">
              Automated notifications will dispatch as soon as the compliance officer completes the check.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 max-w-sm mx-auto">
            <Link
              href="/funds?tab=deposit"
              className="py-2 px-3 rounded-md bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Add Funds</span>
            </Link>

            <Link
              href="/dashboard"
              className="py-2 px-3 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REALITY CASE 3: REJECTED STATE */}
      {/* ========================================================================= */}
      {kycStatus === 'rejected' && !isResubmitting && (
        <div className="p-6 rounded-md bg-white dark:bg-zinc-950 border border-rose-200 dark:border-rose-900/50 space-y-4 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
          </div>

          <div className="space-y-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 inline-block">
              Verification Requires Resubmission
            </span>
            <h2 className="text-base sm:text-lg font-bold text-zinc-950 dark:text-white uppercase tracking-tight">
              Action Needed on KYC Documents
            </h2>
            <p className="text-xs text-zinc-500 font-sans max-w-sm mx-auto leading-relaxed">
              The compliance officer was unable to verify your submission. Please ensure photos are clear and bank details match your legal identity.
            </p>
          </div>

          <div className="pt-2 max-w-xs mx-auto">
            <button
              type="button"
              onClick={() => {
                setIsResubmitting(true);
                setCurrentStep(1);
              }}
              className="w-full py-2.5 px-3 rounded-md bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Resubmit Verification Documents</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REALITY CASE 4: UNVERIFIED / SUBMISSION FORM (STEP 1 & STEP 2) */}
      {/* ========================================================================= */}
      {(kycStatus === 'unverified' || isResubmitting) && (
        <>
          {/* Progress Steps (2-Step Clean Bar) */}
          <div className="grid grid-cols-2 gap-2">
            <div
              className={`p-2.5 rounded-md border transition-colors flex items-center gap-2 ${
                currentStep === 1
                  ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white'
                  : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400'
              }`}
            >
              <div className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold ${
                currentStep === 1 ? 'bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-950' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
              }`}>
                1
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold block truncate">Aadhaar & PAN ID</span>
                <span className="text-[10px] opacity-80 block truncate">Verhoeff & Photo</span>
              </div>
            </div>

            <div
              className={`p-2.5 rounded-md border transition-colors flex items-center gap-2 ${
                currentStep === 2
                  ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white'
                  : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400'
              }`}
            >
              <div className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold ${
                currentStep === 2 ? 'bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-950' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
              }`}>
                2
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold block truncate">Payout Bank Account</span>
                <span className="text-[10px] opacity-80 block truncate">Double-Entry Verified</span>
              </div>
            </div>
          </div>

          {/* STEP 1: IDENTITY PROOF */}
          {currentStep === 1 && (
            <form onSubmit={handleStep1Submit} className="p-4 sm:p-5 rounded-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-4">
              <div className="flex items-center justify-between pb-2.5 border-b border-zinc-100 dark:border-zinc-900">
                <h2 className="text-xs font-bold text-zinc-950 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Step 1: Government Identity Validation</span>
                </h2>
                <span className="text-[10px] text-zinc-400">Step 1 of 2</span>
              </div>

              {/* Full Name */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Full Legal Name (as per PAN & Aadhaar) *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-zinc-50 focus:bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-xs text-zinc-950 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-100 transition-colors"
                />
              </div>

              {/* 12-Digit Aadhaar Input with Verhoeff Checksum */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    12-Digit Aadhaar Card Number *
                  </label>
                  {aadhaarNumber.length === 12 && (
                    <span className={`text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded ${
                      isAadhaarValid
                        ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
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
                    // Once they edit it, it is theirs, not ours.
                    setAadhaarAutoFilled(false);
                  }}
                  placeholder="Enter 12-digit number"
                  className={`w-full bg-zinc-50 focus:bg-white dark:bg-zinc-900 border rounded-md px-3 py-2 text-xs text-zinc-950 dark:text-white tracking-widest placeholder-zinc-400 focus:outline-none transition-colors ${
                    aadhaarNumber.length === 12
                      ? isAadhaarValid
                        ? 'border-zinc-950 dark:border-zinc-100'
                        : 'border-rose-500'
                      : 'border-zinc-200 dark:border-zinc-800 focus:border-zinc-950 dark:focus:border-zinc-100'
                  }`}
                />

                {/* Say plainly that this was read off the image. An auto-filled
                    field that looks typed is one people scroll past without
                    checking, and OCR is a convenience, never a verification. */}
                {aadhaarAutoFilled && (
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-400 flex items-start gap-1 pt-0.5">
                    <Check className="w-3 h-3 shrink-0 mt-px" aria-hidden="true" />
                    <span>Read from your card. Please check it matches, and correct it if not.</span>
                  </p>
                )}
              </div>

              {/* PAN Card Number */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Permanent Account Number (PAN) *
                  </label>
                  {panNumber.length === 10 && (
                    <span className={`text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded ${
                      isPanValid
                        ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
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
                  className={`w-full bg-zinc-50 focus:bg-white dark:bg-zinc-900 border rounded-md px-3 py-2 text-xs text-zinc-950 dark:text-white uppercase tracking-widest placeholder-zinc-400 focus:outline-none transition-colors ${
                    panNumber.length === 10
                      ? isPanValid
                        ? 'border-zinc-950 dark:border-zinc-100'
                        : 'border-rose-500'
                      : 'border-zinc-200 dark:border-zinc-800 focus:border-zinc-950 dark:focus:border-zinc-100'
                  }`}
                />
              </div>

              {/* Front & Back Photo Uploaders */}
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Aadhaar Card Document Photos (Front & Back) *
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Front Photo */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-400">Front Side (Photo & Number)</span>
                    {aadhaarFront ? (
                      <div className="relative h-28 rounded-md overflow-hidden border border-zinc-950 dark:border-white group bg-zinc-50 dark:bg-zinc-900">
                        <img src={aadhaarFront} alt="Aadhaar Front" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setAadhaarFront('')}
                            className="p-1.5 rounded bg-zinc-900 text-white"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-zinc-950 text-white text-[9px] font-bold">
                          ✓ Uploaded
                        </div>
                      </div>
                    ) : (
                      <label className="h-28 rounded-md border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-950 dark:hover:border-white bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors p-3 text-center">
                        {uploadingFront ? (
                          <UploadSpinner />
                        ) : (
                          <>
                            <UploadCloud className="w-5 h-5 text-zinc-400" />
                            <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200">Upload Front Side</span>
                            <span className="text-[9px] text-zinc-400">JPG, PNG (Max 5MB)</span>
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
                    <span className="text-[10px] text-zinc-400">Back Side (Address & QR)</span>
                    {aadhaarBack ? (
                      <div className="relative h-28 rounded-md overflow-hidden border border-zinc-950 dark:border-white group bg-zinc-50 dark:bg-zinc-900">
                        <img src={aadhaarBack} alt="Aadhaar Back" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setAadhaarBack('')}
                            className="p-1.5 rounded bg-zinc-900 text-white"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-zinc-950 text-white text-[9px] font-bold">
                          ✓ Uploaded
                        </div>
                      </div>
                    ) : (
                      <label className="h-28 rounded-md border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-950 dark:hover:border-white bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors p-3 text-center">
                        {uploadingBack ? (
                          <UploadSpinner />
                        ) : (
                          <>
                            <UploadCloud className="w-5 h-5 text-zinc-400" />
                            <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200">Upload Back Side</span>
                            <span className="text-[9px] text-zinc-400">JPG, PNG (Max 5MB)</span>
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
                className="w-full py-2.5 px-3 rounded-md bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-40 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Proceed to Payout Bank Details</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* STEP 2: PAYOUT BANK DETAILS */}
          {currentStep === 2 && (
            <form onSubmit={handleFinalSubmit} className="p-4 sm:p-5 rounded-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-4">
              <div className="flex items-center justify-between pb-2.5 border-b border-zinc-100 dark:border-zinc-900">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="p-1 rounded text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <h2 className="text-xs font-bold text-zinc-950 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Step 2: Client Payout Bank Account</span>
                  </h2>
                </div>
                <span className="text-[10px] text-zinc-400">Step 2 of 2</span>
              </div>

              <div className="p-3 rounded-md bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-zinc-950 dark:text-white" />
                <p className="text-[11px] leading-relaxed font-sans">
                  Enter bank account number and IFSC twice to guarantee zero-error settlement. Withdrawals are routed strictly to this verified destination.
                </p>
              </div>

              {/* Account Holder Name */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Account Holder Name (Registered with Bank) *
                </label>
                <input
                  type="text"
                  required
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-zinc-50 focus:bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-xs text-zinc-950 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-100 transition-colors"
                />
              </div>

              {/* Bank Name */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Bank Name *
                  </label>
                  {detectedBank && (
                    <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400">
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
                  className="w-full bg-zinc-50 focus:bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-xs text-zinc-950 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-100 transition-colors"
                />
              </div>

              {/* Double-Entry Account Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Bank Account Number *
                  </label>
                  <input
                    type="password"
                    required
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter account number"
                    className="w-full bg-zinc-50 focus:bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-xs text-zinc-950 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-100 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      Confirm Account Number *
                    </label>
                    {reBankAccountNumber && (
                      <span className={`text-[10px] font-bold ${isAccountMatch ? 'text-zinc-950 dark:text-white' : 'text-rose-500'}`}>
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
                    className={`w-full bg-zinc-50 focus:bg-white dark:bg-zinc-900 border rounded-md px-3 py-2 text-xs text-zinc-950 dark:text-white placeholder-zinc-400 focus:outline-none transition-colors ${
                      reBankAccountNumber
                        ? isAccountMatch
                          ? 'border-zinc-950 dark:border-zinc-100'
                          : 'border-rose-500'
                        : 'border-zinc-200 dark:border-zinc-800 focus:border-zinc-950 dark:focus:border-zinc-100'
                    }`}
                  />
                </div>
              </div>

              {/* Double-Entry IFSC Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      Bank IFSC Code *
                    </label>
                    {bankIfsc && (
                      <span className={`text-[10px] font-bold ${isIfscValid ? 'text-zinc-950 dark:text-white' : 'text-rose-500'}`}>
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
                    className="w-full bg-zinc-50 focus:bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-xs text-zinc-950 dark:text-white uppercase tracking-widest placeholder-zinc-400 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-100 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      Confirm IFSC Code *
                    </label>
                    {reBankIfsc && (
                      <span className={`text-[10px] font-bold ${isIfscMatch ? 'text-zinc-950 dark:text-white' : 'text-rose-500'}`}>
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
                    className={`w-full bg-zinc-50 focus:bg-white dark:bg-zinc-900 border rounded-md px-3 py-2 text-xs text-zinc-950 dark:text-white uppercase tracking-widest placeholder-zinc-400 focus:outline-none transition-colors ${
                      reBankIfsc
                        ? isIfscMatch
                          ? 'border-zinc-950 dark:border-zinc-100'
                          : 'border-rose-500'
                        : 'border-zinc-200 dark:border-zinc-800 focus:border-zinc-950 dark:focus:border-zinc-100'
                    }`}
                  />
                </div>
              </div>

              {/* Optional UPI ID for Fast Payouts */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Personal UPI ID (Optional for fast domestic routing)
                </label>
                <input
                  type="text"
                  value={userUpiId}
                  onChange={(e) => setUserUpiId(e.target.value)}
                  placeholder="e.g. name@okaxis"
                  className="w-full bg-zinc-50 focus:bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-xs text-zinc-950 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-100 transition-colors"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-3 py-2 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || !isAccountMatch || !isIfscMatch}
                  className="flex-1 py-2 px-3 rounded-md bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-40 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting to Queue…</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Submit for Verification</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </>
      )}

    </div>
  );
}
