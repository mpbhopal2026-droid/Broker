'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  UploadCloud,
  ChevronRight,
  User,
  MapPin,
  CreditCard,
  Building2,
  Check,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { uploadFile } from '@/lib/client-upload';
import { UploadedDocPreview } from '@/components/kyc/UploadedDocPreview';

function UploadSpinner() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-slate-50 dark:bg-slate-900">
      <UploadCloud className="w-5 h-5 text-emerald-600 animate-pulse" aria-hidden="true" />
      <span className="text-[10px] font-semibold text-slate-500">Uploading…</span>
    </div>
  );
}

export default function KycPage() {
  const { currentUser, submitKYC, showToast, saveKycDraft, getKycDraft } = useApp();

  const [currentStep, setCurrentStep] = useState<number>(1);

  // Skip ahead past whatever registration already captured. Re-asking for the
  // name and email a client entered two screens ago is the most common reason
  // people abandon verification.
  useEffect(() => {
    if (!currentUser) return;
    const hasPersonal = Boolean(currentUser.fullName && currentUser.email && currentUser.phone);
    const hasAddress = Boolean(currentUser.address && currentUser.city && currentUser.postalCode);
    if (hasPersonal && hasAddress) setCurrentStep((s) => (s < 3 ? 3 : s));
    else if (hasPersonal) setCurrentStep((s) => (s < 2 ? 2 : s));
  }, [currentUser]);

  const [loading, setLoading] = useState<boolean>(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState<boolean>(false);
  const [isEditingKyc, setIsEditingKyc] = useState<boolean>(false);

  // Form State: 1. Personal Details
  const [fullName, setFullName] = useState(currentUser?.fullName ?? '');
  const [email, setEmail] = useState(currentUser?.email ?? '');
  const [phone, setPhone] = useState(currentUser?.phone ?? '');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | ''>('');
  const [nationality, setNationality] = useState('Indian');

  // Form State: 2. Residential Address
  const [streetAddress, setStreetAddress] = useState(currentUser?.address ?? '');
  const [city, setCity] = useState(currentUser?.city ?? '');
  const [state, setState] = useState(currentUser?.state ?? '');
  const [postalCode, setPostalCode] = useState(currentUser?.postalCode ?? '');
  const [country, setCountry] = useState('India');

  // Form State: 3. Identity Verification
  const [panNumber, setPanNumber] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [panImage, setPanImage] = useState<string>('');
  const [aadhaarFront, setAadhaarFront] = useState<string>('');
  const [aadhaarBack, setAadhaarBack] = useState<string>('');

  // Form State: 4. Bank & Payout Details
  const [bankAccountName, setBankAccountName] = useState(currentUser?.bankAccountName ?? currentUser?.fullName ?? '');
  const [bankName, setBankName] = useState(currentUser?.bankName ?? '');
  const [bankAccountNumber, setBankAccountNumber] = useState(currentUser?.bankAccountNumber ?? '');
  const [bankIfsc, setBankIfsc] = useState(currentUser?.bankIfsc ?? '');
  const [upiId, setUpiId] = useState(currentUser?.userUpiId ?? '');

  // Restore draft if exists
  useEffect(() => {
    const draft = getKycDraft();
    if (draft) {
      if (draft.currentStep) setCurrentStep(draft.currentStep);
      if (draft.fullName) setFullName(draft.fullName);
      if (draft.email) setEmail(draft.email);
      if (draft.phone) setPhone(draft.phone);
      if (draft.dob) setDob(draft.dob);
      if (draft.gender) setGender(draft.gender);
      if (draft.nationality) setNationality(draft.nationality);
      if (draft.streetAddress) setStreetAddress(draft.streetAddress);
      if (draft.city) setCity(draft.city);
      if (draft.state) setState(draft.state);
      if (draft.postalCode) setPostalCode(draft.postalCode);
      if (draft.country) setCountry(draft.country);
      if (draft.panNumber) setPanNumber(draft.panNumber);
      if (draft.aadhaarNumber) setAadhaarNumber(draft.aadhaarNumber);
      if (draft.panImage) setPanImage(draft.panImage);
      if (draft.aadhaarFront) setAadhaarFront(draft.aadhaarFront);
      if (draft.aadhaarBack) setAadhaarBack(draft.aadhaarBack);
      if (draft.bankAccountName) setBankAccountName(draft.bankAccountName);
      if (draft.bankName) setBankName(draft.bankName);
      if (draft.bankAccountNumber) setBankAccountNumber(draft.bankAccountNumber);
      if (draft.bankIfsc) setBankIfsc(draft.bankIfsc);
      if (draft.upiId) setUpiId(draft.upiId);
    }
  }, [getKycDraft]);

  // Auto-save draft on change
  useEffect(() => {
    saveKycDraft({
      currentStep,
      fullName,
      email,
      phone,
      dob,
      gender: gender || undefined,
      nationality,
      streetAddress,
      city,
      state,
      postalCode,
      country,
      panNumber,
      aadhaarNumber,
      panImage,
      aadhaarFront,
      aadhaarBack,
      bankAccountName,
      bankName,
      bankAccountNumber,
      bankIfsc,
      upiId,
    });
  }, [
    currentStep,
    fullName,
    email,
    phone,
    dob,
    gender,
    nationality,
    streetAddress,
    city,
    state,
    postalCode,
    country,
    panNumber,
    aadhaarNumber,
    panImage,
    aadhaarFront,
    aadhaarBack,
    bankAccountName,
    bankName,
    bankAccountNumber,
    bankIfsc,
    upiId,
    saveKycDraft,
  ]);

  const isApproved = currentUser?.kycStatus === 'approved';
  const isPending =
    currentUser?.kycStatus === 'pending' ||
    isSubmittedSuccess ||
    false;

  // Upload to storage and keep the returned PATH. This used to call
  // readAsDataURL and store a base64 string, which is why no KYC ever reached
  // the queue: the server expects a storage key, cleanString truncates at 2000
  // chars so the image arrived mangled, and verifyUploadedFile then rejected
  // it. The submission failed every time, and the old catch block reported
  // success anyway — so the client saw a holding screen and we saw nothing.
  const [uploading, setUploading] = useState<string>('');

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void,
    label: string,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(label);
    const res = await uploadFile(file, 'kyc');
    setUploading('');

    if (!res.ok || !res.path) {
      // uploadFile inspects the bytes, so this catches a password-protected
      // PDF or a mislabelled file here rather than at the reviewer's desk.
      showToast({
        type: 'error',
        title: 'Upload failed',
        message: res.error ?? 'Could not upload that file. Check your internet connection and try again.',
      });
      e.target.value = '';
      return;
    }

    setter(res.path);
  };

  const goToStep = (target: number) => {
    // Going back is always allowed; only moving forward is validated.
    if (target <= currentStep) { setCurrentStep(target); return; }

    const missing: string[] = [];
    if (currentStep === 1) {
      if (!fullName.trim()) missing.push('full name');
      if (!email.trim()) missing.push('email');
      if (!phone.trim()) missing.push('phone');
      if (!dob) missing.push('date of birth');
      if (!gender) missing.push('gender');
    }
    if (currentStep === 2) {
      if (!streetAddress.trim()) missing.push('street address');
      if (!city.trim()) missing.push('city');
      if (!state.trim()) missing.push('state');
      if (!/^\d{6}$/.test(postalCode.trim())) missing.push('a 6-digit PIN code');
    }
    if (currentStep === 3) {
      // PAN is the government format; a typo here fails at the bank later.
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panNumber.trim().toUpperCase())) missing.push('a valid PAN (ABCDE1234F)');
      if (!/^\d{12}$/.test(aadhaarNumber.replace(/\s/g, ''))) missing.push('a 12-digit Aadhaar number');
      if (!panImage) missing.push('PAN photo');
      if (!aadhaarFront) missing.push('Aadhaar front photo');
      if (!aadhaarBack) missing.push('Aadhaar back photo');
    }
    if (currentStep === 4) {
      if (!bankAccountName.trim()) missing.push('account holder name');
      if (!bankName.trim()) missing.push('bank name');
      if (!bankAccountNumber.trim()) missing.push('account number');
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankIfsc.trim().toUpperCase())) missing.push('a valid IFSC (ABCD0123456)');
    }

    if (missing.length) {
      showToast({
        type: 'error',
        title: 'Still needed',
        message: 'Please add ' + missing.join(', ') + '.',
      });
      return;
    }
    setCurrentStep(target);
  };

  const steps = [
    { number: 1, title: 'Personal Info', desc: 'Legal identity details', icon: User },
    { number: 2, title: 'Address', desc: 'Proof of residence', icon: MapPin },
    { number: 3, title: 'Identity Documents', desc: 'PAN & Aadhaar upload', icon: CreditCard },
    { number: 4, title: 'Bank Account', desc: 'INR withdrawal settlement', icon: Building2 },
    { number: 5, title: 'Declaration', desc: 'Compliance submission', icon: ShieldCheck },
  ];

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!panImage || !aadhaarFront) {
        showToast({
          type: 'error',
          title: 'Documents required',
          message: 'Upload your PAN and Aadhaar images before submitting.',
        });
        setLoading(false);
        return;
      }

      const allDocFiles = [panImage, aadhaarFront, aadhaarBack].filter(Boolean);

      const res = await submitKYC(
        'pan',
        panNumber.trim().toUpperCase(),
        allDocFiles,
        {
          fullName,
          streetAddress,
          city,
          state,
          postalCode,
          country,
          bankAccountName,
          bankName,
          bankAccountNumber,
          bankIfsc: bankIfsc.trim().toUpperCase(),
          upiId,
        }
      );

      // submitKYC RETURNS a failure, it does not throw — so the catch below
      // never fired and this declared success unconditionally. That is the last
      // link in the chain that put clients on "verification under progress"
      // while the compliance queue stayed empty.
      if (!res.success) {
        showToast({
          type: 'error',
          title: 'Not submitted',
          message: res.error || 'Your documents were not submitted. Please try again.',
        });
        return;
      }

      setIsSubmittedSuccess(true);
      showToast({
        type: 'success',
        title: 'KYC Submitted Successfully',
        message: 'Your account is under process and will be approved shortly by our compliance desk.',
      });
    } catch (err) {
      // Report the failure. This catch previously did the opposite — it set the
      // success flag and showed "KYC Submitted Successfully" — so a submission
      // that never reached the database still put the client on the holding
      // screen. They waited for a review of documents nobody had, and the
      // compliance queue stayed empty with no sign anything was wrong.
      showToast({
        type: 'error',
        title: 'Submission failed',
        message:
          err instanceof Error && err.message
            ? err.message
            : 'Your documents were not submitted. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 select-none min-w-0 w-full">
      
      {/* Conditional State: Verified vs Pending vs Multi-Step Form */}
      {isApproved ? (
        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Account Verified & Approved</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
              Your PAN, Aadhaar, and Bank Account credentials have been verified. Your live trading account has full execution capabilities, 200x leverage dealing, and instant INR payout settlements enabled.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto text-left pt-2">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">PAN Card</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">{panNumber}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Aadhaar ID</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">•••• 3920</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Bank</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">{bankName}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Status</span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">APPROVED</span>
            </div>
          </div>

          {/* Funds first, not the trading desk. A newly approved account has a
              zero balance, so sending them straight to /trade lands them on a
              screen where every action is refused for want of funds. */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/funds?tab=deposit"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
            >
              <span>Add funds</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              href="/trade"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:border-slate-400 transition-colors"
            >
              <span>Go to trading desk</span>
            </Link>
          </div>
        </div>
      ) : isPending && !isEditingKyc ? (
        /* HOLDING / UNDER PROCESS PAGE WITH FULL DATA MATRIX & RE-UPLOAD BUTTON */
        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 text-center space-y-6 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800">
            <Clock className="w-9 h-9 stroke-[2.5] animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-300 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              Under Compliance Verification
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Account Under Process</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
              Your KYC application and identity documents have been submitted to compliance. Your live account capabilities will be enabled upon review.
            </p>
          </div>

          {/* Full Submitted Data Matrix */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 max-w-xl mx-auto text-xs text-left space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="font-bold text-slate-900 dark:text-white text-xs">Submitted Applicant Details</span>
              <span className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400">Est. 15-30 Mins</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Applicant Name</span>
                <strong className="text-slate-900 dark:text-white truncate block">{fullName || currentUser?.fullName || '—'}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Email Address</span>
                <strong className="text-slate-900 dark:text-white truncate block">{email || currentUser?.email || '—'}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Mobile Number</span>
                <strong className="text-slate-900 dark:text-white truncate block font-mono">{phone || currentUser?.phone || '—'}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">PAN Card</span>
                <strong className="text-slate-900 dark:text-white font-mono">{panNumber || '—'}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Aadhaar Card</span>
                <strong className="text-slate-900 dark:text-white font-mono">{aadhaarNumber || '—'}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Settlement Bank</span>
                <strong className="text-slate-900 dark:text-white truncate block">{bankName} ({bankIfsc})</strong>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[10px] text-slate-400 block font-medium">Address</span>
                <strong className="text-slate-900 dark:text-white truncate block">{streetAddress ? `${streetAddress}, ${city}, ${state} ${postalCode}` : '—'}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">UPI Settlement ID</span>
                <strong className="text-slate-900 dark:text-white truncate block font-mono">{upiId || '—'}</strong>
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setIsEditingKyc(true);
                setCurrentStep(1);
              }}
              className="px-6 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 shadow-sm"
            >
              Edit / Re-upload KYC Documents
            </button>
            <Link
              href="/dashboard"
              className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      ) : (
        /* KYC MULTI-STEP FLOW WITH HORIZONTAL CIRCULAR STEPPER */
        <div className="space-y-6">
          
          {/* Universal Horizontal Circular Stepper (Both Desktop & Mobile) */}
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            
            {/* Connected Circle Nodes */}
            <div className="relative flex items-center justify-between px-2 sm:px-8 min-w-0">
              
              {/* Background Track Line */}
              <div className="absolute left-6 right-6 sm:left-8 sm:right-8 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 dark:bg-slate-800 z-0" />
              
              {/* Active Green Progress Line */}
              <div
                className="absolute left-8 top-1/2 -translate-y-1/2 h-0.5 bg-emerald-500 transition-all duration-300 z-0"
                style={{
                  width: `${((currentStep - 1) / 4) * 88}%`,
                }}
              />

              {steps.map((s) => {
                const isPassed = currentStep > s.number;
                const isCurrent = currentStep === s.number;

                return (
                  <button
                    key={s.number}
                    type="button"
                    onClick={() => goToStep(s.number)}
                    className="relative z-10 flex flex-col items-center group cursor-pointer focus:outline-none"
                  >
                    <div
                      className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all duration-200 ${
                        isPassed
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : isCurrent
                          ? 'bg-slate-900 dark:bg-emerald-600 text-white ring-4 ring-emerald-500/20 shadow-md scale-110'
                          : 'bg-white dark:bg-[#111827] text-slate-400 dark:text-slate-500 border-2 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {isPassed ? <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" /> : s.number}
                    </div>

                    {/* Step Title Label beneath circle (Desktop visible) */}
                    <span
                      className={`hidden sm:block text-[11px] font-bold mt-2 transition-colors text-center ${
                        isCurrent
                          ? 'text-slate-900 dark:text-white'
                          : isPassed
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {s.title}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Step Indicator Banner */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-mono font-bold text-[11px] break-all">
                  STEP {currentStep} OF 5
                </span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {steps.find((s) => s.number === currentStep)?.title}
                </span>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                {steps.find((s) => s.number === currentStep)?.desc}
              </span>
            </div>

          </div>

          {/* Form Content Card */}
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            
            {/* STEP 1: Personal Details */}
            {currentStep === 1 && (
              <div className="space-y-5 text-xs">
                <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Step 1: Personal Identification Details
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Enter your legal details exactly as printed on your government-issued ID.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-xs">
                      Full Legal Name (as per PAN Card)
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Veer Bhanushali"
                      className="w-full bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-xs">
                      Email Address (Official Dealing Alerts)
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-xs">
                      Registered Mobile Number (+91)
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-xs">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      required
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-xs">
                      Gender
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {(['Male', 'Female', 'Other'] as const).map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setGender(g)}
                          className={`py-2.5 rounded-xl border font-bold text-xs transition-all ${
                            gender === g
                              ? 'bg-slate-900 dark:bg-emerald-600 text-white border-slate-900 dark:border-emerald-600 shadow-xs'
                              : 'bg-slate-50 dark:bg-[#111827] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-xs">
                      Nationality / Tax Residency
                    </label>
                    <input
                      type="text"
                      value={nationality}
                      onChange={(e) => setNationality(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => goToStep(2)}
                    className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                  >
                    <span>Proceed to Address Details</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Residential Address */}
            {currentStep === 2 && (
              <div className="space-y-5 text-xs">
                <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Step 2: Permanent Residential Address
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Enter the permanent address as printed on your Aadhaar card or Passport.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-xs">
                      Flat / House No. / Street Address
                    </label>
                    <input
                      type="text"
                      required
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      placeholder="House / flat, street, area"
                      className="w-full bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-xs">
                        City / Town
                      </label>
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="City"
                        className="w-full bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-xs">
                        State
                      </label>
                      <input
                        type="text"
                        required
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        placeholder="State"
                        className="w-full bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-xs">
                        Postal / PIN Code
                      </label>
                      <input
                        type="text"
                        required
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        placeholder="6-digit PIN"
                        className="w-full bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-xs">
                        Country
                      </label>
                      <input
                        type="text"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="px-6 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => goToStep(3)}
                    className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                  >
                    <span>Proceed to PAN & Aadhaar</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Statutory Identity & Proof Uploads */}
            {currentStep === 3 && (
              <div className="space-y-5 text-xs">
                <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Step 3: Identity Proof (PAN & Aadhaar)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Upload official government documents for automated verification.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  
                  {/* PAN Section */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 space-y-3">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-xs">
                        PAN Card Number
                      </label>
                      <input
                        type="text"
                        required
                        value={panNumber}
                        onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                        placeholder="e.g. ABCPS1234F"
                        className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm font-bold uppercase font-mono text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <span className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-xs">
                        PAN Card Front Copy
                      </span>
                      {panImage ? (
                        <div className="relative rounded-2xl h-32 overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {uploading === 'pan' ? <UploadSpinner /> : <UploadedDocPreview path={panImage} alt="PAN" />}
                          <button
                            type="button"
                            onClick={() => setPanImage('')}
                            className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-xl shadow-md hover:bg-rose-700 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl h-32 flex flex-col items-center justify-center cursor-pointer bg-white dark:bg-[#0f172a] hover:border-emerald-500 transition-colors group">
                          <UploadCloud className="w-6 h-6 text-slate-400 group-hover:text-emerald-500 transition-colors mb-1" />
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Upload PAN Image</span>
                          <span className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, PDF up to 10MB</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, setPanImage, 'pan')}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Aadhaar Section */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 space-y-3">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-xs">
                        12-Digit Aadhaar Number
                      </label>
                      <input
                        type="text"
                        required
                        value={aadhaarNumber}
                        onChange={(e) => setAadhaarNumber(e.target.value)}
                        placeholder="12-digit Aadhaar number"
                        className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm font-bold font-mono text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="block font-semibold text-slate-600 dark:text-slate-400 text-[11px] mb-1">
                          Front Side
                        </span>
                        {aadhaarFront ? (
                          <div className="relative rounded-2xl h-24 overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {uploading === 'aadhaarFront' ? <UploadSpinner /> : <UploadedDocPreview path={aadhaarFront} alt="Aadhaar front" />}
                            <button
                              type="button"
                              onClick={() => setAadhaarFront('')}
                              className="absolute top-1.5 right-1.5 p-1 bg-rose-600 text-white rounded-lg"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <label className="border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl h-24 flex flex-col items-center justify-center cursor-pointer bg-white dark:bg-[#0f172a] hover:border-emerald-500 transition-colors">
                            <UploadCloud className="w-4 h-4 text-slate-400 mb-1" />
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Front Copy</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFileUpload(e, setAadhaarFront, 'aadhaarFront')}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>

                      <div>
                        <span className="block font-semibold text-slate-600 dark:text-slate-400 text-[11px] mb-1">
                          Back Side
                        </span>
                        {aadhaarBack ? (
                          <div className="relative rounded-2xl h-24 overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {uploading === 'aadhaarBack' ? <UploadSpinner /> : <UploadedDocPreview path={aadhaarBack} alt="Aadhaar back" />}
                            <button
                              type="button"
                              onClick={() => setAadhaarBack('')}
                              className="absolute top-1.5 right-1.5 p-1 bg-rose-600 text-white rounded-lg"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <label className="border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl h-24 flex flex-col items-center justify-center cursor-pointer bg-white dark:bg-[#0f172a] hover:border-emerald-500 transition-colors">
                            <UploadCloud className="w-4 h-4 text-slate-400 mb-1" />
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Back Copy</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFileUpload(e, setAadhaarBack, 'aadhaarBack')}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>

                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 gap-3">
                  <button
                    type="button"
                    onClick={() => goToStep(2)}
                    className="px-6 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => goToStep(4)}
                    className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                  >
                    <span>Proceed to Bank Account</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Bank Account & Payout Details */}
            {currentStep === 4 && (
              <div className="space-y-5 text-xs">
                <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Step 4: INR Bank Account Settlement
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Your profits and withdrawal payouts will be routed to this verified bank account.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-xs">
                      Beneficiary Account Name
                    </label>
                    <input
                      type="text"
                      required
                      value={bankAccountName}
                      onChange={(e) => setBankAccountName(e.target.value)}
                      placeholder="Name exactly as on bank records"
                      className="w-full bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-xs">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      required
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. HDFC Bank Ltd"
                      className="w-full bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-xs">
                      Bank Account Number
                    </label>
                    <input
                      type="text"
                      required
                      value={bankAccountNumber}
                      onChange={(e) => setBankAccountNumber(e.target.value)}
                      placeholder="e.g. 50100293849102"
                      className="w-full bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm font-bold font-mono text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-xs">
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      required
                      value={bankIfsc}
                      onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                      placeholder="e.g. HDFC0000128"
                      className="w-full bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm font-bold font-mono uppercase text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-xs">
                      UPI ID (Instant IMPS Clearance)
                    </label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="yourname@okhdfcbank"
                      className="w-full bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 gap-3">
                  <button
                    type="button"
                    onClick={() => goToStep(3)}
                    className="px-6 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => goToStep(5)}
                    className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                  >
                    <span>Proceed to Review & Submit</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: Final Review & Compliance Declaration */}
            {currentStep === 5 && (
              <form onSubmit={handleFinalSubmit} className="space-y-5 text-xs">
                <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Step 5: Review & Compliance Declaration
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Verify that your submitted credentials are correct before routing to compliance.
                  </p>
                </div>

                {/* Summary Matrix */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Applicant Name</span>
                      <strong className="text-slate-900 dark:text-white text-xs">{fullName}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Contact Email</span>
                      <strong className="text-slate-900 dark:text-white text-xs">{email}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Mobile Number</span>
                      <strong className="text-slate-900 dark:text-white text-xs">{phone}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">PAN Card</span>
                      <strong className="text-slate-900 dark:text-white text-xs font-mono">{panNumber}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Aadhaar Card</span>
                      <strong className="text-slate-900 dark:text-white text-xs font-mono">{aadhaarNumber}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Bank & IFSC</span>
                      <strong className="text-slate-900 dark:text-white text-xs font-mono">{bankName} · {bankIfsc}</strong>
                    </div>
                  </div>
                </div>

                {/* The tick is gone — Terms, Risk Disclosure and the Client
                    Agreement are accepted once at registration, so asking again
                    here was a second click for a decision already recorded.
                    The declaration itself stays: it attests the DOCUMENTS are
                    genuine and the applicant's own, which registration does not
                    cover and which is the statement that matters in an AML
                    review. Submitting is the act of declaring. */}
                <p className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                  By submitting, you declare that the personal, residential, PAN, Aadhaar and banking
                  details above are authentic and registered in your name, and you consent to
                  compliance verification under India&apos;s Digital Personal Data Protection Act 2023.
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 gap-3">
                  <button
                    type="button"
                    onClick={() => goToStep(4)}
                    className="px-6 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                  >
                    <ShieldCheck className="w-4 h-4 text-white" />
                    <span>{loading ? 'Submitting to Compliance...' : 'Submit Verification for Approval'}</span>
                  </button>
                </div>
              </form>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
