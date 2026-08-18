'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode } from 'lucide-react';

/**
 * UPI QR, rendered locally from the payment intent.
 *
 * Two reasons this is not an <img> pointing at a QR service or an uploaded PNG:
 *
 * 1. A third-party generator sees the payee VPA and the amount of every deposit
 *    the platform takes, and it hands back the image clients actually scan. If
 *    that service is compromised or spoofed it serves a QR encoding a different
 *    payee, and nobody notices until the money is gone. Generating in the
 *    browser means the bytes scanned are derived from our own string.
 *
 * 2. An uploaded QR image is an artifact independent of the UPI ID beside it.
 *    Change the ID and the picture keeps pointing at the old account — the two
 *    can disagree indefinitely and the client trusts the picture. Deriving the
 *    QR from the same value makes that drift impossible.
 */
export const UpiQr: React.FC<{ upiLink: string | null; size?: number }> = ({ upiLink, size = 200 }) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!upiLink) return;
    let cancelled = false;

    void QRCode.toDataURL(upiLink, {
      width: size * 2, // 2x so it stays sharp, and scannable from a phone screen
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((url) => { if (!cancelled) { setDataUrl(url); setFailed(false); } })
      .catch(() => { if (!cancelled) setFailed(true); });

    return () => { cancelled = true; };
  }, [upiLink, size]);

  // No silent placeholder. A blank or broken QR box on a payment screen gets
  // scanned hopefully; an explicit message sends the client to the UPI ID
  // printed underneath, which is the value we actually trust.
  if (!upiLink || failed || !dataUrl) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-center p-3"
        style={{ width: size, height: size }}
      >
        <QrCode className="w-5 h-5 text-slate-400" aria-hidden="true" />
        <span className="text-[10px] text-slate-500 leading-tight">
          QR unavailable — use the UPI ID below
        </span>
      </div>
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={dataUrl}
      alt="Scan to pay by UPI"
      width={size}
      height={size}
      className="rounded-xl"
      style={{ width: size, height: size }}
    />
  );
};
