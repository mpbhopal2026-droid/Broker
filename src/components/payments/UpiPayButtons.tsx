'use client';

import React from 'react';
import { Smartphone, ExternalLink } from 'lucide-react';
import { buildAppSpecificLinks, type UpiLinkParams } from '@/lib/upi';

/**
 * Deep links into the payer's UPI app.
 *
 * On a phone this is the path people actually use — scanning a QR shown on the
 * same screen you are holding requires a second device. The generic `upi://`
 * intent is listed first because Android resolves it to whatever the user has
 * installed; the app-specific schemes are a fallback for handsets where the
 * chooser does not appear.
 *
 * Every link is built from the same UpiLinkParams as the QR and the printed
 * UPI ID, so all three routes lead to one payee. That is the property worth
 * protecting: a client who taps "PhonePe" and a client who scans the QR must
 * be paying the same account.
 *
 * Note the amount is a *suggestion*. UPI apps let the payer edit it, and no
 * callback tells us what was actually sent — which is exactly why the deposit
 * still requires a UTR and operator approval before any balance moves.
 */
export const UpiPayButtons: React.FC<{ params: UpiLinkParams | null }> = ({ params }) => {
  const links = params ? buildAppSpecificLinks(params) : null;
  if (!links) return null;

  const apps = [
    { key: 'gpay', label: 'Google Pay', href: links.gpay },
    { key: 'phonepe', label: 'PhonePe', href: links.phonepe },
    { key: 'paytm', label: 'Paytm', href: links.paytm },
  ];

  return (
    <div className="space-y-2">
      <a
        href={links.generic}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-bold text-xs active:scale-95 transition-transform"
      >
        <Smartphone className="w-4 h-4" aria-hidden="true" />
        Pay with any UPI app
      </a>

      <div className="grid grid-cols-3 gap-2">
        {apps.map((app) => (
          <a
            key={app.key}
            href={app.href}
            className="flex items-center justify-center gap-1 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-600 transition-colors"
          >
            {app.label}
            <ExternalLink className="w-2.5 h-2.5 opacity-50" aria-hidden="true" />
          </a>
        ))}
      </div>

      <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center leading-relaxed">
        Nothing is credited automatically. After paying, enter the UTR below so our
        desk can match it against the bank statement.
      </p>
    </div>
  );
};
