'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Mail,
  Phone,
  ShieldCheck,
  TrendingUp,
  Headphones,
  ArrowRight,
  Check,
  Globe,
  BarChart2,
  Zap,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ArrowLeft
} from 'lucide-react';
import { useApp } from '@/lib/store';

function GlobalForexBrandLogo({ className = "h-9" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="relative w-9 h-9 shrink-0 flex items-center justify-center">
        <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Globe Circle Background */}
          <circle cx="22" cy="22" r="18" stroke="#1e40af" strokeWidth="2.4" fill="#eff6ff" />
          <ellipse cx="22" cy="22" rx="9" ry="18" stroke="#3b82f6" strokeWidth="1.6" />
          <line x1="4" y1="22" x2="40" y2="22" stroke="#3b82f6" strokeWidth="1.6" />
          <line x1="7" y1="13" x2="37" y2="13" stroke="#93c5fd" strokeWidth="1.2" />
          <line x1="7" y1="31" x2="37" y2="31" stroke="#93c5fd" strokeWidth="1.2" />
          {/* Ascending Green Growth Bars & Arrow */}
          <rect x="11" y="27" width="2.4" height="6" rx="0.5" fill="#00875a" />
          <rect x="17" y="21" width="2.4" height="12" rx="0.5" fill="#00875a" />
          <rect x="23" y="24" width="2.4" height="9" rx="0.5" fill="#00875a" />
          <rect x="29" y="15" width="2.4" height="18" rx="0.5" fill="#00875a" />
          <path d="M12 28L18 22L24 25L34 13" stroke="#00875a" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M28 13H34V19" stroke="#00875a" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="flex flex-col leading-none text-left">
        <span className="text-xl font-black tracking-tight text-[#0f2942]">GLOBAL</span>
        <div className="flex items-center justify-between text-[8.5px] font-extrabold tracking-[0.28em] text-[#00875a] mt-0.5">
          <span>—</span><span>FOREX</span><span>—</span>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { requestOtp, verifyOtpAndLogin, showToast } = useApp();

  const [channel, setChannel] = useState<'email' | 'sms'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [otpSent, setOtpSent] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  const nextPath = searchParams.get('next');
  const paramEmail = searchParams.get('email');
  const paramPhone = searchParams.get('phone');

  useEffect(() => {
    if (paramEmail && !email) setEmail(paramEmail);
    if (paramPhone && !phone) {
      setPhone(paramPhone);
      setChannel('sms');
    }
  }, [paramEmail, paramPhone, email, phone]);

  // Resend countdown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((t) => Math.max(t - 1, 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');

    const targetIdentifier = channel === 'sms' ? phone.trim() : email.trim();
    if (!targetIdentifier) {
      setError(channel === 'sms' ? 'Please enter your mobile phone number.' : 'Please enter your email address.');
      return;
    }

    setLoading(true);
    const result = await requestOtp(targetIdentifier, channel, 'login');
    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Could not send verification code.');
      return;
    }

    if (result.userExists === false) {
      setInfo('No account found for this address. Forwarding to quick registration…');
      const q = new URLSearchParams({
        ...(email ? { email: email.trim() } : {}),
        ...(phone ? { phone: phone.trim() } : {}),
        ...(nextPath ? { next: nextPath } : {}),
      });
      setTimeout(() => {
        router.push(`/register?${q.toString()}`);
      }, 600);
      return;
    }

    setOtpSent(true);
    setResendTimer(30);
    setInfo(result.message || 'Verification code dispatched.');
  };

  const handleResend = async () => {
    if (resendTimer > 0 || loading) return;
    setError('');
    setLoading(true);
    const targetIdentifier = channel === 'sms' ? phone.trim() : email.trim();
    const result = await requestOtp(targetIdentifier, channel, 'login');
    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Could not resend code.');
      return;
    }

    setResendTimer(30);
    setInfo('A fresh 6-digit code has been sent.');
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!code || code.trim().length < 6) {
      setError('Please enter the full 6-digit code.');
      return;
    }

    setLoading(true);
    const targetIdentifier = channel === 'sms' ? phone.trim() : email.trim();
    const result = await verifyOtpAndLogin(targetIdentifier, code.trim(), {}, channel);
    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Invalid or expired verification code.');
      return;
    }

    showToast({
      type: 'success',
      title: 'Welcome Back',
      message: 'Signed in successfully.',
    });

    if (result.role === 'admin' && (!nextPath || nextPath === '/dashboard')) {
      router.push('/admin');
    } else {
      router.push(nextPath || '/dashboard');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] flex flex-col justify-between relative overflow-hidden font-sans select-none text-slate-800">
      
      {/* Decorative Wave & Candlestick Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Soft green abstract background wave */}
        <svg
          className="absolute -bottom-24 -left-20 w-[650px] sm:w-[850px] opacity-40 text-emerald-100"
          viewBox="0 0 800 600"
          fill="none"
        >
          <path
            d="M0 450 C 200 350, 350 550, 550 420 C 700 320, 750 480, 850 400 L 850 600 L 0 600 Z"
            fill="url(#greenWaveGrad)"
          />
          <defs>
            <linearGradient id="greenWaveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a7f3d0" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#00875a" stopOpacity="0.4" />
            </linearGradient>
          </defs>
        </svg>

        {/* Faint Candlestick Chart Silhouette Watermark in Center */}
        <svg
          className="absolute top-1/3 left-1/4 w-[500px] h-[300px] opacity-[0.12] text-emerald-600 hidden md:block"
          viewBox="0 0 500 300"
          fill="none"
        >
          <rect x="50" y="140" width="16" height="70" rx="2" fill="currentColor" />
          <line x1="58" y1="110" x2="58" y2="230" stroke="currentColor" strokeWidth="3" />
          <rect x="90" y="100" width="16" height="90" rx="2" fill="currentColor" />
          <line x1="98" y1="80" x2="98" y2="210" stroke="currentColor" strokeWidth="3" />
          <rect x="130" y="70" width="16" height="110" rx="2" fill="currentColor" />
          <line x1="138" y1="50" x2="138" y2="200" stroke="currentColor" strokeWidth="3" />
          <rect x="170" y="50" width="16" height="130" rx="2" fill="currentColor" />
          <line x1="178" y1="30" x2="178" y2="200" stroke="currentColor" strokeWidth="3" />
          <path d="M58 170 Q 110 110 178 90 T 260 50" stroke="currentColor" strokeWidth="3" strokeDasharray="6 6" />
        </svg>
      </div>

      {/* Main Content Split Layout */}
      <div className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-12 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* ═══════════════════════════════════════════════════════════════
              LEFT SIDE: BRAND HERO & INSTITUTIONAL PILLARS
             ═══════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-7 space-y-6 sm:space-y-8 pr-0 lg:pr-6">
            
            {/* Top Brand Logo */}
            <Link href="/" className="inline-block">
              <GlobalForexBrandLogo />
            </Link>

            {/* Main Headline */}
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-5xl lg:text-[54px] font-black text-slate-900 tracking-tight leading-[1.12]">
                Trade <span className="text-[#00875a]">Global.</span><br />
                Grow <span className="text-[#00875a]">Consistently.</span>
              </h1>
              <p className="text-sm sm:text-base text-slate-600 max-w-lg leading-relaxed font-normal">
                Powerful platforms, tight spreads and unmatched reliability to help you trade the world's markets with confidence.
              </p>
            </div>

            {/* 3 Feature Pillars */}
            <div className="space-y-4 pt-2">
              
              {/* Pillar 1: Secure & Trusted */}
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-[#e6f4ea] text-[#00875a] flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">Secure & Trusted</h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Bank-grade security with passwordless OTP authentication.
                  </p>
                </div>
              </div>

              {/* Pillar 2: Advanced Trading */}
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-[#e6f4ea] text-[#00875a] flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  <TrendingUp className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">Advanced Trading</h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Trade Forex, Commodities, Indices and more with professional tools.
                  </p>
                </div>
              </div>

              {/* Pillar 3: 24/7 Support */}
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-[#e6f4ea] text-[#00875a] flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  <Headphones className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">24/7 Support</h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Our dedicated support team is always here to help you.
                  </p>
                </div>
              </div>

            </div>

          </div>

          {/* ═══════════════════════════════════════════════════════════════
              RIGHT SIDE: FLOATING AUTHENTICATION CARD
             ═══════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-5 w-full flex justify-center lg:justify-end">
            <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-slate-100/90 text-center relative">
              
              {/* Card Brand Header */}
              <div className="flex justify-center mb-4">
                <GlobalForexBrandLogo className="scale-90" />
              </div>

              {!otpSent ? (
                /* ── STEP 1: ENTER EMAIL / PHONE ── */
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                      Welcome Back!
                    </h2>
                    <p className="text-xs text-slate-500">
                      Sign in to your Global Forex account
                    </p>
                    {/* Decorative Green Accent Bar */}
                    <div className="w-10 h-0.5 bg-[#00875a] rounded-full mx-auto my-2" />
                  </div>

                  {/* Channel Switcher (Email Address vs Mobile Number) */}
                  <div className="grid grid-cols-2 p-1 bg-[#f1f5f9] rounded-xl text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => {
                        setChannel('email');
                        setError('');
                      }}
                      className={`py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                        channel === 'email'
                          ? 'bg-[#00875a] text-white shadow-xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Mail className="w-4 h-4" />
                      <span>Email Address</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setChannel('sms');
                        setError('');
                      }}
                      className={`py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                        channel === 'sms'
                          ? 'bg-[#00875a] text-white shadow-xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Phone className="w-4 h-4" />
                      <span>Mobile Number</span>
                    </button>
                  </div>

                  {/* Errors & Notice Alerts */}
                  {error && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 text-left">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {info && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2 text-left">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{info}</span>
                    </div>
                  )}

                  {/* Input Form */}
                  <form onSubmit={handleSendOtp} className="space-y-3.5 text-left">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        {channel === 'email' ? 'Email Address' : 'Mobile Number'}
                      </label>

                      {channel === 'email' ? (
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="email"
                            required
                            autoFocus
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="trader@example.com"
                            className="w-full bg-white border border-slate-200 focus:border-[#00875a] focus:ring-1 focus:ring-[#00875a] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors outline-none"
                          />
                        </div>
                      ) : (
                        <div className="relative">
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="tel"
                            required
                            autoFocus
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+91 98765 43210"
                            className="w-full bg-white border border-slate-200 focus:border-[#00875a] focus:ring-1 focus:ring-[#00875a] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors outline-none"
                          />
                        </div>
                      )}
                    </div>

                    {/* Remember Me & Forgot Link */}
                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="w-4 h-4 rounded text-[#00875a] focus:ring-[#00875a] border-slate-300 accent-[#00875a]"
                        />
                        <span className="text-slate-600 font-medium">Remember me</span>
                      </label>

                      <a
                        href="/support"
                        className="text-[#00875a] font-semibold hover:underline"
                      >
                        {channel === 'email' ? 'Forgot your email?' : 'Need phone help?'}
                      </a>
                    </div>

                    {/* Main Submit Action */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 px-4 rounded-xl bg-[#00875a] hover:bg-[#00734c] text-white font-bold text-sm shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Sending Verification Code…</span>
                        </>
                      ) : (
                        <>
                          <span>Continue to Sign In</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>

                  {/* Or Divider */}
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-white px-3 text-slate-400 font-medium">or</span>
                    </div>
                  </div>

                  {/* Google Sign In Button */}
                  <button
                    type="button"
                    onClick={() => {
                      showToast({
                        type: 'info',
                        title: 'Google OAuth',
                        message: 'Sign in with your registered email to continue.',
                      });
                    }}
                    className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs flex items-center justify-center gap-2.5 transition-colors"
                  >
                    <GoogleIcon />
                    <span>Continue with Google</span>
                  </button>

                  {/* Registration Link */}
                  <div className="pt-2 text-xs text-slate-500">
                    New here?{' '}
                    <Link
                      href="/register"
                      className="text-[#00875a] font-bold hover:underline inline-flex items-center gap-1"
                    >
                      <span>Create an account</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>

                </div>
              ) : (
                /* ── STEP 2: 6-DIGIT OTP VERIFICATION ── */
                <div className="space-y-4 text-left">
                  <div className="text-center space-y-1">
                    <h2 className="text-xl font-bold text-slate-900">Enter Verification Code</h2>
                    <p className="text-xs text-slate-500">
                      We sent a 6-digit code to{' '}
                      <strong className="text-slate-900 font-medium">
                        {channel === 'sms' ? phone : email}
                      </strong>
                    </p>
                    <div className="w-10 h-0.5 bg-[#00875a] rounded-full mx-auto my-2" />
                  </div>

                  {error && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {info && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{info}</span>
                    </div>
                  )}

                  <form onSubmit={handleVerify} className="space-y-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700 text-center">
                        Enter 6-Digit OTP Code
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        autoFocus
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="••••••"
                        className="w-full text-center text-2xl font-bold tracking-[0.4em] py-3 bg-slate-50 border border-slate-200 focus:border-[#00875a] focus:bg-white rounded-xl outline-none transition-colors"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || code.length < 6}
                      className="w-full py-3 px-4 rounded-xl bg-[#00875a] hover:bg-[#00734c] disabled:opacity-50 text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Verifying & Signing In…</span>
                        </>
                      ) : (
                        <>
                          <span>Verify & Continue</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>

                  {/* Resend & Change Identifier */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 text-slate-500">
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setCode('');
                        setError('');
                      }}
                      className="text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Edit {channel === 'sms' ? 'Phone' : 'Email'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resendTimer > 0 || loading}
                      className={`font-semibold ${
                        resendTimer > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-[#00875a] hover:underline'
                      }`}
                    >
                      {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          BOTTOM FOOTER STRIP: COPYRIGHT + 4 VALUE PILLS
         ═══════════════════════════════════════════════════════════════ */}
      <footer className="relative z-10 border-t border-slate-200/80 bg-white/80 backdrop-blur-xs py-3 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          
          {/* Copyright */}
          <div className="text-[11px] text-slate-500">
            © {new Date().getFullYear()} Global Forex. All rights reserved.
          </div>

          {/* 4 Trust Metrics Badges */}
          <div className="flex items-center gap-3 sm:gap-6 flex-wrap justify-center">
            
            {/* Metric 1: 1M+ */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#e6f4ea] text-[#00875a] flex items-center justify-center shrink-0">
                <Globe className="w-3.5 h-3.5" />
              </div>
              <div className="leading-tight text-left">
                <span className="font-bold text-slate-900 block text-xs">1M+</span>
                <span className="text-[10px] text-slate-500">Traders Worldwide</span>
              </div>
            </div>

            {/* Metric 2: 150+ */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#e6f4ea] text-[#00875a] flex items-center justify-center shrink-0">
                <BarChart2 className="w-3.5 h-3.5" />
              </div>
              <div className="leading-tight text-left">
                <span className="font-bold text-slate-900 block text-xs">150+</span>
                <span className="text-[10px] text-slate-500">Trading Instruments</span>
              </div>
            </div>

            {/* Metric 3: 0.0 Spreads */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#e6f4ea] text-[#00875a] flex items-center justify-center shrink-0">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <div className="leading-tight text-left">
                <span className="font-bold text-slate-900 block text-xs">0.0</span>
                <span className="text-[10px] text-slate-500">Tight Spreads From</span>
              </div>
            </div>

            {/* Metric 4: 24/7 Support */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#e6f4ea] text-[#00875a] flex items-center justify-center shrink-0">
                <Headphones className="w-3.5 h-3.5" />
              </div>
              <div className="leading-tight text-left">
                <span className="font-bold text-slate-900 block text-xs">24/7</span>
                <span className="text-[10px] text-slate-500">Customer Support</span>
              </div>
            </div>

          </div>

        </div>
      </footer>

    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center text-xs text-slate-500">
          Loading Sign In Portal…
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
