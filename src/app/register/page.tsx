'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { TrendingUp, User, Mail, Phone, ShieldCheck, ArrowRight, KeyRound, AlertTriangle, Sparkles } from 'lucide-react';
import { useApp } from '@/lib/store';
import { ConsentPurpose, LEGAL_DOCUMENTS } from '@/lib/legal';
import { ConsentPanel } from '@/components/compliance/ConsentPanel';

const OPTIONAL_PURPOSES: ConsentPurpose[] = ['marketing_email', 'analytics'];
const REQUIRED_PURPOSES: ConsentPurpose[] = ['kyc_identity', 'account_operation', 'service_email'];

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { requestOtp, verifyOtpAndLogin, setConsent, acceptLegalDocuments, openOnboardingChoice } = useApp();

  const [step, setStep] = useState<'details' | 'verify'>('details');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');

  const [acceptedRequired, setAcceptedRequired] = useState(false);
  const [optIns, setOptIns] = useState<Record<string, boolean>>({ marketing_email: false, analytics: false });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [alreadyRegisteredError, setAlreadyRegisteredError] = useState(false);

  const nextPath = searchParams.get('next');
  const paramEmail = searchParams.get('email');
  const paramPhone = searchParams.get('phone');

  // Pre-fill from URL params (e.g. redirected from login)
  useEffect(() => {
    if (paramEmail && !email) setEmail(paramEmail);
    if (paramPhone && !phone) setPhone(paramPhone);
  }, [paramEmail, paramPhone, email, phone]);

  const handleDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setAlreadyRegisteredError(false);

    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      setError('Please complete all required fields.');
      return;
    }

    if (!/^[\p{L}\p{M}][\p{L}\p{M}\s.'-]*$/u.test(fullName.trim())) {
      setError('Enter your name as it appears on your PAN or Aadhaar — letters only.');
      return;
    }

    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) {
      setError('Enter a valid mobile number including the country code.');
      return;
    }
    if (!acceptedRequired) {
      setError('We need your consent for identity verification and account operation to open an account.');
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

      setError(result.error || 'Could not send the verification code.');
      return;
    }

    setInfo(result.message || 'Verification code sent. Check your inbox.');
    setStep('verify');
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from your email.');
      return;
    }

    setLoading(true);
    const result = await verifyOtpAndLogin(email, code, { fullName: fullName.trim(), phone: phone.trim() });

    if (!result.success) {
      setLoading(false);
      setError(result.error || 'Verification failed.');
      setCode('');
      return;
    }

    // Record consent and legal acceptance
    await Promise.all([
      ...REQUIRED_PURPOSES.map((p) => setConsent(p, true)),
      ...OPTIONAL_PURPOSES.map((p) => setConsent(p, optIns[p] === true)),
      acceptLegalDocuments(Object.keys(LEGAL_DOCUMENTS)),
    ]);

    setLoading(false);
    openOnboardingChoice();

    if (nextPath && nextPath.startsWith('/')) {
      router.push(nextPath);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-12 bg-[#f8fafc] text-slate-900 auth-page-clean">
      <div className="w-full max-w-lg space-y-6">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 space-y-6">
          
          <div className="text-center space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/logo-full.svg" alt="Global Forex" width={200} height={200} className="h-20 w-auto mx-auto rounded-2xl" />
            <h2 className="text-base font-bold text-slate-900">Create your Global Forex account</h2>
            <p className="text-xs text-slate-500">Fast digital verification for institutional FX & CFD trading</p>
          </div>

          {paramEmail && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>We noticed you don&apos;t have an account yet. Complete your profile below to open your account in 30 seconds.</span>
            </div>
          )}

          {alreadyRegisteredError && (
            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 text-xs space-y-2.5 text-left">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-4 h-4 text-blue-600 shrink-0" />
                <span>An account is already registered with this email address</span>
              </div>
              <p className="text-blue-800 text-[11px]">
                Please sign in to access your existing trading account and portfolio.
              </p>
              <Link
                href={`/login?${new URLSearchParams({
                  ...(email ? { email: email.trim() } : {}),
                  ...(phone ? { phone: phone.trim() } : {}),
                  ...(nextPath ? { next: nextPath } : {}),
                }).toString()}`}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-[#00875a] hover:bg-[#00704a] text-white font-bold text-xs transition-all shadow-xs"
              >
                <span>Sign In to Your Account</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {info && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs">
              {info}
            </div>
          )}

          {step === 'details' ? (
            <form onSubmit={handleDetails} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Full Legal Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="As shown on your PAN or Aadhaar"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="trader@example.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Mobile Phone Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <ConsentPanel
                  accepted={acceptedRequired}
                  onAcceptedChange={setAcceptedRequired}
                  optIns={optIns}
                  onOptInChange={(p: string, v: boolean) => setOptIns((prev) => ({ ...prev, [p]: v }))}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !acceptedRequired}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-1.5"
              >
                {loading ? (
                  <span>Sending verification code…</span>
                ) : (
                  <>
                    <span>Continue to Verification</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="text-center space-y-1">
                <p className="text-xs text-slate-600">
                  Enter the 6-digit code sent to <strong className="text-slate-900 font-mono">{email}</strong>:
                </p>
              </div>

              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  maxLength={6}
                  autoFocus
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-center font-mono text-lg tracking-widest text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-1.5"
              >
                {loading ? <span>Verifying & creating account…</span> : <span>Complete Registration</span>}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('details');
                  setCode('');
                  setError('');
                }}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-800"
              >
                ← Back to edit details
              </button>
            </form>
          )}

          <p className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
            Already have an account?{' '}
            <Link
              href={`/login?${new URLSearchParams({
                ...(email ? { email } : {}),
                ...(phone ? { phone } : {}),
                ...(nextPath ? { next: nextPath } : {})
              }).toString()}`}
              className="text-emerald-600 font-bold hover:underline"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-slate-50">
          <div className="text-xs text-slate-500 font-mono">Loading Registration Portal…</div>
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
