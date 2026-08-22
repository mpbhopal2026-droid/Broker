'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Mail,
  Phone,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  Headphones,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Pencil,
  Loader2,
  Lock,
  Sparkles,
  Zap,
  Globe
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { DigitOtpInput } from '@/components/auth/DigitOtpInput';
import { BrandLogo } from '@/components/ui/BrandLogo';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { requestOtp, verifyOtpAndLogin } = useApp();

  const [step, setStep] = useState<'input' | 'verify'>('input');
  const [channel, setChannel] = useState<'email' | 'sms'>('email');
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('Verifying code…');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  const nextPath = searchParams.get('next');
  const paramEmail = searchParams.get('email');
  const paramPhone = searchParams.get('phone');

  useEffect(() => {
    if (paramEmail && !identifier) {
      setChannel('email');
      setIdentifier(paramEmail);
    } else if (paramPhone && !identifier) {
      setChannel('sms');
      setIdentifier(paramPhone);
    }
  }, [paramEmail, paramPhone, identifier]);

  // Resend Countdown
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

    if (!identifier.trim()) {
      setError(channel === 'email' ? 'Please enter your email address.' : 'Please enter your mobile number.');
      return;
    }

    if (channel === 'email' && !identifier.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    const result = await requestOtp(identifier.trim(), channel, 'login');
    setLoading(false);

    if (!result.success) {
      if (result.notRegistered) {
        router.push(
          `/register?${new URLSearchParams({
            ...(channel === 'email' ? { email: identifier.trim() } : { phone: identifier.trim() }),
            ...(nextPath ? { next: nextPath } : {}),
          }).toString()}`
        );
        return;
      }
      setError(result.error || 'Could not send verification code. Please try again.');
      return;
    }

    setInfo(result.message || '6-digit verification code sent.');
    setStep('verify');
    setResendTimer(30);
  };

  const handleVerifyCode = useCallback(
    async (submittedCode: string) => {
      setError('');
      if (!/^\d{6}$/.test(submittedCode)) {
        setError('Please enter the 6-digit code.');
        return;
      }

      setLoading(true);
      setSubmitStatus('Verifying security token…');

      try {
        const result = await verifyOtpAndLogin(identifier.trim(), submittedCode);
        if (!result.success) {
          setLoading(false);
          setError(result.error || 'Verification failed. Check the code and try again.');
          setCode('');
          return;
        }

        setSubmitStatus('Entering Trading Desk…');

        if (nextPath && nextPath.startsWith('/') && !nextPath.startsWith('/login')) {
          router.push(nextPath);
        } else {
          router.push('/dashboard');
        }
      } catch (err: any) {
        setLoading(false);
        setError(err?.message || 'Failed to complete sign in.');
      }
    },
    [identifier, nextPath, router, verifyOtpAndLogin]
  );

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setError('');
    setInfo('');
    setLoading(true);
    const result = await requestOtp(identifier.trim(), channel, 'login');
    setLoading(false);

    if (result.success) {
      setInfo('New 6-digit code dispatched.');
      setResendTimer(30);
    } else {
      setError(result.error || 'Could not resend code. Please try again.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#070b12] text-white flex flex-col justify-center px-4 sm:px-8 py-8 sm:py-12 select-none">
      <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        
        {/* ═══════════════════════════════════════════════════════════════
            LEFT COLUMN: BRAND HERO & INSTITUTIONAL PILLARS (Desktop Only)
           ═══════════════════════════════════════════════════════════════ */}
        <div className="hidden lg:block lg:col-span-6 space-y-8 pr-4">
          <div className="inline-block">
            <BrandLogo size="lg" />
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl xl:text-5xl font-black text-white tracking-tight leading-[1.12]">
              Direct Institutional <br />
              <span className="text-emerald-400">Forex & CFD Gateway.</span>
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed max-w-md">
              Tight institutional spreads, zero-error domestic bank settlements, and direct market access across 50+ currency pairs, metals, and indices.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-[#0f172a] border border-slate-800/80">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Bank-Grade Passwordless Security</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Instant one-time security codes dispatched securely to your verified email or mobile.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-[#0f172a] border border-slate-800/80">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Instant UPI & Domestic Bank Settlement</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Deposit via instant UPI QR and receive fast RTGS/IMPS domestic payouts.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-[#0f172a] border border-slate-800/80">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">24/7 Dedicated Trading Desk</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Assigned dealing desk officers available around the clock.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            RIGHT COLUMN (Top on Mobile): FLOATING AUTHENTICATION CARD
           ═══════════════════════════════════════════════════════════════ */}
        <div className="w-full lg:col-span-6 max-w-md mx-auto">
          
          {/* Mobile Top Brand Header */}
          <div className="lg:hidden text-center space-y-2 mb-6">
            <div className="flex justify-center">
              <BrandLogo size="md" />
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Institutional Trading Gateway
            </p>
          </div>

          <div className="bg-[#0f172a] p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
            
            {/* STEP 1: ENTER IDENTIFIER */}
            {step === 'input' && (
              <div className="space-y-5">
                <div className="space-y-1 text-center">
                  <h2 className="text-lg font-black text-white tracking-tight">Sign in to your account</h2>
                  <p className="text-xs text-slate-400">
                    Enter your email or phone to receive a 6-digit access code
                  </p>
                </div>

                {/* Channel Switcher */}
                <div className="grid grid-cols-2 p-1 bg-[#080d14] rounded-2xl border border-slate-800 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setChannel('email');
                      setError('');
                    }}
                    className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      channel === 'email'
                        ? 'bg-emerald-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setChannel('sms');
                      setError('');
                    }}
                    className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      channel === 'sms'
                        ? 'bg-emerald-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Mobile</span>
                  </button>
                </div>

                {error && (
                  <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300">
                      {channel === 'email' ? 'Registered Email Address' : 'Mobile Phone Number'}
                    </label>
                    <div className="relative">
                      {channel === 'email' ? (
                        <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                      ) : (
                        <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                      )}
                      <input
                        type={channel === 'email' ? 'email' : 'tel'}
                        required
                        autoFocus
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder={channel === 'email' ? 'trader@example.com' : '+91 98765 43210'}
                        className="w-full bg-[#080d14] border border-slate-700/80 rounded-2xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-sans"
                      />
                    </div>
                  </div>

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
                        <span>Get Verification Code</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                <p className="text-center text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                  Don&apos;t have an account?{' '}
                  <Link
                    href={`/register?${new URLSearchParams({
                      ...(channel === 'email' && identifier ? { email: identifier.trim() } : {}),
                      ...(channel === 'sms' && identifier ? { phone: identifier.trim() } : {}),
                      ...(nextPath ? { next: nextPath } : {}),
                    }).toString()}`}
                    className="text-emerald-400 font-bold hover:underline"
                  >
                    Open an account
                  </Link>
                </p>
              </div>
            )}

            {/* STEP 2: 6-DIGIT OTP VERIFICATION */}
            {step === 'verify' && (
              <div className="space-y-5 animate-scale-in">
                <div className="space-y-1 text-center">
                  <h2 className="text-lg font-black text-white tracking-tight">Enter Verification Code</h2>
                  <p className="text-xs text-slate-400">
                    We sent a 6-digit code to:
                  </p>

                  <div className="pt-1 flex items-center justify-center gap-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#080d14] border border-slate-700 text-xs font-mono text-emerald-400">
                      <span>{identifier}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setStep('input');
                          setCode('');
                          setError('');
                        }}
                        className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px] font-sans font-bold hover:underline cursor-pointer"
                        title="Edit address"
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

                {/* 6-Box Segmented OTP Input */}
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

                {loading && (
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-center gap-2 font-bold animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                    <span>{submitStatus}</span>
                  </div>
                )}

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
                      setStep('input');
                      setCode('');
                      setError('');
                    }}
                    className="text-xs text-slate-500 hover:text-slate-300 pt-2"
                  >
                    ← Back to change {channel === 'email' ? 'email' : 'phone'}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#070b12]">
          <div className="text-xs text-slate-500 font-mono">Loading Global Forex Portal…</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
