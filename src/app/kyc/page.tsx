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
  User,
  UserCheck,
  FileCheck,
  Lightbulb,
  Eye,
  EyeOff,
  X,
  Shield
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
    <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-slate-50 text-slate-500 rounded-2xl">
      <UploadCloud className="w-6 h-6 text-emerald-600 animate-pulse" aria-hidden="true" />
      <span className="text-[10px] font-bold">Uploading document…</span>
    </div>
  );
}

function KycImagePreview({
  previewUrl,
  storagePath,
  alt,
  onRemove,
}: {
  previewUrl?: string;
  storagePath?: string;
  alt: string;
  onRemove: () => void;
}) {
  const [resolvedUrl, setResolvedUrl] = useState<string>(previewUrl || '');

  useEffect(() => {
    if (previewUrl) {
      setResolvedUrl(previewUrl);
      return;
    }

    if (!storagePath) {
      setResolvedUrl('');
      return;
    }

    if (storagePath.startsWith('data:') || storagePath.startsWith('http://') || storagePath.startsWith('https://') || storagePath.startsWith('blob:')) {
      setResolvedUrl(storagePath);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/upload?purpose=kyc&path=${encodeURIComponent(storagePath)}`, {
          credentials: 'same-origin',
        });
        const data = await res.json().catch(() => ({}));
        if (!cancelled && res.ok && data?.url) {
          setResolvedUrl(data.url);
        }
      } catch {}
    })();

    return () => {
      cancelled = true;
    };
  }, [previewUrl, storagePath]);

  return (
    <div className="relative h-32 rounded-2xl overflow-hidden border border-emerald-500 group bg-slate-50 shadow-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolvedUrl || previewUrl || storagePath}
        alt={alt}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <button
          type="button"
          onClick={onRemove}
          className="p-2 rounded-full bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-md"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="absolute bottom-2 left-2 px-2.5 py-0.5 rounded-full bg-[#05603a] text-white text-[10px] font-bold flex items-center gap-1 shadow-sm">
        <Check className="w-3 h-3" />
        <span>Uploaded</span>
      </div>
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
  const [checkingStatus, setCheckingStatus] = useState<boolean>(false);

  // Auto-refresh status if in pending review every 15 seconds
  useEffect(() => {
    if (currentUser?.kycStatus !== 'pending') return;
    const interval = setInterval(() => {
      void refreshSession();
    }, 15000);
    return () => clearInterval(interval);
  }, [currentUser?.kycStatus, refreshSession]);

  const handleManualRefresh = async () => {
    setCheckingStatus(true);
    await refreshSession();
    setTimeout(() => {
      setCheckingStatus(false);
      showToast({ type: 'info', title: 'Status Checked', message: 'Your compliance status is up to date.' });
    }, 600);
  };

  // Form State: 1. Identity & Documents
  const [fullName, setFullName] = useState(currentUser?.fullName ?? '');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [aadhaarAutoFilled, setAadhaarAutoFilled] = useState(false);
  const [showAadhaar, setShowAadhaar] = useState(false);
  const [panNumber, setPanNumber] = useState('');
  const [aadhaarFront, setAadhaarFront] = useState<string>('');
  const [aadhaarBack, setAadhaarBack] = useState<string>('');
  const [aadhaarFrontPreview, setAadhaarFrontPreview] = useState<string>('');
  const [aadhaarBackPreview, setAadhaarBackPreview] = useState<string>('');
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);

  // Form State: 2. Double-Checked Payout Bank Details
  const [bankAccountName, setBankAccountName] = useState(currentUser?.bankAccountName ?? currentUser?.fullName ?? '');
  const [bankName, setBankName] = useState(currentUser?.bankName ?? '');
  const [bankAccountNumber, setBankAccountNumber] = useState(currentUser?.bankAccountNumber ?? '');
  const [reBankAccountNumber, setReBankAccountNumber] = useState(currentUser?.bankAccountNumber ?? '');
  const [showAccountNumber, setShowAccountNumber] = useState(false);
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
      if (draft.aadhaarFront) {
        setAadhaarFront(draft.aadhaarFront);
        if (draft.aadhaarFront.startsWith('data:') || draft.aadhaarFront.startsWith('http')) {
          setAadhaarFrontPreview(draft.aadhaarFront);
        }
      }
      if (draft.aadhaarBack) {
        setAadhaarBack(draft.aadhaarBack);
        if (draft.aadhaarBack.startsWith('data:') || draft.aadhaarBack.startsWith('http')) {
          setAadhaarBackPreview(draft.aadhaarBack);
        }
      }
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
    const localUrl = URL.createObjectURL(file);
    if (type === 'front') {
      setAadhaarFrontPreview(localUrl);
      setUploadingFront(true);
    } else {
      setAadhaarBackPreview(localUrl);
      setUploadingBack(true);
    }

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
    <div className="min-h-screen w-full flex items-center justify-center px-3 sm:px-6 py-6 sm:py-10 bg-[#f8fafc] text-slate-900 overflow-x-hidden">
      <div className="w-full max-w-5xl space-y-6 min-w-0">
        
        {/* Main Card Container */}
        <div className="bg-white p-5 sm:p-8 md:p-10 rounded-3xl sm:rounded-[32px] border border-slate-200/90 shadow-2xl shadow-slate-200/60 space-y-7 min-w-0 w-full overflow-hidden">
          
          {/* Header Brand */}
          <div className="text-center space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/logo-full.svg" alt="GLOBAL FOREX" width={220} height={70} className="h-14 sm:h-16 w-auto mx-auto" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Identity Verification & Bank Setup
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Statutory KYC clearance and domestic payout account registration
            </p>
          </div>

          {/* Stepper Tabs - only shown during active document submission */}
          {(kycStatus === 'not_submitted' || isResubmitting) && (
            <>
              <div className="max-w-xl mx-auto flex items-center justify-center gap-3 sm:gap-4">
                {/* Step 1 Tab */}
                <div
                  className={`flex-1 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 border transition-all ${
                    currentStep === 1
                      ? 'border-2 border-emerald-600 bg-white shadow-sm'
                      : currentStep > 1
                      ? 'border-emerald-500 bg-emerald-50/50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        currentStep === 1
                          ? 'bg-[#05603a] text-white'
                          : currentStep > 1
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {currentStep > 1 ? '✓' : '1'}
                    </div>
                    <div className="text-left">
                      <div className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                        Aadhaar & PAN
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {currentStep > 1 ? 'Verified' : 'Identity Proofs'}
                      </div>
                    </div>
                  </div>
                  <CreditCard className={`w-5 h-5 shrink-0 ${currentStep === 1 ? 'text-emerald-600' : 'text-slate-400'}`} />
                </div>

                {/* Step Connector Line */}
                <div className={`w-6 sm:w-10 h-[2px] shrink-0 ${currentStep === 2 ? 'bg-emerald-500' : 'bg-slate-200'}`} />

                {/* Step 2 Tab */}
                <div
                  className={`flex-1 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 border transition-all ${
                    currentStep === 2
                      ? 'border-2 border-emerald-600 bg-white shadow-sm'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        currentStep === 2
                          ? 'bg-[#05603a] text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      2
                    </div>
                    <div className="text-left">
                      <div className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">
                        Payout Bank
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Double-Verified
                      </div>
                    </div>
                  </div>
                  <Building2 className={`w-5 h-5 shrink-0 ${currentStep === 2 ? 'text-emerald-600' : 'text-slate-400'}`} />
                </div>
              </div>

              {/* Security Banner */}
              <div className="rounded-2xl bg-[#f0fdf4] border border-emerald-200/80 p-4 sm:p-4.5 flex items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100/90 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                      Your information is secure and encrypted.
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-600">
                      Please enter your details exactly as shown on your Government ID documents.
                    </p>
                  </div>
                </div>

                <div className="hidden sm:flex w-10 h-10 rounded-2xl bg-white/80 border border-emerald-200/90 items-center justify-center text-emerald-600 shadow-sm shrink-0">
                  <Check className="w-5 h-5 stroke-[2.5]" />
                </div>
              </div>
            </>
          )}

          {/* ========================================================================= */}
          {/* REALITY CASE 1: APPROVED STATE */}
          {/* ========================================================================= */}
          {kycStatus === 'approved' && !isResubmitting && (
            <div className="p-6 sm:p-10 rounded-3xl bg-gradient-to-b from-emerald-50/70 via-white to-slate-50 border border-emerald-200 space-y-7 text-center shadow-xl shadow-emerald-950/5 relative overflow-hidden">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-600 to-[#044e2f] border-2 border-white shadow-xl shadow-emerald-900/20 flex items-center justify-center text-white">
                <CheckCircle2 className="w-9 h-9 stroke-[2.3]" />
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <span className="px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300/80 inline-block shadow-sm">
                  ✔ Tier-1 Clearance Active
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Institutional KYC Clearance Approved
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Your government identity and domestic settlement bank account are fully verified. All live deposit, trading, and payout gateways are active.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200/90 max-w-md mx-auto text-left space-y-3 text-xs shadow-sm">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Verified Profile</span>
                  <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Tier-1 Institutional
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Legal Name</span>
                    <span className="font-bold text-slate-900">{currentUser?.fullName || 'Verified Client'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Registered Email</span>
                    <span className="font-bold text-slate-900 truncate block">{currentUser?.email}</span>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Settlement Bank</span>
                    <span className="font-bold text-slate-900">{currentUser?.bankName || 'Verified Domestic Bank'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">IFSC Code</span>
                    <span className="font-bold text-slate-900 font-mono">{currentUser?.bankIfsc || '••••••••'}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto pt-2">
                <Link
                  href="/deposit"
                  className="py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
                >
                  <Wallet className="w-4 h-4" />
                  <span>Deposit Capital</span>
                </Link>

                <Link
                  href="/dashboard"
                  className="py-3.5 px-4 rounded-xl bg-[#05603a] hover:bg-[#044e2f] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950/20 active:scale-98"
                >
                  <span>Enter Terminal</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setIsResubmitting(true)}
                  className="text-xs text-slate-500 hover:text-slate-900 transition-colors underline cursor-pointer"
                >
                  Update or Change Payout Bank Details
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* REALITY CASE 2: PENDING QUEUE */}
          {/* ========================================================================= */}
          {kycStatus === 'pending' && !isResubmitting && (
            <div className="p-6 sm:p-10 rounded-3xl bg-gradient-to-b from-[#f0fdf4]/80 via-white to-slate-50 border border-emerald-200/90 space-y-8 text-center shadow-xl shadow-emerald-950/5 relative overflow-hidden">
              
              {/* Decorative background glow */}
              <div className="absolute top-0 right-1/4 w-72 h-72 bg-emerald-300/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-teal-300/10 rounded-full blur-3xl pointer-events-none" />

              {/* Top Status Badge & Glowing Radar Icon */}
              <div className="space-y-4 relative z-10">
                <div className="relative inline-flex items-center justify-center">
                  {/* Pulsing outer aura rings */}
                  <div className="absolute w-24 h-24 rounded-full bg-emerald-400/20 animate-ping opacity-60 pointer-events-none" />
                  <div className="absolute w-20 h-20 rounded-full bg-emerald-500/25 animate-pulse pointer-events-none" />
                  
                  {/* Core Icon Box */}
                  <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-[#044e2f] border-2 border-white shadow-xl shadow-emerald-900/30 flex items-center justify-center text-white">
                    <ShieldCheck className="w-8 h-8 stroke-[2.2]" />
                  </div>
                </div>

                <div className="space-y-2 max-w-lg mx-auto">
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-emerald-100/90 text-emerald-800 border border-emerald-300/80 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                    <span>Compliance Audit In Progress</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    Verification In Progress (~15 - 30 Mins)
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Your identity proofs and domestic settlement bank details have been safely recorded. Our compliance officers are performing final verification.
                  </p>
                </div>
              </div>

              {/* Real-time Verification Progress Timeline */}
              <div className="max-w-xl mx-auto rounded-2xl bg-white border border-slate-200/90 p-5 sm:p-6 shadow-sm space-y-4 text-left relative z-10">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    Verification Pipeline
                  </span>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Estimated: ~15 - 30 Mins
                  </span>
                </div>

                <div className="space-y-3.5 pt-1">
                  {/* Step 1 */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </div>
                      <span className="font-semibold text-slate-800">Aadhaar & PAN Uploaded</span>
                    </div>
                    <span className="text-[11px] text-emerald-600 font-medium">Verhoeff Validated</span>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </div>
                      <span className="font-semibold text-slate-800">Payout Bank Details Registered</span>
                    </div>
                    <span className="text-[11px] text-emerald-600 font-medium">Double-Verified</span>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 border border-emerald-500 text-emerald-700 flex items-center justify-center text-[10px] font-bold">
                        <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                      </div>
                      <span className="font-bold text-slate-900">Desk Audit & Security Clearance</span>
                    </div>
                    <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 animate-pulse">
                      Active Review
                    </span>
                  </div>

                  {/* Step 4 */}
                  <div className="flex items-center justify-between text-xs opacity-50">
                    <div className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[10px] font-bold">
                        4
                      </div>
                      <span className="font-medium text-slate-600">Full Live Trading & Instant Payout Gateways</span>
                    </div>
                    <span className="text-[11px] text-slate-400">Upcoming</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="pt-2">
                  <div className="h-2 rounded-full bg-emerald-100 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-[#05603a] w-3/4 rounded-full animate-pulse" />
                  </div>
                  <p className="text-[10px] text-slate-400 pt-1.5 text-center">
                    You can explore the terminal and place demo trades while verification is completed.
                  </p>
                </div>
              </div>

              {/* Registered Details Preview */}
              <div className="max-w-xl mx-auto rounded-2xl bg-white/90 border border-emerald-100 p-4 text-xs text-left grid grid-cols-2 sm:grid-cols-4 gap-3 shadow-sm relative z-10">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Account Name</span>
                  <span className="font-bold text-slate-800 truncate block">{currentUser?.fullName || 'Client'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Settlement Bank</span>
                  <span className="font-bold text-slate-800 truncate block">{currentUser?.bankName || 'Domestic Bank'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Bank Account</span>
                  <span className="font-bold text-slate-800 truncate block font-mono">
                    •••• {currentUser?.bankAccountNumber ? currentUser.bankAccountNumber.slice(-4) : '••••'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">IFSC Code</span>
                  <span className="font-bold text-slate-800 truncate block font-mono">
                    {currentUser?.bankIfsc || '••••••••'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="max-w-md mx-auto space-y-3 relative z-10 pt-1">
                <Link
                  href="/dashboard"
                  className="w-full py-3.5 px-6 rounded-xl bg-[#05603a] hover:bg-[#044e2f] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950/20 active:scale-98 cursor-pointer"
                >
                  <span>Proceed to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <div className="flex items-center justify-center gap-4 text-xs pt-1">
                  <button
                    type="button"
                    onClick={handleManualRefresh}
                    disabled={checkingStatus}
                    className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${checkingStatus ? 'animate-spin' : ''}`} />
                    <span>{checkingStatus ? 'Checking...' : 'Refresh Status'}</span>
                  </button>

                  <span className="text-slate-300">•</span>

                  <button
                    type="button"
                    onClick={() => {
                      setIsResubmitting(true);
                      setCurrentStep(2);
                    }}
                    className="text-slate-500 hover:text-slate-800 font-medium transition-colors underline cursor-pointer"
                  >
                    Update Bank Details
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* REALITY CASE 3: REJECTED STATE */}
          {/* ========================================================================= */}
          {kycStatus === 'rejected' && !isResubmitting && (
            <div className="p-6 sm:p-10 rounded-3xl bg-gradient-to-b from-rose-50/80 via-white to-slate-50 border border-rose-200 space-y-7 text-center shadow-xl shadow-rose-950/5 relative overflow-hidden">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-rose-600 to-rose-800 border-2 border-white shadow-xl shadow-rose-900/20 flex items-center justify-center text-white">
                <AlertCircle className="w-9 h-9 stroke-[2.3]" />
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <span className="px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300/80 inline-block shadow-sm">
                  ✕ Action Needed on KYC Documents
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Verification Requires Resubmission
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
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
                  className="w-full py-3.5 px-6 rounded-xl bg-[#05603a] hover:bg-[#044e2f] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950/20 active:scale-98 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Resubmit Verification Documents</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* REALITY CASE 4: SUBMISSION FORM (2-COLUMN GRID MATCHING REFERENCE UI) */}
          {/* ========================================================================= */}
          {(kycStatus === 'not_submitted' || isResubmitting) && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-start pt-1 min-w-0 w-full">
              
              {/* LEFT COLUMN: FEATURES CARD */}
              <div className="md:col-span-4 rounded-2xl bg-gradient-to-b from-[#f0fdf4] to-[#f8fafc] border border-emerald-100 p-5 sm:p-6 space-y-6 relative overflow-hidden min-w-0">
                {currentStep === 1 ? (
                  <>
                    {/* Feature 1 */}
                    <div className="space-y-1.5">
                      <div className="w-8 h-8 rounded-xl bg-white border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900">Secure & Compliant</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Your data is 256-bit encrypted and fully compliant with regulations.
                      </p>
                    </div>

                    {/* Feature 2 */}
                    <div className="space-y-1.5">
                      <div className="w-8 h-8 rounded-xl bg-white border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900">Quick Verification</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Aadhaar & PAN verification in just a few minutes.
                      </p>
                    </div>

                    {/* Feature 3 */}
                    <div className="space-y-1.5">
                      <div className="w-8 h-8 rounded-xl bg-white border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
                        <FileCheck className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900">Accurate Details</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Ensure your details match your government ID to avoid delays.
                      </p>
                    </div>

                    {/* Feature 4 */}
                    <div className="space-y-1.5">
                      <div className="w-8 h-8 rounded-xl bg-white border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
                        <Lock className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900">Privacy Protected</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        We never share your personal information with anyone.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Step 2 Features */}
                    <div className="space-y-1.5">
                      <div className="w-8 h-8 rounded-xl bg-white border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900">Fast Settlements</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Direct RTGS / NEFT / IMPS pipeline for rapid withdrawals.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="w-8 h-8 rounded-xl bg-white border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900">Zero-Error Routing</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Double-entry verification prevents failed payout transfers.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="w-8 h-8 rounded-xl bg-white border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900">Verified Ownership</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Bank account name must match your KYC identity proof.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="w-8 h-8 rounded-xl bg-white border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
                        <Wallet className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900">UPI Express</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Instant domestic settlements to your personal UPI ID.
                      </p>
                    </div>
                  </>
                )}

                {/* Decorative subtle background waves */}
                <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-emerald-200/20 rounded-full blur-2xl pointer-events-none" />
              </div>

              {/* RIGHT COLUMN: STEP 1 (IDENTITY) OR STEP 2 (BANK DETAILS) */}
              <div className="md:col-span-8 space-y-5 min-w-0 w-full">
                
                {/* STEP 1 FORM */}
                {currentStep === 1 && (
                  <form onSubmit={handleStep1Submit} className="space-y-5 min-w-0 w-full">
                    
                    {/* Full Legal Name */}
                    <div className="space-y-1.5 min-w-0 w-full">
                      <label className="block text-xs font-semibold text-slate-800 truncate">
                        Full Legal Name (as per PAN & Aadhaar) *
                      </label>
                      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-3.5 py-3 focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600 transition-all min-w-0 w-full">
                        <User className="w-4 h-4 text-slate-400 shrink-0" />
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Rahul Sharma"
                          className="w-full min-w-0 flex-1 text-xs sm:text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none bg-transparent"
                        />
                        {fullName.trim().length >= 3 && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                      </div>
                    </div>

                    {/* 12-Digit Aadhaar Number */}
                    <div className="space-y-1.5 min-w-0 w-full">
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <label className="block text-xs font-semibold text-slate-800 truncate">
                          12-Digit Aadhaar Number *
                        </label>
                        {aadhaarNumber.length === 12 && (
                          <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isAadhaarValid
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-600 border border-rose-200'
                          }`}>
                            {isAadhaarValid ? '✔ Valid Verhoeff Checksum' : '✕ Invalid Sequence'}
                          </span>
                        )}
                      </div>

                      <div className={`flex items-center gap-3 bg-white border rounded-xl px-3.5 py-3 focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600 transition-all min-w-0 w-full ${
                        aadhaarNumber.length === 12
                          ? isAadhaarValid
                            ? 'border-emerald-600'
                            : 'border-rose-400'
                          : 'border-slate-200'
                      }`}>
                        <CreditCard className="w-4 h-4 text-slate-400 shrink-0" />
                        <input
                          type={showAadhaar ? 'text' : 'password'}
                          required
                          maxLength={12}
                          value={aadhaarNumber}
                          onChange={(e) => {
                            setAadhaarNumber(e.target.value.replace(/\D/g, '').slice(0, 12));
                            setAadhaarAutoFilled(false);
                          }}
                          placeholder="Enter 12-digit number"
                          className="w-full min-w-0 flex-1 text-xs sm:text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none tracking-wider bg-transparent"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAadhaar(!showAadhaar)}
                          className="text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                        >
                          {showAadhaar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400 font-normal">
                        Enter your 12-digit Aadhaar number without spaces.
                      </p>
                    </div>

                    {/* Permanent Account Number (PAN) */}
                    <div className="space-y-1.5 min-w-0 w-full">
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <label className="block text-xs font-semibold text-slate-800 truncate">
                          Permanent Account Number (PAN) *
                        </label>
                        {panNumber.length === 10 && (
                          <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isPanValid
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-600 border border-rose-200'
                          }`}>
                            {isPanValid ? '✔ Valid PAN Format' : '✕ Invalid Format'}
                          </span>
                        )}
                      </div>

                      <div className={`flex items-center gap-3 bg-white border rounded-xl px-3.5 py-3 focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600 transition-all min-w-0 w-full ${
                        panNumber.length === 10
                          ? isPanValid
                            ? 'border-emerald-600'
                            : 'border-rose-400'
                          : 'border-slate-200'
                      }`}>
                        <Shield className="w-4 h-4 text-slate-400 shrink-0" />
                        <input
                          type="text"
                          required
                          maxLength={10}
                          value={panNumber}
                          onChange={(e) => setPanNumber(e.target.value.toUpperCase().slice(0, 10))}
                          placeholder="E.g. ABCDE1234F"
                          className="w-full min-w-0 flex-1 text-xs sm:text-sm text-slate-900 font-medium uppercase placeholder:text-slate-400 focus:outline-none tracking-widest bg-transparent"
                        />
                        {isPanValid && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 font-normal">
                        Enter your 10-character PAN number.
                      </p>
                    </div>

                    {/* Document Photos Upload Box */}
                    <div className="space-y-2 pt-1 min-w-0 w-full">
                      <label className="block text-xs font-semibold text-slate-800">
                        Aadhaar Card Photos (Front & Back) *
                      </label>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0 w-full">
                        {/* Front Side */}
                        <div className="space-y-1.5 min-w-0 w-full">
                          <span className="text-[11px] text-slate-500 truncate block">Front Side (Photo & Details)</span>
                          {aadhaarFront || aadhaarFrontPreview ? (
                            <KycImagePreview
                              previewUrl={aadhaarFrontPreview}
                              storagePath={aadhaarFront}
                              alt="Aadhaar Front"
                              onRemove={() => {
                                setAadhaarFront('');
                                setAadhaarFrontPreview('');
                              }}
                            />
                          ) : (
                            <label className="h-32 rounded-2xl border-2 border-dashed border-slate-200 hover:border-emerald-500 bg-[#fbfcfd] hover:bg-emerald-50/20 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all p-3 text-center group min-w-0 w-full">
                              {uploadingFront ? (
                                <UploadSpinner />
                              ) : (
                                <>
                                  <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <UploadCloud className="w-5 h-5" />
                                  </div>
                                  <span className="text-xs font-bold text-slate-800">Upload Front Side</span>
                                  <span className="text-[10px] text-slate-400">JPG, PNG (Max 5MB)</span>
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

                        {/* Back Side */}
                        <div className="space-y-1.5 min-w-0 w-full">
                          <span className="text-[11px] text-slate-500 truncate block">Back Side (Address & QR)</span>
                          {aadhaarBack || aadhaarBackPreview ? (
                            <KycImagePreview
                              previewUrl={aadhaarBackPreview}
                              storagePath={aadhaarBack}
                              alt="Aadhaar Back"
                              onRemove={() => {
                                setAadhaarBack('');
                                setAadhaarBackPreview('');
                              }}
                            />
                          ) : (
                            <label className="h-32 rounded-2xl border-2 border-dashed border-slate-200 hover:border-emerald-500 bg-[#fbfcfd] hover:bg-emerald-50/20 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all p-3 text-center group min-w-0 w-full">
                              {uploadingBack ? (
                                <UploadSpinner />
                              ) : (
                                <>
                                  <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <UploadCloud className="w-5 h-5" />
                                  </div>
                                  <span className="text-xs font-bold text-slate-800">Upload Back Side</span>
                                  <span className="text-[10px] text-slate-400">JPG, PNG (Max 5MB)</span>
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

                    {/* Tips Box */}
                    <div className="rounded-2xl bg-[#f0fdf4] border border-emerald-200/80 p-4 space-y-2 min-w-0 w-full">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                        <Lightbulb className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Tips for a smooth verification</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-slate-700">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          Use clear, well-lit photos
                        </span>
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          All details should be visible
                        </span>
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          Accepted formats: JPG, PNG
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="flex items-center justify-between gap-4 pt-2 min-w-0 w-full">
                      <button
                        type="button"
                        onClick={() => router.push('/dashboard')}
                        className="px-6 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-2 transition-all shadow-sm active:scale-98 shrink-0"
                      >
                        <X className="w-4 h-4" />
                        <span>Cancel</span>
                      </button>

                      <button
                        type="submit"
                        disabled={!isAadhaarValid || !isPanValid || !aadhaarFront || !aadhaarBack}
                        className="flex-1 sm:flex-initial px-8 py-3 rounded-xl bg-[#05603a] hover:bg-[#044e2f] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/20 active:scale-98 transition-all disabled:opacity-40 cursor-pointer shrink-0"
                      >
                        <span>Save & Continue</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>

                  </form>
                )}

                {/* STEP 2 FORM: PAYOUT BANK DETAILS */}
                {currentStep === 2 && (
                  <form onSubmit={handleFinalSubmit} className="space-y-5 min-w-0 w-full">
                    
                    {/* Account Holder Name */}
                    <div className="space-y-1.5 min-w-0 w-full">
                      <label className="block text-xs font-semibold text-slate-800 truncate">
                        Account Holder Name (as per Bank Records) *
                      </label>
                      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-3.5 py-3 focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600 transition-all min-w-0 w-full">
                        <User className="w-4 h-4 text-slate-400 shrink-0" />
                        <input
                          type="text"
                          required
                          value={bankAccountName}
                          onChange={(e) => setBankAccountName(e.target.value)}
                          placeholder="e.g. Rahul Sharma"
                          className="w-full min-w-0 flex-1 text-xs sm:text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none bg-transparent"
                        />
                      </div>
                    </div>

                    {/* Bank Name */}
                    <div className="space-y-1.5 min-w-0 w-full">
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <label className="block text-xs font-semibold text-slate-800 truncate">
                          Bank Name *
                        </label>
                        {detectedBank && (
                          <span className="shrink-0 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Detected: {detectedBank}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-3.5 py-3 focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600 transition-all min-w-0 w-full">
                        <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                        <input
                          type="text"
                          required
                          value={bankName || detectedBank || ''}
                          onChange={(e) => setBankName(e.target.value)}
                          placeholder="e.g. HDFC Bank, State Bank of India"
                          className="w-full min-w-0 flex-1 text-xs sm:text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none bg-transparent"
                        />
                      </div>
                    </div>

                    {/* Double-Entry Account Number */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0 w-full">
                      <div className="space-y-1.5 min-w-0 w-full">
                        <label className="block text-xs font-semibold text-slate-800 truncate">
                          Bank Account Number *
                        </label>
                        <div className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600 transition-all min-w-0 w-full">
                          <CreditCard className="w-4 h-4 text-slate-400 shrink-0" />
                          <input
                            type={showAccountNumber ? 'text' : 'password'}
                            required
                            value={bankAccountNumber}
                            onChange={(e) => setBankAccountNumber(e.target.value.replace(/\D/g, ''))}
                            placeholder="Enter account number"
                            className="w-full min-w-0 flex-1 text-xs sm:text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none bg-transparent"
                          />
                          <button
                            type="button"
                            onClick={() => setShowAccountNumber(!showAccountNumber)}
                            className="text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                          >
                            {showAccountNumber ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5 min-w-0 w-full">
                        <div className="flex items-center justify-between gap-1 min-w-0">
                          <label className="block text-xs font-semibold text-slate-800 truncate">
                            Confirm Account Number *
                          </label>
                          {reBankAccountNumber && (
                            <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              isAccountMatch ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'
                            }`}>
                              {isAccountMatch ? '✔ Match' : '✕ Mismatch'}
                            </span>
                          )}
                        </div>
                        <div className={`flex items-center gap-2.5 bg-white border rounded-xl px-3 py-2.5 focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600 transition-all min-w-0 w-full ${
                          reBankAccountNumber
                            ? isAccountMatch
                              ? 'border-emerald-600'
                              : 'border-rose-400'
                            : 'border-slate-200'
                        }`}>
                          <CreditCard className="w-4 h-4 text-slate-400 shrink-0" />
                          <input
                            type="text"
                            required
                            value={reBankAccountNumber}
                            onChange={(e) => setReBankAccountNumber(e.target.value.replace(/\D/g, ''))}
                            placeholder="Confirm account number"
                            className="w-full min-w-0 flex-1 text-xs sm:text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none bg-transparent"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Double-Entry IFSC Code */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0 w-full">
                      <div className="space-y-1.5 min-w-0 w-full">
                        <div className="flex items-center justify-between gap-1 min-w-0">
                          <label className="block text-xs font-semibold text-slate-800 truncate">
                            Bank IFSC Code *
                          </label>
                          {bankIfsc && (
                            <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              isIfscValid ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'
                            }`}>
                              {isIfscValid ? '✔ Format OK' : '✕ Invalid IFSC'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600 transition-all min-w-0 w-full">
                          <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                          <input
                            type="text"
                            required
                            maxLength={11}
                            value={bankIfsc}
                            onChange={(e) => setBankIfsc(e.target.value.toUpperCase().slice(0, 11))}
                            placeholder="e.g. HDFC0001234"
                            className="w-full min-w-0 flex-1 text-xs sm:text-sm text-slate-900 font-medium uppercase tracking-wider placeholder:text-slate-400 focus:outline-none bg-transparent"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5 min-w-0 w-full">
                        <div className="flex items-center justify-between gap-1 min-w-0">
                          <label className="block text-xs font-semibold text-slate-800 truncate">
                            Confirm IFSC Code *
                          </label>
                          {reBankIfsc && (
                            <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              isIfscMatch ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'
                            }`}>
                              {isIfscMatch ? '✔ Match' : '✕ Mismatch'}
                            </span>
                          )}
                        </div>
                        <div className={`flex items-center gap-2.5 bg-white border rounded-xl px-3 py-2.5 focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600 transition-all min-w-0 w-full ${
                          reBankIfsc
                            ? isIfscMatch
                              ? 'border-emerald-600'
                              : 'border-rose-400'
                            : 'border-slate-200'
                        }`}>
                          <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                          <input
                            type="text"
                            required
                            maxLength={11}
                            value={reBankIfsc}
                            onChange={(e) => setReBankIfsc(e.target.value.toUpperCase().slice(0, 11))}
                            placeholder="Confirm IFSC code"
                            className="w-full min-w-0 flex-1 text-xs sm:text-sm text-slate-900 font-medium uppercase tracking-wider placeholder:text-slate-400 focus:outline-none bg-transparent"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Personal UPI ID (Optional) */}
                    <div className="space-y-1.5 min-w-0 w-full">
                      <label className="block text-xs font-semibold text-slate-800 truncate">
                        Personal UPI ID (Optional for fast settlements)
                      </label>
                      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-3.5 py-3 focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600 transition-all min-w-0 w-full">
                        <Wallet className="w-4 h-4 text-slate-400 shrink-0" />
                        <input
                          type="text"
                          value={userUpiId}
                          onChange={(e) => setUserUpiId(e.target.value)}
                          placeholder="e.g. name@okaxis"
                          className="w-full min-w-0 flex-1 text-xs sm:text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none bg-transparent"
                        />
                      </div>
                    </div>

                    {/* Tips Box */}
                    <div className="rounded-2xl bg-[#f0fdf4] border border-emerald-200/80 p-4 space-y-2 min-w-0 w-full">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                        <Lightbulb className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Payout Account Guidelines</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-slate-700">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          Name must match your KYC identity
                        </span>
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          Withdrawals routed strictly to this account
                        </span>
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          Double-check IFSC code
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="flex items-center justify-between gap-4 pt-2 min-w-0 w-full">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentStep(1);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="px-6 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-2 transition-all shadow-sm active:scale-98 cursor-pointer shrink-0"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back</span>
                      </button>

                      <button
                        type="submit"
                        disabled={loading || !isAccountMatch || !isIfscMatch}
                        className="flex-1 sm:flex-initial px-8 py-3 rounded-xl bg-[#05603a] hover:bg-[#044e2f] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/20 active:scale-98 transition-all disabled:opacity-40 cursor-pointer shrink-0"
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Submitting Verification…</span>
                          </>
                        ) : (
                          <>
                            <span>Submit & Complete Verification</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>

                  </form>
                )}

              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
