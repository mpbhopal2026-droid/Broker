import React from 'react';
import Link from 'next/link';
import { FileText, ArrowLeft } from 'lucide-react';
import { LEGAL_VERSIONS, GRIEVANCE_OFFICER } from '@/lib/legal';

export const metadata = {
  title: 'Terms of Service | Global Forex',
};

/**
 * Terms of Service — TEMPLATE.
 * Bracketed placeholders must be completed and the whole document reviewed by
 * Indian counsel before onboarding real clients.
 */
export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <Link href="/dashboard" className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Back
        </Link>
        <div className="flex items-center gap-2 text-sky-400 mb-2">
          <FileText className="w-6 h-6" aria-hidden="true" />
          <h1 className="text-2xl sm:text-3xl font-black text-white">Terms of Service</h1>
        </div>
        <p className="text-xs text-slate-400">Version {LEGAL_VERSIONS.terms}</p>
      </div>

      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-xs text-amber-200 leading-relaxed">
        <strong className="block text-amber-100 mb-1">Template — requires legal review</strong>
        This document contains placeholders and has not been settled by a lawyer. Complete the
        bracketed fields and have Indian counsel review it before accepting real clients.
      </div>

      <section className="space-y-6 text-sm text-slate-300 leading-relaxed">
        <div className="space-y-2">
          <h2 className="text-base font-bold text-white">1. Who we are</h2>
          <p>
            This platform is operated by [Legal entity name], [CIN / registration number],
            registered at {GRIEVANCE_OFFICER.address}. References to &quot;we&quot;, &quot;us&quot;
            and &quot;the platform&quot; mean that entity.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-base font-bold text-white">2. Eligibility</h2>
          <p>
            You must be at least 18 years old and legally capable of entering into contracts.
            You must complete identity verification (KYC) before depositing or withdrawing funds.
            We may refuse or close an account where verification cannot be completed.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-base font-bold text-white">3. Your account</h2>
          <p>
            You are responsible for keeping access to your registered email secure, since sign-in
            codes are delivered there. Tell us immediately if you suspect unauthorised access.
            We will never ask you for a sign-in code by phone, message or chat.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-base font-bold text-white">4. Deposits and withdrawals</h2>
          <p>
            Deposits are credited after we confirm receipt against the reference (UTR) you
            supply. The INR to USD rate applied is the rate published on the platform at the time
            of crediting. Withdrawals are paid only to a bank account held in your own name and
            matching your verified identity. We do not process third-party payouts.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-base font-bold text-white">5. No guaranteed returns</h2>
          <p>
            We do not guarantee profits. Any illustration, calculator or projected figure shown
            on the platform is hypothetical. See the{' '}
            <Link href="/legal/risk-disclosure" className="text-emerald-400 hover:underline">
              Risk Disclosure Statement
            </Link>
            .
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-base font-bold text-white">6. Prohibited use</h2>
          <p>
            You may not use the platform for money laundering, terrorist financing, fraud, or on
            behalf of another person without disclosure. We report suspicious activity to the
            authorities where required and may freeze an account pending investigation.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-base font-bold text-white">7. Suspension and closure</h2>
          <p>
            We may suspend or close an account where we are required to by law, where
            verification fails, or where we reasonably suspect fraud. Where we close an account
            without cause attributable to you, we will return your remaining balance to your
            verified bank account.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-base font-bold text-white">8. Liability</h2>
          <p>
            Nothing in these terms excludes liability that cannot lawfully be excluded, including
            liability for fraud. Subject to that, we are not liable for trading losses, or for
            losses arising from market conditions, connectivity failures or events outside our
            reasonable control.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-base font-bold text-white">9. Complaints</h2>
          <p>
            Raise complaints through the{' '}
            <Link href="/grievance" className="text-emerald-400 hover:underline">
              grievance page
            </Link>{' '}
            or by emailing {GRIEVANCE_OFFICER.email}. We aim to respond within{' '}
            {GRIEVANCE_OFFICER.responseDays} days.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-base font-bold text-white">10. Governing law</h2>
          <p>
            These terms are governed by the laws of India. Courts at [City], [State] have
            exclusive jurisdiction, without prejudice to any statutory consumer rights you have
            to bring proceedings elsewhere.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-base font-bold text-white">11. Changes</h2>
          <p>
            We may update these terms. Material changes carry a new version number and you will
            be asked to accept them before continuing to use the platform.
          </p>
        </div>
      </section>
    </div>
  );
}
