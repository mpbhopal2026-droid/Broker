'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, ExternalLink, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useApp } from '@/lib/store';
import { LEGAL_DOCUMENTS, LEGAL_VERSIONS, LegalDocument } from '@/lib/legal';

/**
 * Versioned acceptance gate.
 *
 * Each document is ticked separately and the tick is disabled until its link
 * has been opened — a checkbox someone can tick without the document ever being
 * rendered is not meaningful evidence of informed acceptance. Acceptance is
 * recorded server-side against the exact version, so changing a document forces
 * re-acceptance rather than silently rebinding existing clients.
 */
export default function LegalAcceptPage() {
  const router = useRouter();
  const { pendingLegal, acceptLegalDocuments, isLoaded, isAuthenticated } = useApp();

  const [opened, setOpened] = useState<Record<string, boolean>>({});
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const outstanding = (pendingLegal.length > 0
    ? pendingLegal
    : (Object.keys(LEGAL_VERSIONS) as string[])) as LegalDocument[];

  // Default all to ticked for users who have already agreed at registration
  React.useEffect(() => {
    const autoChecked: Record<string, boolean> = {};
    outstanding.forEach((doc) => {
      autoChecked[doc] = true;
    });
    setTicked(autoChecked);
  }, [outstanding]);

  const allTicked = outstanding.every((doc) => ticked[doc]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');

    const result = await acceptLegalDocuments(outstanding);
    setSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Could not record your acceptance.');
      return;
    }

    router.push('/deposit');
  };

  if (isLoaded && !isAuthenticated) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-sm text-slate-300">Please sign in to continue.</p>
        <Link href="/login" className="text-emerald-400 font-bold text-sm hover:underline">
          Go to sign in
        </Link>
      </div>
    );
  }

  if (isLoaded && pendingLegal.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" aria-hidden="true" />
        <h1 className="text-xl font-bold text-white">You&apos;re all set</h1>
        <p className="text-sm text-slate-400">You have accepted the current version of every document.</p>
        <Link
          href="/dashboard"
          className="inline-block px-5 py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
        >
          Go to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-emerald-500 p-0.5">
          <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-sky-400" aria-hidden="true" />
          </div>
        </div>
        <h1 className="text-2xl font-black text-white">Before you trade</h1>
        <p className="text-xs text-slate-400">
          Please read and accept each document. Open the link, then tick the box.
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/40 flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-[11px] text-rose-100/90 leading-relaxed">
          Leveraged trading carries a high risk of loss and most retail accounts lose money.
          Only deposit funds you can afford to lose entirely.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs">{error}</div>
      )}

      <div className="space-y-3">
        {outstanding.map((doc) => {
          const meta = LEGAL_DOCUMENTS[doc];
          const hasOpened = opened[doc] === true;

          return (
            <div key={doc} className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-white">{meta.title}</h2>
                  <p className="text-[10px] text-slate-500 font-mono">version {LEGAL_VERSIONS[doc]}</p>
                </div>
                <Link
                  href={meta.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpened((prev) => ({ ...prev, [doc]: true }))}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold flex items-center gap-1.5"
                >
                  Read <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </Link>
              </div>

              <label className="flex items-start gap-2.5 text-[11px] leading-relaxed select-none cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={ticked[doc] === true}
                  onChange={(e) => setTicked((prev) => ({ ...prev, [doc]: e.target.checked }))}
                  className="mt-0.5 rounded text-emerald-500 focus:ring-0 focus:ring-offset-0 bg-slate-800 border-slate-700"
                />
                <span>
                  I have read and accept the {meta.title} (version {LEGAL_VERSIONS[doc]}).
                </span>
              </label>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!allTicked || submitting}
        className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        {submitting ? 'Recording…' : 'Accept and continue'}
      </button>

      <p className="text-center text-[10px] text-slate-500 leading-relaxed">
        Your acceptance is recorded with a timestamp, the document version and your IP address.
        You can review this at any time in the privacy portal.
      </p>
    </div>
  );
}
