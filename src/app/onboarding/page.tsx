'use client';

import React from 'react';
import Link from 'next/link';
import {
  Check, Clock, Lock, ArrowRight, FlaskConical, ShieldCheck, AlertTriangle,
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { computeOnboarding, OnboardingStep } from '@/lib/onboarding';

/**
 * Guided onboarding.
 *
 * Progress is computed from server state rather than a stored step index, so it
 * survives a device change and cannot be skipped by editing local storage.
 *
 * Demo trading is offered prominently at every stage: a new user should be able
 * to see how the platform behaves before being asked for identity documents or
 * money, and it costs them nothing to try.
 */
export default function OnboardingPage() {
  const { currentUser, pendingLegal, kycRecords, transactions, isLoaded, setAccountMode } = useApp();

  const hasDeposited = transactions.some((t) => t.type === 'deposit' && t.status === 'completed');

  const progress = computeOnboarding({
    profile: currentUser,
    pendingLegal,
    kycRecords,
    hasDeposited,
  });

  if (!isLoaded) {
    return <div className="max-w-2xl mx-auto px-4 py-20 text-center text-sm text-slate-400">Loading…</div>;
  }

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="text-xl font-bold text-white">Create your account</h1>
        <p className="text-sm text-slate-400">Sign in to continue setting up.</p>
        <Link
          href="/register"
          className="inline-block px-6 py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
        >
          Get started
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <header className="space-y-3">
        <div>
          <h1 className="text-2xl font-black text-white">
            Welcome, {currentUser.fullName.split(' ')[0]}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {progress.isComplete
              ? 'Your account is fully set up.'
              : `${progress.completedCount} of ${progress.totalCount - 1} steps complete.`}
          </p>
        </div>

        <div
          className="h-1.5 rounded-full bg-slate-800 overflow-hidden"
          role="progressbar"
          aria-valuenow={progress.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Onboarding progress"
        >
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-sky-500 transition-all duration-500"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </header>

      {/* Try the demo — available from the very first visit */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
        <FlaskConical className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-amber-200">Try it first, with virtual money</h2>
          <p className="text-[11px] text-amber-100/80 mt-0.5 leading-relaxed">
            The demo account works right now — no documents, no deposit. Practise with
            $10,000 of virtual funds and real spreads before risking anything.
          </p>
          <Link
            href="/market"
            onClick={() => setAccountMode('demo')}
            className="inline-flex items-center gap-1 mt-2 px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-[11px] font-bold"
          >
            Open demo account <ArrowRight className="w-3 h-3" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <ol className="space-y-2.5">
        {progress.steps.map((step, index) => (
          <StepCard key={step.id} step={step} index={index} />
        ))}
      </ol>

      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Your documents are encrypted and only visible to our compliance team. You can
          download or delete your data at any time from the{' '}
          <Link href="/privacy" className="text-emerald-400 hover:underline">
            privacy portal
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function StepCard({ step, index }: { step: OnboardingStep; index: number }) {
  const isActionable = step.state === 'current';
  const isBlocked = step.state === 'blocked';

  const border =
    step.state === 'done'
      ? 'border-emerald-500/30 bg-emerald-500/5'
      : step.state === 'in_review'
        ? 'border-sky-500/30 bg-sky-500/5'
        : isActionable
          ? 'border-emerald-500/50 bg-slate-900'
          : 'border-slate-800 bg-slate-900/50';

  return (
    <li className={`p-4 rounded-2xl border transition-all ${border} ${isBlocked ? 'opacity-50' : ''}`}>
      <div className="flex items-start gap-3">
        <StepIcon state={step.state} index={index} />

        <div className="min-w-0 flex-1">
          <h3 className={`text-sm font-bold ${isBlocked ? 'text-slate-400' : 'text-white'}`}>
            {step.title}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{step.description}</p>

          {step.note && (
            <p
              className={`text-[11px] mt-1.5 flex items-start gap-1 ${
                step.state === 'in_review' ? 'text-sky-300' : 'text-amber-300'
              }`}
            >
              {step.state !== 'in_review' && (
                <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" aria-hidden="true" />
              )}
              {step.note}
            </p>
          )}

          {isActionable && (
            <Link
              href={step.href}
              className="inline-flex items-center gap-1 mt-2.5 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-bold transition-colors"
            >
              {step.cta} <ArrowRight className="w-3 h-3" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </li>
  );
}

function StepIcon({ state, index }: { state: OnboardingStep['state']; index: number }) {
  const base = 'w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[11px] font-black';

  if (state === 'done') {
    return (
      <span className={`${base} bg-emerald-500 text-slate-950`}>
        <Check className="w-4 h-4" aria-label="Completed" />
      </span>
    );
  }
  if (state === 'in_review') {
    return (
      <span className={`${base} bg-sky-500/20 text-sky-300 border border-sky-500/40`}>
        <Clock className="w-3.5 h-3.5" aria-label="In review" />
      </span>
    );
  }
  if (state === 'blocked') {
    return (
      <span className={`${base} bg-slate-800 text-slate-500`}>
        <Lock className="w-3.5 h-3.5" aria-label="Locked" />
      </span>
    );
  }
  return (
    <span
      className={`${base} ${
        state === 'current'
          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
          : 'bg-slate-800 text-slate-500'
      }`}
    >
      {index + 1}
    </span>
  );
}
