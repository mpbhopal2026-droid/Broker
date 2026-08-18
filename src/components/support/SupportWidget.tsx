'use client';

import React, { useState, useEffect, useRef } from 'react';
import { LifeBuoy, X, Camera, Upload, Clipboard, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { useApp } from '@/lib/store';
import {
  uploadFile,
  collectDiagnostics,
  captureScreenshot,
  imageFromPaste,
  installErrorCapture,
} from '@/lib/client-upload';

const CATEGORIES = [
  { value: 'bug', label: 'Something is broken' },
  { value: 'payment', label: 'Deposit or withdrawal' },
  { value: 'kyc', label: 'KYC / verification' },
  { value: 'account', label: 'My account' },
  { value: 'feature', label: 'Suggestion' },
  { value: 'other', label: 'Something else' },
];

const SEVERITIES = [
  { value: 'low', label: 'Minor' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'Serious' },
  { value: 'blocker', label: "Can't continue" },
];

/**
 * Floating support / bug reporter, available on every page to every signed-in
 * role.
 *
 * Three ways to attach a screenshot, because the reliable one varies by device:
 * paste (OS screenshot then Ctrl+V), file picker (works everywhere including
 * mobile), and screen capture (desktop browsers, permission-gated).
 *
 * Page URL, viewport and recent JS errors are attached automatically and shown
 * to the user before sending — collecting diagnostics silently would be the
 * wrong default.
 */
export const SupportWidget: React.FC = () => {
  const { currentUser } = useApp();

  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('bug');
  const [severity, setSeverity] = useState('normal');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reference, setReference] = useState('');

  const fileInput = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    installErrorCapture();
  }, []);

  // Preview URLs are object URLs; revoke them so they don't leak.
  useEffect(() => {
    if (!screenshot) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(screenshot);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [screenshot]);

  // Paste anywhere in the dialog attaches the image.
  useEffect(() => {
    if (!open) return;
    const onPaste = (event: ClipboardEvent) => {
      const file = imageFromPaste(event);
      if (file) {
        setScreenshot(file);
        setError('');
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!currentUser) return null;

  const reset = () => {
    setSubject('');
    setDescription('');
    setScreenshot(null);
    setError('');
    setReference('');
    setCategory('bug');
    setSeverity('normal');
  };

  const handleCapture = async () => {
    setError('');
    const file = await captureScreenshot();
    if (file) setScreenshot(file);
    else setError('Screen capture was cancelled or is not supported here. Paste or upload an image instead.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setError('Please add a title and a description.');
      return;
    }

    setBusy(true);
    setError('');

    let screenshotPath: string | undefined;

    if (screenshot) {
      const uploaded = await uploadFile(screenshot, 'support');
      if (!uploaded.ok) {
        setBusy(false);
        setError(uploaded.error || 'Could not upload the screenshot.');
        return;
      }
      screenshotPath = uploaded.path;
    }

    const res = await fetch('/api/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        category,
        severity,
        subject: subject.trim(),
        description: description.trim(),
        screenshotPath,
        ...collectDiagnostics(),
      }),
    });

    const body = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok || body?.ok === false) {
      setError(body?.error || 'Could not send your report.');
      return;
    }

    setReference(body.reference);
  };

  const diagnostics = open ? collectDiagnostics() : { pageUrl: '', consoleErrors: [] as string[] };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Report a problem"
        className="fixed bottom-24 right-4 md:bottom-6 z-40 w-11 h-11 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 shadow-lg flex items-center justify-center transition-all active:scale-95"
      >
        <LifeBuoy className="w-5 h-5" aria-hidden="true" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="support-title"
        >
          <div
            ref={dialogRef}
            className="bg-slate-900 border border-slate-700 w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl max-h-[92vh] overflow-y-auto shadow-2xl"
          >
            <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LifeBuoy className="w-4 h-4 text-sky-400" aria-hidden="true" />
                <h2 id="support-title" className="font-bold text-white text-sm">
                  Report a problem
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  if (reference) reset();
                }}
                aria-label="Close"
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reference ? (
              <div className="p-8 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" aria-hidden="true" />
                <h3 className="text-white font-bold">Report sent</h3>
                <p className="text-xs text-slate-400">
                  Your reference is{' '}
                  <strong className="text-emerald-400 font-mono">{reference}</strong>
                  <br />
                  Quote it if you contact support about this.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    setOpen(false);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {error && (
                  <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="sup-cat" className="block text-[11px] font-bold text-slate-300 mb-1">
                      What is it about?
                    </label>
                    <select
                      id="sup-cat"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="sup-sev" className="block text-[11px] font-bold text-slate-300 mb-1">
                      How bad is it?
                    </label>
                    <select
                      id="sup-sev"
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white"
                    >
                      {SEVERITIES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="sup-subject" className="block text-[11px] font-bold text-slate-300 mb-1">
                    Short title
                  </label>
                  <input
                    id="sup-subject"
                    type="text"
                    required
                    maxLength={160}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Deposit page shows wrong amount"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-600"
                  />
                </div>

                <div>
                  <label htmlFor="sup-desc" className="block text-[11px] font-bold text-slate-300 mb-1">
                    What happened?
                  </label>
                  <textarea
                    id="sup-desc"
                    required
                    rows={4}
                    maxLength={4000}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What did you do, what did you expect, and what happened instead?"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-600 resize-none"
                  />
                </div>

                {/* Screenshot */}
                <div className="space-y-2">
                  <span className="block text-[11px] font-bold text-slate-300">Screenshot (optional)</span>

                  {preview ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={preview}
                        alt="Attached screenshot preview"
                        className="w-full rounded-xl border border-slate-700 max-h-48 object-contain bg-slate-950"
                      />
                      <button
                        type="button"
                        onClick={() => setScreenshot(null)}
                        aria-label="Remove screenshot"
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-900/90 text-slate-300 hover:text-white border border-slate-700"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={handleCapture}
                        className="py-2.5 rounded-xl bg-slate-950 border border-slate-700 hover:border-slate-600 text-slate-300 text-[10px] font-bold flex flex-col items-center gap-1"
                      >
                        <Camera className="w-4 h-4" aria-hidden="true" />
                        Capture
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInput.current?.click()}
                        className="py-2.5 rounded-xl bg-slate-950 border border-slate-700 hover:border-slate-600 text-slate-300 text-[10px] font-bold flex flex-col items-center gap-1"
                      >
                        <Upload className="w-4 h-4" aria-hidden="true" />
                        Upload
                      </button>
                      <div className="py-2.5 rounded-xl bg-slate-950 border border-dashed border-slate-700 text-slate-500 text-[10px] font-bold flex flex-col items-center gap-1">
                        <Clipboard className="w-4 h-4" aria-hidden="true" />
                        Ctrl+V
                      </div>
                    </div>
                  )}

                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setScreenshot(file);
                    }}
                  />
                </div>

                {/* Shown, not silently collected. */}
                <details className="text-[10px] text-slate-500">
                  <summary className="cursor-pointer hover:text-slate-400">
                    We will also send technical details
                  </summary>
                  <div className="mt-1.5 p-2 rounded-lg bg-slate-950 border border-slate-800 space-y-0.5 font-mono break-all">
                    <div>Page: {diagnostics.pageUrl}</div>
                    <div>Screen: {typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : ''}</div>
                    <div>Recent errors: {diagnostics.consoleErrors?.length ?? 0}</div>
                  </div>
                </details>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                  {busy ? 'Sending…' : 'Send report'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};
