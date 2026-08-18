'use client';

import React, { useState } from 'react';
import { UnifiedConsentModal } from './UnifiedConsentModal';

interface ConsentPanelProps {
  accepted: boolean;
  onAcceptedChange: (value: boolean) => void;
  optIns?: Record<string, boolean>;
  onOptInChange?: (purpose: string, value: boolean) => void;
}

export const ConsentPanel: React.FC<ConsentPanelProps> = ({
  accepted,
  onAcceptedChange,
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-slate-800">
            Terms, Privacy Policy & Risk Disclosure
          </span>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="text-[11px] font-bold text-emerald-600 hover:underline"
          >
            Read All Terms
          </button>
        </div>

        <label className="flex items-start gap-2.5 text-[11px] leading-relaxed text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => onAcceptedChange(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500"
          />
          <span>
            I agree to all Terms of Service, DPDP Privacy Policy, and Risk Disclaimers.{' '}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setModalOpen(true);
              }}
              className="text-emerald-600 font-bold hover:underline"
            >
              [View Document]
            </button>
          </span>
        </label>
      </div>

      <UnifiedConsentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        accepted={accepted}
        onAcceptAll={() => onAcceptedChange(true)}
      />
    </>
  );
};
