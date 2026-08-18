'use client';

import React, { useState } from 'react';
import { KycDocumentImage } from '@/components/admin/KycDocumentImage';
import Link from 'next/link';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  X,
  FileText,
  User,
  Filter
} from 'lucide-react';
import { useAdmin } from '@/lib/admin-store';
import { formatDate } from '@/lib/utils';
import { KYCRecord, UserProfile } from '@/lib/types';
import { AdminManualKycModal } from '@/components/admin/modals/AdminManualKycModal';

export default function AdminKycPage() {
  const { kycRecords, users, reviewKYC } = useAdmin();
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [inspectRecord, setInspectRecord] = useState<KYCRecord | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [manualVerifyUser, setManualVerifyUser] = useState<UserProfile | null>(null);
  const [showUserPicker, setShowUserPicker] = useState(false);

  const filtered = kycRecords.filter((k) => (filter === 'all' ? true : k.status === filter));

  const handleApprove = (recordId: string) => {
    reviewKYC(recordId, 'approved', 'Document verified and approved by Compliance Officer.');
    setInspectRecord(null);
  };

  const handleRejectConfirm = () => {
    if (!inspectRecord) return;
    reviewKYC(inspectRecord.id, 'rejected', rejectReason || 'Document unreadable or invalid.');
    setShowRejectModal(false);
    setInspectRecord(null);
    setRejectReason('');
  };

  return (
    <div className="space-y-6 max-w-5xl">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            KYC Compliance Queue
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review government ID documents, verify against beneficiary bank records, and approve Level 2 access.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Manual Verify Dropdown / Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowUserPicker(!showUserPicker)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>+ Manual Verify Client</span>
            </button>

            {showUserPicker && (
              <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 z-50 text-xs animate-in zoom-in-95 max-h-60 overflow-y-auto space-y-1">
                <div className="px-2 py-1 text-[10px] font-bold uppercase text-slate-400">
                  Select Client to Verify / Override:
                </div>
                {users.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      setManualVerifyUser(u);
                      setShowUserPicker(false);
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors flex items-center justify-between group"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-white truncate">{u.fullName}</p>
                      <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                    </div>
                    <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                      u.kycStatus === 'approved' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700'
                    }`}>
                      {u.kycStatus || 'unverified'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            {(['pending', 'approved', 'rejected', 'all'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                  filter === status
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KYC Records List (Mobile Cards + Desktop Table) */}
      <div className="rounded-2xl bg-white dark:bg-[#0d121c] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs font-mono">
            No KYC submissions found matching filter "{filter}".
          </div>
        ) : (
          <>
            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((record) => {
                const isPending = record.status === 'pending';
                const isApproved = record.status === 'approved';

                return (
                  <div
                    key={record.id}
                    onClick={() => setInspectRecord(record)}
                    className="p-4 space-y-3 active:bg-slate-50 dark:active:bg-slate-900/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <strong className="text-xs sm:text-sm text-slate-900 dark:text-white font-bold block">{record.userFullName || 'Applicant'}</strong>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">{record.userEmail}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                            {record.documentType.replace('_', ' ')}
                          </span>
                          <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300">
                            {record.documentNumber}
                          </span>
                        </div>
                      </div>

                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${
                        isApproved
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                          : isPending
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                          : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                      }`}>
                        {record.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
                      <span className="text-slate-400 font-mono">{formatDate(record.submittedAt)}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectRecord(record);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-xs active:scale-95 transition-all flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Docs</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 dark:bg-[#080d14] text-slate-500 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase font-sans">
                <tr>
                  <th className="py-3 px-4">Client Name</th>
                  <th className="py-3 px-4">Document Type</th>
                  <th className="py-3 px-4">Document Number</th>
                  <th className="py-3 px-4">Submitted</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filtered.map((record) => {
                  const isPending = record.status === 'pending';
                  const isApproved = record.status === 'approved';

                  return (
                    <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                      <td className="py-3.5 px-4 font-sans">
                        <div className="font-bold text-slate-900 dark:text-white">{record.userFullName || 'Client'}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{record.userEmail}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {record.documentType.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {record.documentNumber}
                      </td>

                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {formatDate(record.submittedAt)}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            isApproved
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-[#00d674]'
                              : isPending
                              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          {record.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-sans">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setInspectRecord(record)}
                            className="px-3 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-semibold"
                          >
                            Inspect Proof
                          </button>

                          {isPending && (
                            <button
                              onClick={() => handleApprove(record.id)}
                              className="px-3 py-1 rounded bg-slate-900 dark:bg-emerald-500 hover:bg-slate-800 text-white dark:text-slate-950 text-xs font-bold shadow-sm"
                            >
                              Approve
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>

      {/* Inspect Document Modal */}
      {inspectRecord && !showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="rounded-2xl bg-white dark:bg-[#0d121c] border border-slate-300 dark:border-slate-700 p-6 max-w-2xl w-full space-y-4 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Review KYC Document: {inspectRecord.userFullName}
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">
                  {inspectRecord.userEmail}
                </p>
              </div>
              <button
                onClick={() => setInspectRecord(null)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] font-sans">Document Type:</span>
                <strong className="text-slate-900 dark:text-white uppercase">{inspectRecord.documentType.replace('_', ' ')}</strong>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] font-sans">Document Number:</span>
                <strong className="text-emerald-600 dark:text-[#00d674]">{inspectRecord.documentNumber}</strong>
              </div>
            </div>

            {/* Document Images (Front & Back Preview) */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block font-sans">Uploaded ID Proof Documents ({inspectRecord.filePaths.length}):</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {inspectRecord.filePaths.map((path, idx) => (
                  <div key={idx} className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">
                      {idx === 0 ? 'PAN / Primary ID' : idx === 1 ? 'Aadhaar Front' : 'Aadhaar Back'}
                    </span>
                    <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 h-48 bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                      <KycDocumentImage path={path} alt={`Proof ${idx + 1}`} purpose="kyc" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {inspectRecord.status === 'pending' ? (
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800 font-sans">
                <button
                  onClick={() => setShowRejectModal(true)}
                  className="py-2 px-4 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 text-xs font-semibold"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleApprove(inspectRecord.id)}
                  className="py-2 px-5 rounded-lg bg-slate-900 dark:bg-emerald-500 hover:bg-slate-800 text-white dark:text-slate-950 text-xs font-bold shadow-sm"
                >
                  Approve KYC Level 2
                </button>
              </div>
            ) : (
              <div className="pt-2 text-right font-sans">
                <button
                  onClick={() => setInspectRecord(null)}
                  className="py-1.5 px-4 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold"
                >
                  Close Preview
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && inspectRecord && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="rounded-2xl bg-white dark:bg-[#0d121c] border border-rose-300 dark:border-rose-900/50 p-6 max-w-md w-full space-y-4 shadow-2xl animate-scale-in text-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Specify KYC Rejection Reason</h3>
            <p className="text-slate-500">
              The client will see this feedback in their KYC portal:
            </p>

            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Document image is blurry / Name on Aadhaar does not match registered name..."
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-slate-900 dark:text-white"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="py-1.5 px-3.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectConfirm}
                className="py-1.5 px-4 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {manualVerifyUser && (
        <AdminManualKycModal
          user={manualVerifyUser}
          onClose={() => setManualVerifyUser(null)}
        />
      )}

    </div>
  );
}
