'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, CheckCircle2, Loader2, AlertTriangle, FileText } from 'lucide-react';
import { uploadFile } from '@/lib/client-upload';

interface FileUploadProps {
  label: string;
  purpose: 'kyc' | 'proof';
  /** Called with the storage path once the file is safely uploaded. */
  onUploaded: (path: string | null) => void;
  required?: boolean;
  hint?: string;
}

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = 'image/png,image/jpeg,image/webp,application/pdf';

/**
 * Upload a document to private Supabase storage.
 *
 * The file goes browser → Supabase directly using a server-issued signed URL,
 * and what surfaces to the form is a storage *path*, not the file contents.
 *
 * The previous flow read files with FileReader into base64 data URLs and posted
 * those as strings — which meant a 3MB photo became a ~4MB JSON field, and when
 * no file was chosen it silently substituted a stock photo from Unsplash as the
 * client's identity document.
 */
export const FileUpload: React.FC<FileUploadProps> = ({
  label,
  purpose,
  onUploaded,
  required = false,
  hint,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file || file.type === 'application/pdf') {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleSelect = async (selected: File) => {
    setError('');

    if (selected.size > MAX_BYTES) {
      setError(`File is too large (${(selected.size / 1024 / 1024).toFixed(1)}MB). Maximum is 5MB.`);
      setStatus('error');
      return;
    }
    if (!ACCEPTED.split(',').includes(selected.type)) {
      setError('Please choose a JPG, PNG, WebP or PDF file.');
      setStatus('error');
      return;
    }

    setFile(selected);
    setStatus('uploading');
    onUploaded(null); // invalidate any previous path while this one uploads

    const result = await uploadFile(selected, purpose);

    if (!result.ok || !result.path) {
      setStatus('error');
      setError(result.error || 'Upload failed.');
      onUploaded(null);
      return;
    }

    setStatus('done');
    onUploaded(result.path);
  };

  const clear = () => {
    setFile(null);
    setStatus('idle');
    setError('');
    onUploaded(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-slate-300">
        {label}
        {required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>

      {status === 'idle' || status === 'error' ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`w-full py-6 rounded-xl border border-dashed flex flex-col items-center justify-center gap-1.5 transition-colors ${
            status === 'error'
              ? 'border-rose-500/50 bg-rose-500/5 text-rose-300'
              : 'border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600 hover:text-slate-300'
          }`}
        >
          <Upload className="w-5 h-5" aria-hidden="true" />
          <span className="text-xs font-semibold">Choose file</span>
          <span className="text-[10px] text-slate-500">JPG, PNG, WebP or PDF · max 5MB</span>
        </button>
      ) : (
        <div className="relative rounded-xl border border-slate-700 bg-slate-950 overflow-hidden">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={`${label} preview`} className="w-full max-h-40 object-contain" />
          ) : (
            <div className="py-6 flex flex-col items-center gap-1.5 text-slate-400">
              <FileText className="w-6 h-6" aria-hidden="true" />
              <span className="text-[11px] font-mono truncate max-w-[80%]">{file?.name}</span>
            </div>
          )}

          <div className="absolute top-2 right-2 flex items-center gap-1.5">
            {status === 'uploading' && (
              <span className="px-2 py-1 rounded-lg bg-slate-900/90 text-slate-300 text-[10px] font-bold flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                Uploading
              </span>
            )}
            {status === 'done' && (
              <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                Uploaded
              </span>
            )}
            <button
              type="button"
              onClick={clear}
              aria-label={`Remove ${label}`}
              className="p-1.5 rounded-lg bg-slate-900/90 text-slate-300 hover:text-white border border-slate-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-[11px] text-rose-400 flex items-start gap-1">
          <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" aria-hidden="true" />
          {error}
        </p>
      )}
      {hint && !error && <p className="text-[10px] text-slate-500">{hint}</p>}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => {
          const selected = e.target.files?.[0];
          if (selected) void handleSelect(selected);
        }}
      />
    </div>
  );
};
