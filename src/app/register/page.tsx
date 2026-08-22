'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Pencil,
  Loader2,
  TrendingUp,
  PartyPopper,
  DollarSign
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { DigitOtpInput } from '@/components/auth/DigitOtpInput';
import { LEGAL_DOCUMENTS, ConsentPurpose } from '@/lib/legal';
import { BrandLogo } from '@/components/ui/BrandLogo';

const DRAFT_STORAGE_KEY = 'apex_registration_draft';

const REQUIRED_PURPOSES: ConsentPurpose[] = ['kyc_identity', 'account_operation', 'service_email'];

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { requestOtp, verifyOtpAndLogin, setConsent, acceptLegalDocuments, openOnboardingChoice } = useApp();

  const [step, setStep] = useState<'details' | 'verify' | 'celebrate'>('details');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('Verifying code…');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [alreadyRegisteredError, setAlreadyRegisteredError] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const nextPath = searchParams.get('next');
  const paramEmail = searchParams.get('email');
  const paramPhone = searchParams.get('phone');

  // 1. Auto-Load Draft from LocalStorage on mount
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed.fullName && !fullName) setFullName(parsed.fullName);
        if (parsed.email && !email) setEmail(parsed.email);
        if (parsed.phone && !phone) setPhone(parsed.phone);
      }
    } catch {}
  }, []);

  // Pre-fill from URL params if available
  useEffect(() => {
    if (paramEmail && !email) setEmail(paramEmail);
    if (paramPhone && !phone) setPhone(paramPhone);
  }, [paramEmail, paramPhone, email, phone]);

  // 2. Real-Time Auto-Save Draft to LocalStorage whenever inputs change
  useEffect(() => {
    if (fullName || email || phone) {
      try {
        localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({
            fullName: fullName.trim(),
            email: email.trim(),
            phone: phone.trim(),
            savedAt: Date.now(),
          })
        );
      } catch {}
    }
  }, [fullName, email, phone]);

  // 3. Resend OTP Countdown Timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((t) => Math.max(t - 1, 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setInfo('');
    setAlreadyRegisteredError(false);

    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    const result = await requestOtp(email.trim(), 'email', 'email_verify');
    setLoading(false);

    if (!result.success) {
      if (result.alreadyRegistered) {
        setAlreadyRegisteredError(true);
        setError('');
        return;
      }
      setError(result.error || 'Could not send verification code. Please try again.');
      return;
    }

    setInfo(result.message || '6-digit verification code sent to your email.');
    setStep('verify');
    setResendTimer(30);
  };

  const handleVerifyCode = useCallback(
    async (submittedCode: string) => {
      setError('');
      if (!/^\d{6}$/.test(submittedCode)) {
        setError('Please enter the 6-digit verification code.');
        return;
      }

      setLoading(true);
      setSubmitStatus('Verifying verification code…');

      try {
        const result = await verifyOtpAndLogin(email.trim(), submittedCode, {
          fullName: fullName.trim(),
          phone: phone.trim(),
          acceptedDocuments: Object.keys(LEGAL_DOCUMENTS),
        });

        if (!result.success) {
          setLoading(false);
          setError(result.error || 'Verification failed. Check the code and try again.');
          setCode('');
          return;
        }

        setSubmitStatus('Setting up your institutional trading account…');

        // Record legal consent silently
        await Promise.all([
          ...REQUIRED_PURPOSES.map((p) => setConsent(p, true)),
          acceptLegalDocuments(Object.keys(LEGAL_DOCUMENTS)),
        ]);

        // Clear local storage draft on success
        try {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        } catch {}

        setSubmitStatus('Account Ready!');
        setStep('celebrate');
        setLoading(false);
      } catch (err: any) {
        setLoading(false);
        setError(err?.message || 'Failed to complete registration.');
      }
    },
    [email, fullName, phone, verifyOtpAndLogin, setConsent, acceptLegalDocuments]
  );

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setError('');
    setInfo('');
    setLoading(true);
    const result = await requestOtp(email.trim(), 'email', 'email_verify');
    setLoading(false);

    if (result.success) {
      setInfo('New 6-digit code dispatched to your email.');
      setResendTimer(30);
    } else {
      setError(result.error || 'Could not resend code. Please wait a moment.');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-8 sm:py-12 bg-[#070b12] text-white select-none">
      <div className="w-full max-w-md space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <BrandLogo size="lg" />
          </div>
          <p className="text-xs text-slate-400 font-mono">
            Direct Institutional FX & CFD Trading Gateway
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-[#0f172a] p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
          
          {/* STEP 1: SIMPLE DETAILS */}
          {step === 'details' && (
            <div className="space-y-5">
              <div className="space-y-1">
                <h2 className="text-lg font-black text-white tracking-tight">Create your account</h2>
                <p className="text-xs text-slate-400">
                  Fill in your details below to get started in 30 seconds.
                </p>
              </div>

              {paramEmail && (
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>We noticed you don&apos;t have an account yet. Complete your profile below to open your account.</span>
                </div>
              )}

              {alreadyRegisteredError && (
                <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-200 text-xs space-y-2.5">
                  <div className="flex items-center gap-1.5 font-bold text-sky-400">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Account already exists with this email</span>
                  </div>
                  <p className="text-slate-300 text-[11px]">
                    Please sign in to access your existing account and portfolio.
                  </p>
                  <Link
                    href={`/login?${new URLSearchParams({
                      ...(email ? { email: email.trim() } : {}),
                      ...(phone ? { phone: phone.trim() } : {}),
                      ...(nextPath ? { next: nextPath } : {}),
                    }).toString()}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs transition-all"
                  >
                    <span>Sign in to your account</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleRequestOtp} className="space-y-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">Your Full Legal Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      autoFocus
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full bg-[#080d14] border border-slate-700/80 rounded-2xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-sans"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. trader@example.com"
                      className="w-full bg-[#080d14] border border-slate-700/80 rounded-2xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-sans"
                    />
                  </div>
                </div>

                {/* Mobile Phone */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-300">Mobile Phone Number</label>
                    <span className="text-[10px] text-slate-500 font-mono">(Optional)</span>
                  </div>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full bg-[#080d14] border border-slate-700/80 rounded-2xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-sans"
                    />
                  </div>
                </div>

                {/* Compact Legal Disclaimer */}
                <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                  By clicking Continue, you agree to Global Forex&apos;s{' '}
                  <Link href="/legal" className="text-emerald-400 hover:underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-emerald-400 hover:underline">
                    Privacy Policy
                  </Link>.
                </p>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-black text-xs transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
                      <span>Sending 6-digit code…</span>
                    </>
                  ) : (
                    <>
                      <span>Continue to Verification</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* STEP 2: 6-DIGIT OTP VERIFICATION WITH QUICK EDIT PILL */}
          {step === 'verify' && (
            <div className="space-y-5 animate-scale-in">
              <div className="space-y-1 text-center">
                <h2 className="text-lg font-black text-white tracking-tight">Enter Verification Code</h2>
                <p className="text-xs text-slate-400">
                  We sent a 6-digit code to:
                </p>
                
                {/* 1-Tap Inline Edit Pill */}
                <div className="pt-1 flex items-center justify-center gap-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#080d14] border border-slate-700 text-xs font-mono text-emerald-400">
                    <span>{email}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setStep('details');
                        setCode('');
                        setError('');
                      }}
                      className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px] font-sans font-bold hover:underline cursor-pointer"
                      title="Edit email address"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>
              </div>

              {info && (
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs text-center font-mono">
                  {info}
                </div>
              )}

              {error && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* 6-Box Auto-Advancing OTP Input */}
              <div className="py-2">
                <DigitOtpInput
                  value={code}
                  disabled={loading}
                  onChange={(val) => {
                    setCode(val);
                    setError('');
                  }}
                  onComplete={(val) => {
                    void handleVerifyCode(val);
                  }}
                />
              </div>

              {/* Submitting Loading Feedback */}
              {loading && (
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-center gap-2 font-bold animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                  <span>{submitStatus}</span>
                </div>
              )}

              {/* Resend Timer & Button */}
              <div className="pt-2 flex flex-col items-center gap-2">
                {resendTimer > 0 ? (
                  <span className="text-xs text-slate-500 font-mono">
                    Resend code in <strong className="text-slate-300">0:{resendTimer < 10 ? `0${resendTimer}` : resendTimer}s</strong>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={loading}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 cursor-pointer hover:underline"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Resend 6-Digit Code</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setStep('details');
                    setCode('');
                    setError('');
                  }}
                  className="text-xs text-slate-500 hover:text-slate-300 pt-2"
                >
                  ← Back to change details
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: CELEBRATORY WELCOME SCREEN */}
          {step === 'celebrate' && (
            <div className="space-y-6 py-4 text-center animate-scale-in">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/40">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-bounce" />
              </div>

              <div className="space-y-1.5">
                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                  Account Active & Ready
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  Welcome to Global Forex, {fullName.split(' ')[0]}!
                </h2>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Your institutional trading profile is configured with instant demo simulation margin.
                </p>
              </div>

              {/* Demo Account Balance Badge */}
              <div className="p-4 rounded-2xl bg-[#080d14] border border-slate-800 flex items-center justify-between text-left">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono font-bold block">Demo Trading Margin:</span>
                  <strong className="text-lg font-black text-emerald-400 font-mono">$10,000.00 USD</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    openOnboardingChoice();
                    if (nextPath && nextPath.startsWith('/')) {
                      router.push(nextPath);
                    } else {
                      router.push('/dashboard');
                    }
                  }}
                  className="w-full py-3.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-black text-xs transition-all shadow-xl active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Open Trading Desk</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <Link
                  href="/kyc"
                  className="block text-center text-xs text-slate-400 hover:text-emerald-400 font-bold py-1 transition-colors"
                >
                  Complete KYC for Live INR Deposits →
                </Link>
              </div>
            </div>
          )}

          {/* Bottom Sign-In Link */}
          {step !== 'celebrate' && (
            <p className="text-center text-xs text-slate-400 pt-3 border-t border-slate-800/80">
              Already have an account?{' '}
              <Link
                href={`/login?${new URLSearchParams({
                  ...(email ? { email: email.trim() } : {}),
                  ...(phone ? { phone: phone.trim() } : {}),
                  ...(nextPath ? { next: nextPath } : {}),
                }).toString()}`}
                className="text-emerald-400 font-bold hover:underline"
              >
                Sign in here
              </Link>
            </p>
          )}

        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#070b12]">
          <div className="text-xs text-slate-500 font-mono">Loading Global Forex Portal…</div>
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
