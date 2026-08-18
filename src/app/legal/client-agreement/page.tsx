import React from 'react';
import Link from 'next/link';
import { Handshake, ArrowLeft } from 'lucide-react';
import { LEGAL_VERSIONS } from '@/lib/legal';

export const metadata = {
  title: 'Client Agreement | Global Forex',
};

/**
 * Client Agreement — TEMPLATE. Requires legal review before use.
 */
export default function ClientAgreementPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <Link href="/dashboard" className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Back
        </Link>
        <div className="flex items-center gap-2 text-emerald-400 mb-2">
          <Handshake className="w-6 h-6" aria-hidden="true" />
          <h1 className="text-2xl sm:text-3xl font-black text-white">Client Agreement</h1>
        </div>
        <p className="text-xs text-slate-400">Version {LEGAL_VERSIONS.client_agreement}</p>
      </div>

      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-xs text-amber-200 leading-relaxed">
        <strong className="block text-amber-100 mb-1">Template — requires legal review</strong>
        Complete the bracketed fields and have this reviewed by Indian counsel before onboarding.
      </div>

      <section className="space-y-6 text-sm text-slate-300 leading-relaxed">
        <div className="space-y-2">
          <h2 className="text-base font-bold text-white">1. Nature of the relationship</h2>
          <p>
            You open and operate an account on an execution-only basis. We do not assess whether
            any transaction is suitable or appropriate for your circumstances, and we do not act
            as your adviser or fiduciary unless separately agreed in writing with a
            SEBI-registered entity.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-base font-bold text-white">2. Your declarations</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>The information and documents you give us are true, current and your own.</li>
            <li>The funds you deposit are yours and come from a lawful source.</li>
            <li>You are not acting on behalf of an undisclosed third party.</li>
            <li>You understand the risks set out in the Risk Disclosure Statement.</li>
            <li>You are not a person barred from trading under applicable law or sanctions.</li>
          </ul>
        </div>

        <div className="space-y-2">
          <h2 className="text-base font-bold text-white">3. Client funds</h2>
          <p>
            Client funds are held at [bank / custodian name] in [segregated / non-segregated]
            account(s). State clearly here whether client money is segregated from operating
            funds and under what protections, as this determines what happens to your balance if
            the operator becomes insolvent.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-base font-bold text-white">4. Fees and charges</h2>
          <p>
            Charges applicable to your account: [spreads, commissions, overnight financing,
            withdrawal fees, currency conversion margin]. All charges must be itemised here
            before an account is opened.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-base font-bold text-white">5. Conflicts of interest</h2>
          <p>
            Disclose here whether the operator takes the other side of client trades, and how
            conflicts between the operator&apos;s interests and yours are managed. Where an
            operator profits when clients lose, that must be stated plainly.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-base font-bold text-white">6. Records and statements</h2>
          <p>
            Every credit and debit to your wallet is recorded in an append-only ledger. You can
            view your full statement in the app and download a complete copy of your data at any
            time from the{' '}
            <Link href="/privacy" className="text-emerald-400 hover:underline">
              privacy portal
            </Link>
            .
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-base font-bold text-white">7. Termination</h2>
          <p>
            You may close your account at any time once open positions are settled and your
            balance is withdrawn. Records we are legally required to retain will be kept for the
            statutory period and then deleted or anonymised.
          </p>
        </div>
      </section>
    </div>
  );
}
