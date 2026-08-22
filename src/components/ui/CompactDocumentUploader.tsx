'use client';

import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  Camera,
  Eye,
  Trash2,
  CheckCircle2,
  Loader2,
  X,
  RotateCcw,
  FileCheck,
  Image as ImageIcon
} from 'lucide-react';
import { uploadFile } from '@/lib/client-upload';

interface CompactDocumentUploaderProps {
  label: string;
  description?: string;
  purpose: 'kyc' | 'proof' | 'support' | 'deposit';
  currentPath?: string;
  onUploaded: (path: string) => void;
  onRemoved?: () => void;
  disabled?: boolean;
}

export const CompactDocumentUploader: React.FC<CompactDocumentUploaderProps> = ({
  label,
  description,
  purpose,
  currentPath,
  onUploaded,
  onRemoved,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isInspectOpen, setIsInspectOpen] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');

    // Instant local thumbnail preview for immediate visual feedback
    const objectUrl = URL.createObjectURL(file);
    setLocalPreviewUrl(objectUrl);
    setFileName(file.name);
    setFileSize((file.size / 1024 / 1024).toFixed(2) + ' MB');

    setIsUploading(true);
    setUploadProgress(20);

    try {
      setUploadProgress(60);
      const uploadPurpose = purpose === 'deposit' ? 'proof' : purpose;
      const res = await uploadFile(file, uploadPurpose);
      setUploadProgress(100);

      if (res && res.path) {
        onUploaded(res.path);
      } else {
        setError('Could not process upload. Please try again.');
        setLocalPreviewUrl('');
      }
    } catch (err: any) {
      setError(err?.message || 'Upload failed.');
      setLocalPreviewUrl('');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalPreviewUrl('');
    setFileName('');
    setFileSize('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (onRemoved) onRemoved();
  };

  const hasImage = Boolean(localPreviewUrl || currentPath);
  const displayImage = localPreviewUrl || currentPath;

  return (
    <div className="space-y-2 w-full">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-800 dark:text-slate-200">{label}</label>
        {description && <span className="text-[10px] text-slate-400">{description}</span>}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
        className="hidden"
        disabled={disabled || isUploading}
        onChange={handleFileSelect}
      />

      {/* When no file is selected yet: Compact Action Button */}
      {!hasImage && !isUploading && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-3 px-4 rounded-2xl bg-slate-50 dark:bg-[#0f172a] border border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-[#00d674] transition-all flex items-center justify-center gap-2 text-xs font-bold shadow-2xs group cursor-pointer"
        >
          <Camera className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
          <span>Take Photo or Choose Document</span>
        </button>
      )}

      {/* While Uploading: Animated Status Bar */}
      {isUploading && (
        <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-300">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span>Uploading & verifying document…</span>
            </div>
            <span className="font-mono">{uploadProgress}%</span>
          </div>
          <div className="w-full h-1.5 bg-emerald-100 dark:bg-emerald-900/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* When File is Uploaded: Instant Crisp Thumbnail Preview Card */}
      {hasImage && !isUploading && (
        <div className="p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-[#0f172a] border border-emerald-500/40 shadow-xs flex items-center justify-between gap-3 animate-scale-in">
          <div className="flex items-center gap-3 min-w-0">
            {/* Thumbnail */}
            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
              {displayImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={displayImage}
                  alt={label}
                  className="w-full h-full object-cover"
                />
              ) : (
                <ImageIcon className="w-5 h-5 text-slate-400 absolute inset-0 m-auto" />
              )}
            </div>

            {/* Meta Info */}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[160px] sm:max-w-xs">
                  {fileName || label}
                </span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                {fileSize && <span>{fileSize} •</span>}
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Attached & Ready</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setIsInspectOpen(true)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              title="Inspect Full Image"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              title="Replace File"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleRemove}
              className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
              title="Delete Document"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
          ⚠️ {error}
        </p>
      )}

      {/* Full-Screen Zoom / Inspection Modal */}
      {isInspectOpen && displayImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
          <div className="relative max-w-2xl w-full max-h-[85vh] rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden flex flex-col shadow-2xl animate-scale-in">
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-white font-mono">{label} - Inspection</span>
              <button
                type="button"
                onClick={() => setIsInspectOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 p-4 flex items-center justify-center overflow-auto bg-black/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={displayImage}
                alt={label}
                className="max-h-[65vh] w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
