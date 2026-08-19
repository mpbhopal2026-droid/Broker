'use client';

import React, { useEffect, useState } from 'react';
import { FileWarning, Loader2, FileText, ExternalLink, ZoomIn } from 'lucide-react';

/**
 * Renders a KYC document or payment proof from Cloudinary / storage path.
 * Supports images (PNG, JPEG, WebP) and PDF documents with zoom and preview.
 */
export const KycDocumentImage: React.FC<{
  path: string;
  alt: string;
  purpose?: 'kyc' | 'proof' | 'support';
}> = ({ path, alt, purpose = 'kyc' }) => {
  const [url, setUrl] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    setUrl('');
    setError('');

    if (!path) {
      setError('No document image attached.');
      return;
    }

    if (path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://')) {
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
      <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-center px-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
        <FileWarning className="w-5 h-5 text-rose-500" aria-hidden="true" />
        <span className="text-[10px] text-rose-600 dark:text-rose-400 leading-tight">{error}</span>
        <span className="text-[9px] text-slate-400 font-mono break-all">{path}</span>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-lg">
        <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" aria-hidden="true" />
      </div>
    );
  }

  const isPdf = url.toLowerCase().includes('.pdf') || path.toLowerCase().includes('.pdf');

  if (isPdf) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-slate-100 dark:bg-slate-900 p-4 text-center rounded-lg">
        <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <span className="text-xs font-bold text-slate-900 dark:text-white block">PDF Document</span>
          <span className="text-[10px] text-slate-500">{alt}</span>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition-opacity"
        >
          <span>Open PDF</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative group">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        className="w-full h-full object-contain cursor-zoom-in transition-transform duration-200 group-hover:scale-[1.02]"
      />
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/75 hover:bg-black text-white text-[10px] font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs"
      >
        <ZoomIn className="w-3 h-3" />
        <span>Full Res</span>
      </a>
    </div>
  );
};

