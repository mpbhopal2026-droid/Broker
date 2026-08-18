import React from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { LEGAL_VERSIONS } from '@/lib/legal';

export const metadata = {
  title: 'Risk Disclosure Statement | Global Forex',
  description: 'Statutory risk disclosure for leveraged trading products.',
};

/**
 * Risk Disclosure.
 *
 * This is a template drafted to cover the standard disclosure points. It has
 * not been reviewed by a lawyer and is not a substitute for advice from Indian
 * counsel familiar with SEBI and FEMA requirements. Have it reviewed before
 * onboarding real clients.
 */
export default function RiskDisclosurePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <Link href="/dashboard" className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Back
        </Link>
        <div className="flex items-center gap-2 text-rose-400 mb-2">
          <AlertTriangle className="w-6 h-6" aria-hidden="true" />
          <h1 className="text-2xl sm:text-3xl font-black text-white">Risk Disclosure Statement</h1>
        </div>
        <p className="text-xs text-slate-400">
          Version {LEGAL_VERSIONS.risk_disclosure} · Read this in full before trading
        </p>
      </div>

      <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/40 space-y-3">
        <h2 className="text-sm font-black text-rose-300 uppercase tracking-wide">You can lose all of your money</h2>
        <p className="text-sm text-rose-100/90 leading-relaxed">
          Trading leveraged products such as forex, contracts for difference and commodity
          derivatives carries a high level of risk. Losses can exceed your initial deposit.
          Across the industry, the large majority of retail accounts lose money. Do not trade
          with funds you cannot afford to lose entirely.
        </p>
      </div>

      <section className="space-y-6 text-sm text-slate-300 leading-relaxed">
        <div className="space-y-2">
          <h2 className="text-base font-bold text-white">1. Leverage works against you too</h2>
          <p>
            Leverage multiplies both gains and losses. A position opened with 1:100 leverage
            moves 100 times faster than the underlying market relative to your capital. A market
            move of 1% against a fully leveraged position can eliminate your entire margin.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-base font-bold text-white">2. Markets can gap</h2>
          <p>
            Prices can jump without trading at the levels in between, particularly around news
            events, weekends and market opens. A stop-loss order does not guarantee execution at
            your chosen price and may be filled significantly worse.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-base font-bold text-white">3. No guaranteed returns</h2>
          <p>
            No one can promise you a profit. Any projected return, expected ROI figure or
            profit calculator output is an illustration only and is not a forecast. Past
            performance does not indicate future results. If anyone guarantees you returns,
            treat it as a warning sign of fraud.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-base font-bold text-white">4. Regulatory status</h2>
          <p>
            Indian residents should be aware that foreign exchange transactions are governed by
            the Foreign Exchange Management Act, 1999 (FEMA). Trading in currency pairs and on
            platforms not permitted under FEMA and RBI directions may be unlawful. The Reserve
            Bank of India publishes an Alert List of entities not authorised to deal in forex.
            Investment advice in India requires registration with SEBI. Satisfy yourself as to
            the regulatory status of any platform, including this one, before depositing funds.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-base font-bold text-white">5. Currency conversion risk</h2>
          <p>
            Deposits made in Indian Rupees are converted to US Dollars at the rate shown at the
            time of crediting. Withdrawals are converted back. Movements in the USD/INR rate
            between deposit and withdrawal will affect the rupee amount you receive, independent
            of your trading performance.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-base font-bold text-white">6. Counterparty and operational risk</h2>
          <p>
            Your funds are held with the platform operator rather than in an exchange-settled
            account. You are exposed to the operator's solvency and conduct. Technical failures,
            connectivity loss and system outages may prevent you from opening or closing
            positions when you want to.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-base font-bold text-white">7. Tax</h2>
          <p>
            Gains may be taxable in your jurisdiction. You are responsible for your own tax
            reporting and payment. We do not provide tax advice.
          </p>
        </div>
      </section>

      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-400 leading-relaxed">
        <strong className="text-slate-200 block mb-1">Not personal advice</strong>
        Nothing in this platform constitutes personal investment advice or a recommendation that
        any particular transaction is suitable for you. Decide for yourself, and seek independent
        advice from a SEBI-registered adviser if you are unsure.
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/legal/accept"
          className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
        >
          Continue to acceptance
        </Link>
        <Link href="/grievance" className="text-xs text-slate-400 hover:text-white">
          Raise a complaint
        </Link>
      </div>
    </div>
  );
}
