'use client';

import React, { useEffect, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { getFileUrl } from '@/lib/client-upload';

/**
 * Preview of a document the client just uploaded.
 *
 * The value held in state is a private storage path, not an image the browser
 * can render directly — the kyc bucket is private, which is the point. This
 * exchanges it for a short-lived signed URL.
 *
 * Showing the preview matters more than it looks: it is the client's only
 * confirmation that the right page of the right document actually landed. Without
 * it people upload the back of a card twice and only discover it when the
 * application is rejected days later.
 */
export const UploadedDocPreview: React.FC<{ path: string; alt: string }> = ({ path, alt }) => {
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setUrl('');
    setFailed(false);

    void getFileUrl(path, 'kyc')
      .then((u) => { if (!cancelled) { if (u) setUrl(u); else setFailed(true); } })
      .catch(() => { if (!cancelled) setFailed(true); });

    return () => { cancelled = true; };
  }, [path]);

  // A PDF has no thumbnail, and a failed signature should not read as a failed
  // upload — the file is stored either way, so say so rather than showing a
  // broken frame that invites re-uploading.
  if (failed || (!url && path.toLowerCase().endsWith('.pdf'))) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-slate-50 dark:bg-slate-900 text-center px-2">
        <FileText className="w-5 h-5 text-emerald-600" aria-hidden="true" />
        <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">Uploaded</span>
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

  /* eslint-disable-next-line @next/next/no-img-element */
  return <img src={url} alt={alt} className="w-full h-full object-cover" />;
};
