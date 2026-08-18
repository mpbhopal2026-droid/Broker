'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, ArrowRight, RefreshCw, X, Sparkles, CheckCircle2 } from 'lucide-react';

interface OtpModalProps {
  isOpen: boolean;
  targetEmailOrPhone: string;
  onSuccess: () => void;
  onCancel: () => void;
  title?: string;
  subtitle?: string;
}

export const OtpModal: React.FC<OtpModalProps> = ({
  isOpen,
  targetEmailOrPhone,
  onSuccess,
  onCancel,
  title = 'Two-Factor OTP Verification',
  subtitle = 'We have sent a 4-digit verification code to your device.'
}) => {
  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(60);
  const [resending, setResending] = useState(false);
  const [demoCode, setDemoCode] = useState('1234');
  const inputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  useEffect(() => {
    if (isOpen) {
      setDigits(['', '', '', '']);
      setError('');
      setTimer(60);
      setTimeout(() => inputRefs[0].current?.focus(), 150);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || timer <= 0) return;
    const interval = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(interval);
  }, [isOpen, timer]);

  if (!isOpen) return null;

  const handleChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const char = val.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);
    setError('');

    if (char && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    // Auto verify if all 4 entered
    if (char && index === 3) {
      const code = newDigits.join('');
      if (code === '1234' || code === demoCode) {
        onSuccess();
      } else {
        setError('Invalid OTP code. Please enter 1234 for demo.');
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handleAutoFill = () => {
    setDigits(['1', '2', '3', '4']);
    setTimeout(() => onSuccess(), 300);
  };

  const handleResend = () => {
    setResending(true);
    setTimeout(() => {
      setTimer(60);
      setResending(false);
      setDemoCode('1234');
    }, 800);
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length < 4) {
      setError('Please enter all 4 digits.');
      return;
    }
    if (code === '1234' || code === demoCode) {
      onSuccess();
    } else {
      setError('Invalid OTP code. Enter 1234 for instant verification.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="card-clean p-6 bg-slate-900 max-w-sm w-full space-y-5 border border-emerald-500/40 shadow-2xl animate-fadeIn">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
            <h3 className="font-bold text-white text-sm">{title}</h3>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-center space-y-1">
          <p className="text-xs text-slate-300">{subtitle}</p>
          <span className="text-xs font-mono font-bold text-emerald-400">{targetEmailOrPhone}</span>
        </div>

        {/* Demo Fast Hint */}
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
          <span className="font-mono">Demo OTP: <strong>1234</strong></span>
          <button
            type="button"
            onClick={handleAutoFill}
            className="text-[11px] font-bold text-emerald-400 hover:underline flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3" /> Auto-Fill
          </button>
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs text-center font-semibold">
            {error}
          </div>
        )}

        {/* 4 Digit Boxes */}
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="flex items-center justify-center gap-3">
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={inputRefs[idx]}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-12 h-14 text-center text-xl font-bold font-mono rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition-all"
              />
            ))}
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
          >
            Verify & Proceed <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Resend & Timer */}
        <div className="text-center text-xs text-slate-400">
          {timer > 0 ? (
            <span>Resend OTP in <strong className="text-white font-mono">{timer}s</strong></span>
          ) : (
            <button
              onClick={handleResend}
              disabled={resending}
              className="text-emerald-400 hover:underline font-bold flex items-center justify-center gap-1 mx-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
              Resend Code
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
