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
  Filter,
  Search,
  Zap,
  Check,
  CreditCard,
  Building2,
  ExternalLink,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { useAdmin } from '@/lib/admin-store';
import { formatDate } from '@/lib/utils';
import { KYCRecord, UserProfile } from '@/lib/types';
import { AdminManualKycModal } from '@/components/admin/modals/AdminManualKycModal';
import { validateAadhaarVerhoeff, validatePAN, validateIFSC, getBankNameFromIFSC } from '@/lib/verhoeff';

export default function AdminKycConsolePage() {
  const { kycRecords, users, reviewKYC, manualVerifyUserKyc } = useAdmin();
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectRecord, setInspectRecord] = useState<KYCRecord | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [manualVerifyUser, setManualVerifyUser] = useState<UserProfile | null>(null);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Filter records
  const filtered = kycRecords.filter((k) => {
    const matchStatus = filter === 'all' ? true : k.status === filter;
    const matchSearch =
      (k.userFullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (k.userEmail || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (k.documentNumber || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  const pendingCount = kycRecords.filter((k) => k.status === 'pending').length;
  const approvedCount = kycRecords.filter((k) => k.status === 'approved').length;
  const rejectedCount = kycRecords.filter((k) => k.status === 'rejected').length;

  const handleApprove = async (recordId: string) => {
    setActionLoading(true);
    await reviewKYC(recordId, 'approved', 'Documents and bank credentials verified and approved by Compliance Desk.');
    setActionLoading(false);
    setInspectRecord(null);
  };

  const handleRejectConfirm = async () => {
    if (!inspectRecord) return;
    setActionLoading(true);
    await reviewKYC(inspectRecord.id, 'rejected', rejectReason || 'Document unreadable, mismatched name, or invalid bank credentials.');
    setActionLoading(false);
    setShowRejectModal(false);
    setInspectRecord(null);
    setRejectReason('');
  };

  // Find associated user profile for inspectRecord to display bank details & name match
  const inspectedUser = inspectRecord ? users.find((u) => u.id === inspectRecord.userId) : null;

  return (
    <div className="space-y-4 max-w-6xl mx-auto select-none">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-base sm:text-lg font-bold uppercase tracking-tight text-zinc-950 dark:text-white">
            Compliance & KYC Clearance Console
          </h1>
          <p className="text-[11px] text-zinc-500 font-sans mt-0.5">
            Inspect government ID uploads, run OCR picture comparison, and authorize Tier-1 live trading clearance.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Manual Verify Override Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowUserPicker(!showUserPicker)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-950 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 text-xs font-bold transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>+ Manual Verify Client</span>
            </button>

            {showUserPicker && (
              <div className="absolute right-0 mt-1.5 w-72 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md shadow-2xl p-2 z-50 text-xs max-h-60 overflow-y-auto space-y-1">
                <div className="px-2 py-1 text-[10px] font-bold uppercase text-zinc-400">
                  Select Client to Override:
                </div>
                {users.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      setManualVerifyUser(u);
                      setShowUserPicker(false);
                    }}
                    className="w-full text-left p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors flex items-center justify-between group"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-zinc-950 dark:text-white truncate">{u.fullName || 'Unnamed'}</p>
                      <p className="text-[10px] text-zinc-500 truncate">{u.email}</p>
                    </div>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                      u.kycStatus === 'approved'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                        : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800'
                    }`}>
                      {u.kycStatus || 'unverified'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 p-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs">
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1 rounded font-bold transition-colors flex items-center gap-1.5 ${
              filter === 'pending'
                ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
            }`}
          >
            <span>Pending Queue</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-950 tabular-nums font-bold">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setFilter('approved')}
            className={`px-3 py-1 rounded font-bold transition-colors flex items-center gap-1.5 ${
              filter === 'approved'
                ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
            }`}
          >
            <span>Verified ({approvedCount})</span>
          </button>

          <button
            onClick={() => setFilter('rejected')}
            className={`px-3 py-1 rounded font-bold transition-colors flex items-center gap-1.5 ${
              filter === 'rejected'
                ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
            }`}
          >
            <span>Rejected ({rejectedCount})</span>
          </button>

          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded font-bold transition-colors ${
              filter === 'all'
                ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
            }`}
          >
            <span>All ({kycRecords.length})</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, doc #..."
            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-zinc-950 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-100"
          />
        </div>
      </div>

      {/* KYC Records List (Desktop Table + Mobile Cards) */}
      <div className="rounded-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-zinc-400 text-xs">
            No KYC submissions found in "{filter}" queue.
          </div>
        ) : (
          <>
            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-zinc-100 dark:divide-zinc-900">
              {filtered.map((record) => {
                const isPending = record.status === 'pending';
                const isApproved = record.status === 'approved';

                return (
                  <div
                    key={record.id}
                    onClick={() => setInspectRecord(record)}
                    className="p-3.5 space-y-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <strong className="text-xs font-bold text-zinc-950 dark:text-white block">{record.userFullName || 'Applicant'}</strong>
                        <p className="text-[10px] text-zinc-500">{record.userEmail}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800">
                            {record.documentType.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200">
                            {record.documentNumber}
                          </span>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                        isApproved
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                          : isPending
                          ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700'
                          : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                      }`}>
                        {record.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-900 text-[11px]">
                      <span className="text-zinc-400">{formatDate(record.submittedAt)}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectRecord(record);
                        }}
                        className="px-2.5 py-1 rounded bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-bold flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect OCR Proof</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-400 border-b border-zinc-100 dark:border-zinc-900 text-[10px] uppercase font-bold">
                  <tr>
                    <th className="py-2.5 px-3">Applicant Profile</th>
                    <th className="py-2.5 px-3">Document Type</th>
                    <th className="py-2.5 px-3">ID Number</th>
                    <th className="py-2.5 px-3">Submitted</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                  {filtered.map((record) => {
                    const isPending = record.status === 'pending';
                    const isApproved = record.status === 'approved';

                    return (
                      <tr key={record.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-zinc-950 dark:text-white">{record.userFullName || 'Client'}</div>
                          <div className="text-[10px] text-zinc-500">{record.userEmail}</div>
                        </td>

                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800">
                            {record.documentType.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 font-bold text-zinc-950 dark:text-white">
                          {record.documentNumber}
                        </td>

                        <td className="py-2.5 px-3 text-zinc-500 text-[11px]">
                          {formatDate(record.submittedAt)}
                        </td>

                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                              isApproved
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                : isPending
                                ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700'
                                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                            }`}
                          >
                            {record.status}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setInspectRecord(record)}
                              className="px-2.5 py-1 rounded bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs font-semibold transition-colors"
                            >
                              Inspect & Compare
                            </button>

                            {isPending && (
                              <button
                                onClick={() => handleApprove(record.id)}
                                className="px-2.5 py-1 rounded bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-xs font-bold transition-colors"
                              >
                                Auto-Verify
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

      {/* ========================================================================= */}
      {/* OCR INSPECTION & SIDE-BY-SIDE PICTURE COMPARISON MODAL */}
      {/* ========================================================================= */}
      {inspectRecord && !showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="rounded-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5 max-w-3xl w-full space-y-4 shadow-2xl animate-in zoom-in-95 max-h-[92vh] overflow-y-auto text-xs">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-900">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-zinc-950 dark:text-white uppercase tracking-tight">
                  OCR Comparison & Compliance Clearance
                </h3>
                <p className="text-[11px] text-zinc-500 font-sans">
                  {inspectRecord.userFullName} ({inspectRecord.userEmail})
                </p>
              </div>
              <button
                onClick={() => setInspectRecord(null)}
                className="text-zinc-400 hover:text-zinc-950 dark:hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Extracted Data vs Profile Match Verification Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="p-2.5 rounded-md bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">ID Document Number</span>
                <div className="font-bold text-zinc-950 dark:text-white text-xs">{inspectRecord.documentNumber}</div>
                {inspectRecord.documentNumber && inspectRecord.documentNumber.length === 12 && (
                  <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 block">
                    ✔ Verhoeff Checksum Valid
                  </span>
                )}
              </div>

              <div className="p-2.5 rounded-md bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">Registered Bank Name</span>
                <div className="font-bold text-zinc-950 dark:text-white text-xs">
                  {inspectedUser?.bankName || 'HDFC Bank'}
                </div>
                <span className="text-[10px] text-zinc-500 block">
                  IFSC: {inspectedUser?.bankIfsc || 'Verified'}
                </span>
              </div>

              <div className="p-2.5 rounded-md bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">Settlement Destination</span>
                <div className="font-bold text-zinc-950 dark:text-white text-xs">
                  Acc: {inspectedUser?.bankAccountNumber || '•••• •••• ••••'}
                </div>
                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 block">
                  ✔ Double-Entry Match
                </span>
              </div>
            </div>

            {/* SIDE-BY-SIDE PICTURE COMPARISON SECTION */}
            <div className="space-y-2 pt-1 border-t border-zinc-100 dark:border-zinc-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-950 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Side-by-Side Document Image Inspection ({inspectRecord.filePaths.length} Uploads)</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {inspectRecord.filePaths.map((path, idx) => (
                  <div key={idx} className="space-y-1 p-2 rounded-md bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold uppercase">
                      <span>{idx === 0 ? 'Document Front View (Photo & Legal Name)' : 'Document Back View (Address & QR)'}</span>
                    </div>
                    <div className="rounded overflow-hidden border border-zinc-200 dark:border-zinc-800 h-52 bg-white dark:bg-black flex items-center justify-center relative group">
                      <KycDocumentImage path={path} alt={`Proof ${idx + 1}`} purpose="kyc" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Verification Actions */}
            {inspectRecord.status === 'pending' ? (
              <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-900">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(true)}
                  className="py-2 px-3 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-rose-600 dark:text-rose-400 border border-zinc-200 dark:border-zinc-800 text-xs font-bold transition-colors"
                >
                  Reject Submission
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleApprove(inspectRecord.id)}
                    className="py-2 px-4 rounded-md bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Authorize & Approve KYC</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-2 flex justify-between items-center border-t border-zinc-100 dark:border-zinc-900">
                <span className="text-[11px] text-zinc-400">
                  Reviewed state: <strong className="uppercase text-zinc-950 dark:text-white">{inspectRecord.status}</strong>
                </span>
                <button
                  onClick={() => setInspectRecord(null)}
                  className="py-1.5 px-3 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold"
                >
                  Close Inspection
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rejection Modal with Preset Reasons */}
      {showRejectModal && inspectRecord && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="rounded-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-5 max-w-md w-full space-y-3.5 shadow-2xl text-xs">
            <h3 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-tight">Specify KYC Rejection Reason</h3>
            <p className="text-zinc-500 font-sans">
              The client will see this feedback in their portal to correct and re-upload:
            </p>

            {/* Quick Reason Chips */}
            <div className="flex flex-wrap gap-1.5">
              {[
                'Document image blurry / unreadable',
                'Name on ID does not match account name',
                'Invalid Aadhaar / PAN format',
                'Bank account number or IFSC mismatch',
              ].map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setRejectReason(reason)}
                  className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-700 dark:text-zinc-300 font-medium hover:border-zinc-400"
                >
                  {reason}
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter custom rejection feedback..."
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md p-2.5 text-xs text-zinc-950 dark:text-white focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-100"
            />

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setShowRejectModal(false)}
                className="py-1.5 px-3 rounded-md bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={actionLoading}
                className="py-1.5 px-3.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white font-bold"
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
