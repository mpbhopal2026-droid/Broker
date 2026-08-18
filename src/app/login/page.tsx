'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, KeyRound, ArrowRight, CheckCircle, ShieldAlert, Sparkles, AlertTriangle, Phone, RefreshCw } from 'lucide-react';
import { useApp } from '@/lib/store';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { requestOtp, verifyOtpAndLogin } = useApp();

  const [channel, setChannel] = useState<'email' | 'sms'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  const nextPath = searchParams.get('next');
  const denied = searchParams.get('denied');
  const paramEmail = searchParams.get('email');
  const paramPhone = searchParams.get('phone');
  const notice = searchParams.get('notice');

  useEffect(() => {
    if (paramEmail && !email) setEmail(paramEmail);
    if (paramPhone && !phone) setPhone(paramPhone);
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

    // Smart Check: User is NOT registered yet -> Seamlessly forward to registration with entered data!
    if (result.userExists === false) {
      setInfo('No account found for this address. Redirecting to quick registration…');
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
    setInfo(result.message || 'Verification code dispatched. Check your inbox.');
  };

  const handleResend = async () => {
    if (resendTimer > 0 || loading) return;
    setError('');
    setLoading(true);
    const result = await requestOtp(channel === 'sms' ? phone.trim() : email.trim(), channel, 'login');
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

    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code received.');
      return;
    }

    setLoading(true);
    const result = await verifyOtpAndLogin(channel === 'sms' ? phone.trim() : email.trim(), code, undefined, channel);
    setLoading(false);

    if (!result.success) {
      if ((result as { needsRegistration?: boolean }).needsRegistration) {
        const q = new URLSearchParams({
          ...(email ? { email: email.trim() } : {}),
          ...(phone ? { phone: phone.trim() } : {}),
          ...(nextPath ? { next: nextPath } : {}),
        });
        router.push(`/register?${q.toString()}`);
        return;
      }

      setError(result.error || 'Verification failed. Code may have expired.');
      setCode('');
      return;
    }

    if (nextPath && nextPath.startsWith('/')) {
      router.push(nextPath);
    } else {
      router.push(result.role === 'admin' ? '/admin' : '/dashboard');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-12 bg-[#f8fafc] text-slate-900 auth-page-clean">
      <div className="w-full max-w-md space-y-6">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 space-y-6 relative overflow-hidden">
          
          <div className="text-center space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/logo-full.svg" alt="Global Forex" width={200} height={200} className="h-20 w-auto mx-auto rounded-2xl" />
            <h2 className="text-base font-bold text-slate-900">Sign In to Global Forex</h2>
            <p className="text-xs text-slate-500">Secure passwordless OTP authentication</p>
          </div>

          {notice === 'existing_account' && (
            <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>An account already exists with your email. Sign in below with a quick OTP.</span>
            </div>
          )}

          {denied === 'admin' && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <span>That area is restricted to operators and administrators.</span>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-scale-in font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {info && !error && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-medium animate-fadeIn">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{info}</span>
            </div>
          )}

          {!otpSent ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200" role="group" aria-label="Sign-in method">
                {(['email', 'sms'] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setChannel(c)}
                    aria-pressed={channel === c}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                      channel === c
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {c === 'email' ? 'Email Address' : 'Mobile Number'}
                  </button>
                ))}
              </div>

              {channel === 'email' ? (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      autoFocus
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="trader@example.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Mobile Number</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      required
                      autoFocus
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-1.5"
              >
                {loading ? (
                  <span>Checking account & sending code…</span>
                ) : (
                  <>
                    <span>Continue to Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4 animate-scale-in">
              <div className="text-center space-y-1">
                <p className="text-xs text-slate-600">
                  Enter the 6-digit code sent to{' '}
                  <strong className="text-slate-900 font-mono">
                    {channel === 'sms' ? phone : email}
                  </strong>
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
                {loading ? <span>Verifying code…</span> : <span>Verify & Access Account</span>}
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setCode('');
                    setError('');
                  }}
                  className="text-slate-500 hover:text-slate-800"
                >
                  ← Change {channel === 'sms' ? 'phone' : 'email'}
                </button>

                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendTimer > 0 || loading}
                  className="text-emerald-600 font-bold hover:underline disabled:text-slate-400 disabled:no-underline"
                >
                  {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend code'}
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-xs text-slate-500">
            New here?{' '}
            <Link
              href={`/register?${new URLSearchParams({
                ...(email ? { email: email.trim() } : {}),
                ...(phone ? { phone: phone.trim() } : {}),
                ...(nextPath ? { next: nextPath } : {}),
              }).toString()}`}
              className="text-emerald-600 font-bold hover:underline"
            >
              Create an account →
            </Link>
          </p>

          <div id="risk-footnote" className="border-t border-slate-100 pt-4 space-y-2">
            <p className="text-[10px] text-slate-400 leading-relaxed">
              <span aria-hidden="true">*</span> Trading in forex and leveraged products carries a
              high risk of loss. Most retail accounts lose money. Only trade with funds you can
              afford to lose.
            </p>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              We will never ask for your sign-in code by phone, WhatsApp or chat. Anyone who does
              is attempting fraud.
            </p>
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
        <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-slate-50">
          <div className="text-xs text-slate-500 font-mono">Loading Sign In Portal…</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
