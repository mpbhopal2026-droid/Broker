'use client';

import React, { useEffect, useState } from 'react';
import { FileWarning, Loader2, FileText, ExternalLink, ZoomIn, X, RotateCw } from 'lucide-react';

/**
 * Renders a KYC document or payment proof from Cloudinary / storage path / data URL.
 * Supports images (PNG, JPEG, WebP) and PDF documents with interactive lightbox zoom.
 */
export const KycDocumentImage: React.FC<{
  path: string;
  alt: string;
  purpose?: 'kyc' | 'proof' | 'support';
  className?: string;
}> = ({ path, alt, purpose = 'kyc', className }) => {
  const [url, setUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [showLightbox, setShowLightbox] = useState(false);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setUrl('');
    setError('');

    if (!path) {
      setError('No document image attached.');
      return;
    }

    if (path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) {
      setUrl(path);
      return;
    }

    void (async () => {
      try {
        const res = await fetch(
          `/api/upload?purpose=${purpose}&path=${encodeURIComponent(path)}`,
          { credentials: 'same-origin' },
        );
        const body = await res.json().catch(() => ({}));

        if (cancelled) return;
        if (!res.ok || !body?.url) {
          setError(body?.error || 'Could not load this document.');
          return;
        }
        setUrl(body.url);
      } catch {
        if (!cancelled) setError('Could not load this document.');
      }
    })();

    return () => { cancelled = true; };
  }, [path, purpose]);

  if (error) {
    return (
      <div className="w-full h-full min-h-[160px] flex flex-col items-center justify-center gap-1.5 text-center p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-dashed border-rose-200 dark:border-rose-900/40">
        <FileWarning className="w-6 h-6 text-rose-500" aria-hidden="true" />
        <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 leading-tight">{error}</span>
        <span className="text-[10px] text-slate-400 font-mono break-all max-w-[200px] truncate">{path}</span>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="w-full h-full min-h-[160px] flex flex-col items-center justify-center gap-2 bg-slate-50 dark:bg-slate-900/60 rounded-xl">
        <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" aria-hidden="true" />
        <span className="text-[11px] text-slate-400 font-medium">Resolving document…</span>
      </div>
    );
  }

  const isPdf = url.toLowerCase().includes('.pdf') || path.toLowerCase().includes('.pdf');

  if (isPdf) {
    return (
      <div className="w-full h-full min-h-[160px] flex flex-col items-center justify-center gap-2.5 bg-slate-100 dark:bg-slate-900 p-4 text-center rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="w-11 h-11 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-sm">
          <FileText className="w-6 h-6" />
        </div>
        <div>
          <span className="text-xs font-bold text-slate-900 dark:text-white block">PDF Document</span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">{alt}</span>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 px-3.5 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition-opacity shadow-sm"
        >
          <span>Open PDF</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    );
  }

  return (
    <>
      <div className={`w-full h-full relative group overflow-hidden rounded-xl bg-slate-950/5 dark:bg-black flex items-center justify-center ${className || ''}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={alt}
          onClick={() => setShowLightbox(true)}
          className="w-full h-full object-contain cursor-zoom-in transition-transform duration-300 group-hover:scale-[1.03]"
          onError={() => setError('Image failed to render.')}
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
          <button
            type="button"
            onClick={() => setShowLightbox(true)}
            className="pointer-events-auto px-3 py-1.5 rounded-lg bg-white/90 dark:bg-slate-900/90 text-slate-900 dark:text-white text-xs font-bold flex items-center gap-1.5 shadow-lg backdrop-blur-xs hover:bg-white transition-colors cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
            <span>Enlarge</span>
          </button>
        </div>
      </div>

      {/* Interactive Lightbox Modal */}
      {showLightbox && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-5xl flex items-center justify-between text-white pb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">{alt}</span>
              <span className="text-xs text-slate-400 font-mono">High Resolution View</span>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Rotate 90°</span>
              </button>

              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Original</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  setShowLightbox(false);
                  setRotation(0);
                }}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="relative w-full max-w-5xl h-[80vh] flex items-center justify-center overflow-hidden rounded-2xl bg-black/50 border border-white/10 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={alt}
              style={{ transform: `rotate(${rotation}deg)` }}
              className="max-w-full max-h-full object-contain transition-transform duration-300 rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  );
};

