'use client';

import React from 'react';
import Link from 'next/link';
import { Clock, ShieldCheck, AlertTriangle, FileText, ArrowRight, FlaskConical } from 'lucide-react';
import { useApp } from '@/lib/store';

/**
 * Blocks money and live-trading screens until the account is verified.
 *
 * This is the UI half only — every money route re-checks KYC status server-side,
 * so removing this component in devtools grants nothing. It exists so a client
 * sees *why* a page is unavailable instead of hitting a rejection after filling
 * in a form.
 *
 * The demo account is always offered as the escape hatch: someone waiting on
 * verification should still be able to use the platform, and it costs nothing
 * to let them.
 */

type GateReason = 'not_submitted' | 'pending' | 'rejected' | 'terms' | null;

export const VerificationGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, pendingLegal, kycRecords, setAccountMode, isDemo, isLoaded } = useApp();

  if (!isLoaded || !currentUser) return <>{children}</>;

  // Operators are staff, not customers. KYC is a customer-identification duty
  // owed for people whose money we hold — an admin reviewing someone else's
  // documents has no balance and is not a client of the platform, so demanding
  // they verify their own identity to reach the review queue is circular: the
  // person who approves KYC would need their KYC approved first, and with no
  // operator able to reach /admin, nobody could ever approve anybody.
  const role = currentUser.role;
  if (role === 'admin' || role === 'staff' || role === 'developer') {
    return <>{children}</>;
  }

  const kycStatus = currentUser.kycStatus;
  const latestKyc = kycRecords[0];

  // One gate for the whole app, demo included. Verification is required before
  // any screen opens — a client submits KYC, waits, and on approval the entire
  // platform unlocks at once.
  //
  // Note this is stricter than AML rules require: the demo account moves no
  // real money, so it could have been opened earlier. Gating it too is a
  // deliberate product decision — a single door is simpler to explain to a
  // client than a partial one, and nobody starts building habits on an account
  // that might never be approved.
  const reason: GateReason =
    kycStatus === 'approved'
      ? null
      : kycStatus === 'pending'
        ? 'pending'
        : kycStatus === 'rejected'
          ? 'rejected'
          : 'not_submitted';

  if (!reason) return <>{children}</>;

  const content = {
    terms: {
      icon: <FileText className="w-7 h-7" aria-hidden="true" />,
      tone: 'sky' as const,
      title: 'Accept the terms to continue',
      body: 'Read and accept the Risk Disclosure, Client Agreement and Terms before funding your account.',
      cta: { href: '/legal/accept', label: 'Review documents' },
    },
    not_submitted: {
      icon: <ShieldCheck className="w-7 h-7" aria-hidden="true" />,
      tone: 'emerald' as const,
      title: 'Verify your identity first',
      body: 'Deposits, withdrawals and live trading open up once your identity documents are approved. It usually takes a few hours.',
      cta: { href: '/kyc', label: 'Start verification' },
    },
    pending: {
      icon: <Clock className="w-7 h-7" aria-hidden="true" />,
      tone: 'amber' as const,
      title: 'Verification in progress',
      body: 'Your documents are with our compliance desk. You will get an email and a notification as soon as they are reviewed — nothing more is needed from you right now.',
      cta: null,
    },
    rejected: {
      icon: <AlertTriangle className="w-7 h-7" aria-hidden="true" />,
      tone: 'rose' as const,
      title: 'Your documents need correction',
      body: latestKyc?.adminNotes || 'Please re-upload a clear photo showing the whole document.',
      cta: { href: '/kyc', label: 'Re-upload documents' },
    },
  }[reason];

  const tones = {
    sky: 'bg-sky-50 text-sky-600 border-sky-200',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    rose: 'bg-rose-50 text-rose-600 border-rose-200',
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 text-center space-y-4">
        <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center mx-auto ${tones[content.tone]}`}>
          {content.icon}
        </div>

        <div className="space-y-1.5">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">{content.title}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
            {content.body}
          </p>
        </div>

        {reason === 'pending' && (
          <ol className="flex items-center justify-center gap-2 text-[10px] font-bold pt-1">
            {['Submitted', 'In review', 'Approved'].map((step, i) => (
              <li key={step} className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded-full border ${
                    i <= 1
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-50 text-slate-400 border-slate-200'
                  }`}
                >
                  {step}
                </span>
                {i < 2 && <span className="text-slate-300" aria-hidden="true">→</span>}
              </li>
            ))}
          </ol>
        )}

        {content.cta && (
          <Link
            href={content.cta.href}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold"
          >
            {content.cta.label}
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        )}

        {/* No demo escape hatch. Verification is one door: a client completes
            KYC and waits, and nothing opens until it is approved. Offering the
            demo here let people start using the platform and building habits on
            an account that might never be approved, and it made the gate look
            optional. */}
      </div>
    </div>
  );
};
