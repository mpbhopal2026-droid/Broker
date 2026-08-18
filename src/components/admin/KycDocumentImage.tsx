'use client';

import React, { useEffect, useState } from 'react';
import { FileWarning, Loader2 } from 'lucide-react';

/**
 * Renders a KYC document from its private storage path.
 *
 * The admin page previously did `<img src={path}>` with the raw stored value.
 * That path is a storage key, not a URL, and the kyc bucket is private — so the
 * browser resolved it against the admin page's own origin and 404'd. Reviewers
 * saw an empty box for every applicant, which is the worst possible failure on
 * a screen whose entire job is deciding whether a document is genuine: an
 * approve button next to a blank frame invites approving unseen.
 *
 * Exchanges the path for a short-lived signed URL via /api/upload, which is
 * gated on kyc:review and audits every access.
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
      setError('No image attached.');
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

  // Say why it is missing rather than showing an empty frame. A reviewer who
  // can see "this document could not be loaded" will not approve it; a reviewer
  // looking at a blank box might assume the image is just slow.
  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-center px-3 bg-slate-50 dark:bg-slate-900">
        <FileWarning className="w-5 h-5 text-rose-500" aria-hidden="true" />
        <span className="text-[10px] text-rose-600 dark:text-rose-400 leading-tight">{error}</span>
        <span className="text-[9px] text-slate-400 font-mono break-all">{path}</span>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="w-4 h-4 text-slate-400 animate-spin" aria-hidden="true" />
      </div>
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <a href={url} target="_blank" rel="noopener noreferrer" className="w-full h-full block">
      <img src={url} alt={alt} className="w-full h-full object-contain" />
    </a>
  );
};
