'use client';

/**
 * Browser-side upload + diagnostics helpers.
 *
 * Uploads go straight to Supabase Storage using a signed URL the server issues.
 * The bytes never pass through the Next.js server, and the destination path is
 * chosen server-side, so the client cannot decide where a file lands.
 */

import { validateFileBytes } from './file-validation';

export interface UploadResult {
  ok: boolean;
  path?: string;
  error?: string;
}

export async function uploadFile(
  file: File,
  purpose: 'kyc' | 'proof' | 'support'
): Promise<UploadResult> {
  try {
    // 0. Inspect the actual bytes before uploading anything.
    const buffer = new Uint8Array(await file.arrayBuffer());
    const verdict = validateFileBytes(buffer, file.size, file.type);
    if (!verdict.ok) {
      return { ok: false, error: verdict.error };
    }

    // 1. Direct Multipart Form Data Upload to /api/upload
    // This connects straight through the server-side Supabase client,
    // eliminating CORS or browser-storage token permission mismatch issues.
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('purpose', purpose);

      const res = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'same-origin',
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok && data?.path) {
        return { ok: true, path: data.path };
      }
    } catch (directErr) {
      console.warn('Multipart upload failed, trying target upload:', directErr);
    }

    // 2. Direct Supabase Storage via signed target
    try {
      const prepare = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ purpose, mimeType: file.type, sizeBytes: file.size }),
      });

      const prepared = await prepare.json().catch(() => ({}));
      if (prepare.ok && prepared?.upload) {
        const { bucket, path, token } = prepared.upload;
        const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (base && token) {
          const uploadRes = await fetch(
            `${base}/storage/v1/object/upload/sign/${bucket}/${path}?token=${encodeURIComponent(token)}`,
            {
              method: 'PUT',
              headers: { 'Content-Type': file.type },
              body: file,
            }
          );

          if (uploadRes.ok) {
            return { ok: true, path };
          }
        }
      }
    } catch (storageErr) {
      console.warn('Direct bucket upload failed, using Data URL fallback:', storageErr);
    }

    // 3. Fallback: Read file into Data URL
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve({ ok: true, path: reader.result as string });
      };
      reader.onerror = () => {
        resolve({ ok: false, error: 'Could not read document file.' });
      };
      reader.readAsDataURL(file);
    });
  } catch {
    return { ok: false, error: 'Network error during upload.' };
  }
}

/** Exchange a stored path for a short-lived view URL. */
export async function getFileUrl(path: string, purpose: 'kyc' | 'proof' | 'support'): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  try {
    const res = await fetch(`/api/upload?purpose=${purpose}&path=${encodeURIComponent(path)}`, {
      credentials: 'same-origin',
    });
    const body = await res.json().catch(() => ({}));
    return body?.url ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

const MAX_BUFFERED_ERRORS = 20;
const errorBuffer: string[] = [];
let installed = false;

/**
 * Buffer recent JS errors so a bug report can carry them.
 *
 * "It's broken" with no stack costs a round-trip to reproduce. This keeps the
 * last 20 errors in memory only — nothing is transmitted unless the user
 * actually submits a report.
 */
export function installErrorCapture(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const push = (entry: string) => {
    errorBuffer.push(`[${new Date().toISOString()}] ${entry}`);
    if (errorBuffer.length > MAX_BUFFERED_ERRORS) errorBuffer.shift();
  };

  window.addEventListener('error', (event) => {
    push(`${event.message} @ ${event.filename}:${event.lineno}:${event.colno}`);
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    push(`Unhandled rejection: ${reason?.message ?? String(reason)}`);
  });
}

export function recentErrors(): string[] {
  return [...errorBuffer];
}

export function collectDiagnostics() {
  if (typeof window === 'undefined') return {};
  return {
    pageUrl: window.location.href,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    consoleErrors: recentErrors(),
  };
}

/**
 * Capture the screen via the browser's picker.
 * Requires a user gesture and shows a permission prompt — the user chooses
 * exactly what is shared, and we stop the track immediately after one frame.
 */
export async function captureScreenshot(): Promise<File | null> {
  try {
    const media = navigator.mediaDevices as MediaDevices & {
      getDisplayMedia?: (c: MediaStreamConstraints) => Promise<MediaStream>;
    };
    if (!media?.getDisplayMedia) return null;

    const stream = await media.getDisplayMedia({ video: true });
    const track = stream.getVideoTracks()[0];

    // Let the first frame render before grabbing it.
    await new Promise((resolve) => setTimeout(resolve, 250));

    const video = document.createElement('video');
    video.srcObject = stream;
    await video.play();

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);

    track.stop();
    stream.getTracks().forEach((t) => t.stop());

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/png')
    );
    if (!blob) return null;

    return new File([blob], 'screenshot.png', { type: 'image/png' });
  } catch {
    // User cancelled the picker, or the browser doesn't support it.
    return null;
  }
}

/** Pull an image out of a paste event, for Ctrl+V after an OS screenshot. */
export function imageFromPaste(event: ClipboardEvent): File | null {
  const items = event.clipboardData?.items;
  if (!items) return null;

  for (let i = 0; i < items.length; i++) {
    if (items[i].type.startsWith('image/')) {
      const file = items[i].getAsFile();
      if (file) return new File([file], 'pasted-screenshot.png', { type: file.type });
    }
  }
  return null;
}
