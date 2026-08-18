'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, Share, Plus, Smartphone } from 'lucide-react';

/**
 * Install-to-home-screen prompt.
 *
 * Chrome and Edge fire `beforeinstallprompt`, which we capture and replay when
 * the user taps Install. iOS Safari does not support it at all, so there the
 * only honest option is to show the manual Share → Add to Home Screen steps —
 * a button that silently does nothing on iPhone is worse than no button.
 *
 * Dismissal is remembered for 14 days rather than forever: a user who says
 * "not now" on their first visit may well want it later, but nagging on every
 * page load is how banners get ignored.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'gf_install_dismissed_at';
const DISMISS_DAYS = 14;

export const InstallAppPrompt: React.FC = () => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [visible, setVisible] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Already installed — nothing to offer.
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    try {
      const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * 86_400_000) return;
    } catch {
      /* private browsing */
    }

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIos(ios);
    if (ios) {
      setVisible(true);
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const dismiss = () => {
    setVisible(false);
    setShowIosHelp(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* private browsing */
    }
  };

  const install = async () => {
    if (isIos) {
      setShowIosHelp(true);
      return;
    }
    if (!deferred) return;

    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === 'accepted') setVisible(false);
    else dismiss();
  };

  if (!visible) return null;

  return (
    <>
      <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-40">
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl p-4 flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/logo-mark.svg" alt="" aria-hidden="true" className="w-10 h-10 rounded-xl shrink-0" />

          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Install Global Forex</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              Add it to your home screen for faster access and full-screen charts.
            </p>

            <div className="flex items-center gap-2 mt-2.5">
              <button
                type="button"
                onClick={install}
                className="px-3 py-1.5 rounded-lg bg-[#123f7d] hover:bg-[#0e3162] text-white text-[11px] font-bold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                Install
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-[11px] font-bold"
              >
                Not now
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss install prompt"
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* iOS has no programmatic install — show the real steps instead. */}
      {showIosHelp && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-install-title"
        >
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full sm:max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 id="ios-install-title" className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4" aria-hidden="true" />
                Add to Home Screen
              </h3>
              <button type="button" onClick={dismiss} aria-label="Close" className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <ol className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-[11px] shrink-0">1</span>
                Tap <Share className="w-3.5 h-3.5 inline mx-0.5" aria-label="Share" /> in the Safari toolbar
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-[11px] shrink-0">2</span>
                Scroll and tap <Plus className="w-3.5 h-3.5 inline mx-0.5" aria-label="Add" /> Add to Home Screen
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-[11px] shrink-0">3</span>
                Tap Add
              </li>
            </ol>

            <button
              type="button"
              onClick={dismiss}
              className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
