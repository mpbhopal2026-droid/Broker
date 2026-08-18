'use client';

import React, { useState } from 'react';
import { X, ShieldCheck, CheckCircle2, FileText, AlertTriangle, Lock } from 'lucide-react';

interface UnifiedConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  accepted?: boolean;
  onAcceptAll?: () => void;
}

export const UnifiedConsentModal: React.FC<UnifiedConsentModalProps> = ({
  isOpen,
  onClose,
  accepted = false,
  onAcceptAll,
}) => {
  const [isChecked, setIsChecked] = useState(accepted);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (onAcceptAll) {
      onAcceptAll();
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white max-w-2xl w-full rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Terms of Service, Privacy Policy & Risk Disclosure
              </h2>
              <p className="text-[11px] text-slate-500">
                Please review our combined legal terms and compliance notice.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Document Content in Simple Small Plain Text */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-600 leading-relaxed max-h-[60vh] divide-y divide-slate-100">
          
          {/* Section 1: Terms of Service */}
          <section className="space-y-2 pt-2 first:pt-0">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>1. Terms of Service & Account Operating Rules</span>
            </div>
            <p>
              By registering or accessing Global Forex, you agree to comply with all platform operating rules. Accounts must be maintained by verified identity owners. Any unauthorized attempt to manipulate market rates, execute fraudulent transactions, or submit falsified payment receipts will lead to immediate account suspension.
            </p>
            <p>
              Withdrawal requests are processed exclusively to verified bank accounts or UPI IDs matching your registered identity. Funds transferred via third-party bank accounts will be declined for regulatory compliance.
            </p>
          </section>

          {/* Section 2: DPDP Act 2023 Privacy Policy */}
          <section className="space-y-2 pt-4">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
              <Lock className="w-4 h-4 text-sky-600" />
              <span>2. Digital Personal Data Protection (DPDP Act 2023) Notice</span>
            </div>
            <p>
              We collect personal data including your full name, email address, phone number, and government identity numbers (PAN / Aadhaar / Passport) solely for identity verification, anti-money laundering (AML) compliance, and account operations.
            </p>
            <p>
              Your data is encrypted, stored securely, and processed in accordance with the Digital Personal Data Protection Act 2023. We never sell or share your personal information with unauthorized third parties for marketing purposes. You retain the right to request data updates or account deletion at any time from your profile settings.
            </p>
          </section>

          {/* Section 3: Leveraged Risk Disclaimer */}
          <section className="space-y-2 pt-4">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>3. Leveraged Trading Risk Disclosure</span>
            </div>
            <p>
              Trading foreign exchange (forex), precious metals, commodities, and leveraged contracts involves substantial financial risk and is not suitable for all investors. High leverage can work against you as well as for you, and price movements can result in rapid margin loss.
            </p>
            <p>
              You should never deposit or trade with funds you cannot afford to lose. All market analytical signals, news articles, and educational materials provided on this platform are for informational guidance only and do not constitute direct financial advice.
            </p>
          </section>

        </div>

        {/* Footer with Single Checkpoint */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 shrink-0 space-y-3">
          
          <label className="flex items-start gap-2.5 cursor-pointer text-xs font-semibold text-slate-800">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500"
            />
            <span>
              I have read, understood, and agree to all Terms of Service, DPDP Privacy Policy, and Risk Disclaimers.
            </span>
          </label>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-bold text-xs transition-all"
            >
              Close
            </button>
            <button
              type="button"
              disabled={!isChecked}
              onClick={handleConfirm}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Agree & Accept All Terms
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
