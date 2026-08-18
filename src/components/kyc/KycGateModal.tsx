'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/store';
import { ShieldAlert, Clock, ArrowRight, TrendingUp, X, CheckCircle2 } from 'lucide-react';

interface KycGateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KycGateModal: React.FC<KycGateModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const { currentUser, setAccountMode } = useApp();

  if (!isOpen) return null;

  const kycStatus = currentUser?.kycStatus || 'not_submitted';

  const handleGoToKyc = () => {
    onClose();
    router.push('/kyc');
  };

  const handleStayDemo = () => {
    setAccountMode('demo');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 text-center">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Status Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center border shadow-xs bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400">
          {kycStatus === 'pending' ? (
            <Clock className="w-8 h-8 animate-pulse" />
          ) : (
            <ShieldAlert className="w-8 h-8" />
          )}
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            {kycStatus === 'pending'
              ? 'Verification In Progress'
              : 'Mandatory KYC Required'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {kycStatus === 'pending'
              ? 'Your documents have been submitted and are currently under review by our compliance dealing desk. Live deposits will unlock once approved.'
              : 'To access Live Trading, deposit INR, and execute real-money orders, regulatory KYC identity verification is required by SEBI & AML compliance.'}
          </p>
        </div>

        {/* Key Requirements Checklist */}
        {kycStatus !== 'pending' && (
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-left space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>PAN Card verification</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Aadhaar address validation</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Bank account & UPI setup</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          {kycStatus !== 'pending' ? (
            <button
              onClick={handleGoToKyc}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <span>Complete KYC Verification</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleGoToKyc}
              className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <span>Check Verification Status</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handleStayDemo}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-2 transition-all"
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Continue in Demo Mode ($1,000 Balance)</span>
          </button>
        </div>

      </div>
    </div>
  );
};
