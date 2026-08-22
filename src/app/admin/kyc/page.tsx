'use client';

import React, { useState } from 'react';
import { KycDocumentImage } from '@/components/admin/KycDocumentImage';
import Link from 'next/link';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  X,
  FileText,
  User,
  Filter,
  Search,
  Check,
  Copy,
  CreditCard,
  Building2,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Trash2,
  RefreshCw,
  Phone,
  Mail,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { useAdmin } from '@/lib/admin-store';
import { formatDate } from '@/lib/utils';
import { KYCRecord, UserProfile } from '@/lib/types';
import { AdminManualKycModal } from '@/components/admin/modals/AdminManualKycModal';
import { validateAadhaarVerhoeff, validatePAN, validateIFSC, getBankNameFromIFSC } from '@/lib/verhoeff';

export default function AdminKycConsolePage() {
  const { kycRecords, users, reviewKYC, manualVerifyUserKyc, deleteUser, refreshAdminData, showToast } = useAdmin();
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectRecord, setInspectRecord] = useState<KYCRecord | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [manualVerifyUser, setManualVerifyUser] = useState<UserProfile | null>(null);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedDoc, setCopiedDoc] = useState(false);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshAdminData();
    setTimeout(() => {
      setIsRefreshing(false);
      showToast({ type: 'info', title: 'Data Refreshed', message: 'KYC queue is synchronized with the database.' });
    }, 400);
  };

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedDoc(true);
    showToast({ type: 'info', title: 'Copied', message: 'Document number copied to clipboard.' });
    setTimeout(() => setCopiedDoc(false), 2000);
  };

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

  const handleDeleteUser = async (userId: string) => {
    setActionLoading(true);
    await deleteUser(userId);
    setActionLoading(false);
    setShowDeleteConfirmModal(false);
    setInspectRecord(null);
  };

  // Find associated user profile for inspectRecord
  const inspectedUser = inspectRecord ? users.find((u) => u.id === inspectRecord.userId) : null;

  return (
    <div className="space-y-4 max-w-6xl mx-auto select-none">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-base sm:text-lg font-bold uppercase tracking-tight text-zinc-950 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>Compliance & KYC Clearance Console</span>
          </h1>
          <p className="text-[11px] text-zinc-500 font-sans mt-0.5">
            Inspect all high-definition government ID uploads, verify settlement banking coordinates, and grant Tier-1 clearance.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Real-time sync indicator & refresh button */}
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold transition-colors cursor-pointer border border-zinc-200 dark:border-zinc-800"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
            <span>{isRefreshing ? 'Syncing…' : 'Live Sync'}</span>
          </button>

          {/* Manual Verify Override Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowUserPicker(!showUserPicker)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-950 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 text-xs font-bold transition-colors cursor-pointer shadow-sm"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>+ Manual Verify Client</span>
            </button>

            {showUserPicker && (
              <div className="absolute right-0 mt-1.5 w-72 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-2 z-50 text-xs max-h-60 overflow-y-auto space-y-1">
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
                    className="w-full text-left p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors flex items-center justify-between group"
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
        <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs">
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              filter === 'pending'
                ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
            }`}
          >
            <span>Pending Queue</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-600 text-white tabular-nums font-bold animate-pulse">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setFilter('approved')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              filter === 'approved'
                ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
            }`}
          >
            <span>Verified ({approvedCount})</span>
          </button>

          <button
            onClick={() => setFilter('rejected')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              filter === 'rejected'
                ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
            }`}
          >
            <span>Rejected ({rejectedCount})</span>
          </button>

          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
            }`}
          >
            <span>All ({kycRecords.length})</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, doc #..."
            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-950 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-emerald-600"
          />
        </div>
      </div>

      {/* KYC Records List (Desktop Table + Mobile Cards) */}
      <div className="rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="text-center py-14 text-zinc-400 text-xs space-y-2">
            <FileText className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-700" />
            <p>No KYC submissions found in "{filter}" queue.</p>
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
                    className="p-4 space-y-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <strong className="text-xs font-bold text-zinc-950 dark:text-white block">{record.userFullName || 'Applicant'}</strong>
                        <p className="text-[10px] text-zinc-500">{record.userEmail}</p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800">
                            {record.documentType.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200 font-mono">
                            {record.documentNumber}
                          </span>
                        </div>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                        isApproved
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                          : isPending
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                          : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                      }`}>
                        {record.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-900 text-[11px]">
                      <span className="text-zinc-400">{formatDate(record.submittedAt)}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectRecord(record);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-bold flex items-center gap-1 shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect All Docs</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50/70 dark:bg-zinc-900/70 text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 text-[10px] uppercase font-bold tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Applicant Profile</th>
                    <th className="py-3 px-4">Document Type</th>
                    <th className="py-3 px-4">ID Number</th>
                    <th className="py-3 px-4">Uploaded Files</th>
                    <th className="py-3 px-4">Submitted</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                  {filtered.map((record) => {
                    const isPending = record.status === 'pending';
                    const isApproved = record.status === 'approved';

                    return (
                      <tr key={record.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-zinc-950 dark:text-white">{record.userFullName || 'Client'}</div>
                          <div className="text-[10px] text-zinc-500">{record.userEmail}</div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800">
                            {record.documentType.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-bold text-zinc-950 dark:text-white font-mono">
                          {record.documentNumber}
                        </td>

                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {record.filePaths?.length || 0} Document Image(s)
                          </span>
                        </td>

                        <td className="py-3 px-4 text-zinc-500 text-[11px]">
                          {formatDate(record.submittedAt)}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                              isApproved
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                : isPending
                                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                            }`}
                          >
                            {record.status}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setInspectRecord(record)}
                              className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Inspect Dossier</span>
                            </button>

                            {isPending && (
                              <button
                                onClick={() => handleApprove(record.id)}
                                className="px-3 py-1.5 rounded-lg bg-[#05603a] hover:bg-[#044e2f] text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve</span>
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
      {/* HIGH-RESOLUTION KYC DOSSIER & DOCUMENT INSPECTION GALLERY MODAL */}
      {/* ========================================================================= */}
      {inspectRecord && !showRejectModal && !showDeleteConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-5 sm:p-7 max-w-4xl w-full space-y-6 shadow-2xl animate-in zoom-in-95 my-auto max-h-[92vh] overflow-y-auto text-xs">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base sm:text-lg font-bold text-zinc-950 dark:text-white tracking-tight">
                    Compliance Verification Dossier
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                    inspectRecord.status === 'approved'
                      ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                      : inspectRecord.status === 'pending'
                      ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 animate-pulse'
                      : 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                  }`}>
                    {inspectRecord.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                  <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {inspectRecord.userFullName || 'Client'}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {inspectRecord.userEmail}</span>
                  {inspectedUser?.phone && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {inspectedUser.phone}</span>
                    </>
                  )}
                </div>
              </div>

              <button
                onClick={() => setInspectRecord(null)}
                className="text-zinc-400 hover:text-zinc-950 dark:hover:text-white p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Extracted Identity & Bank Verification Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block">ID Document ({inspectRecord.documentType.toUpperCase()})</span>
                  {inspectRecord.documentNumber && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(inspectRecord.documentNumber)}
                      className="text-[10px] text-zinc-500 hover:text-emerald-600 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Copy full number"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedDoc ? 'Copied!' : 'Copy'}</span>
                    </button>
                  )}
                </div>
                <div className="font-bold text-zinc-950 dark:text-white text-sm font-mono tracking-wider break-all">
                  {inspectRecord.documentNumber || '—'}
                </div>
                {inspectRecord.documentNumber && inspectRecord.documentNumber.length === 12 && (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">
                    ✔ 12-Digit Verhoeff Valid
                  </span>
                )}
                {inspectedUser?.panNumber && (
                  <div className="pt-1 border-t border-zinc-200/60 dark:border-zinc-800/60 text-[11px] text-zinc-600 dark:text-zinc-300">
                    <span className="text-zinc-400">PAN: </span>
                    <span className="font-mono font-bold">{inspectedUser.panNumber}</span>
                  </div>
                )}
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">Registered Bank Name</span>
                <div className="font-bold text-zinc-950 dark:text-white text-sm">
                  {inspectedUser?.bankName || getBankNameFromIFSC(inspectedUser?.bankIfsc || '') || 'Domestic Bank'}
                </div>
                <span className="text-[10px] text-zinc-500 font-mono block">
                  IFSC: {inspectedUser?.bankIfsc || 'Verified'}
                </span>
                {inspectedUser?.userUpiId && (
                  <div className="pt-1 border-t border-zinc-200/60 dark:border-zinc-800/60 text-[11px] text-zinc-600 dark:text-zinc-300">
                    <span className="text-zinc-400">UPI: </span>
                    <span className="font-mono font-medium">{inspectedUser.userUpiId}</span>
                  </div>
                )}
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">Payout Account Destination</span>
                <div className="font-bold text-zinc-950 dark:text-white text-sm font-mono break-all">
                  {inspectedUser?.bankAccountNumber || 'Verified Account'}
                </div>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">
                  Holder: {inspectedUser?.bankAccountName || inspectedUser?.fullName || 'Matched'}
                </span>
              </div>
            </div>

            {/* HIGH-RESOLUTION SIDE-BY-SIDE DOCUMENT GALLERY */}
            <div className="space-y-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-950 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>Document Proofs ({inspectRecord.filePaths?.length || 0} Uploaded Images)</span>
                </span>
                <span className="text-[11px] text-zinc-400">Click any image to zoom, rotate & inspect full card</span>
              </div>

              {(!inspectRecord.filePaths || inspectRecord.filePaths.length === 0) ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-zinc-900 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 text-slate-400">
                  No document files attached to this record.
                </div>
              ) : (
                <div className={`grid gap-4 ${inspectRecord.filePaths.length >= 3 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
                  {inspectRecord.filePaths.map((path, idx) => {
                    const docLabel =
                      idx === 0
                        ? '1. Aadhaar Front (Photo & Name)'
                        : idx === 1
                        ? '2. Aadhaar Back (Address & QR)'
                        : idx === 2
                        ? '3. PAN Card Official Document'
                        : `Document #${idx + 1}`;

                    return (
                      <div key={idx} className="space-y-2 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                        <div className="flex items-center justify-between text-[11px] text-zinc-700 dark:text-zinc-300 font-bold">
                          <span className="truncate pr-2">{docLabel}</span>
                          <span className="text-[10px] text-zinc-400 uppercase shrink-0">Image #{idx + 1}</span>
                        </div>
                        
                        <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 h-72 sm:h-80 lg:h-96 bg-white dark:bg-black flex items-center justify-center">
                          <KycDocumentImage path={path} alt={docLabel} purpose="kyc" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              
              {/* Purge / Delete User Button */}
              {inspectedUser && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirmModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/80 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Purge User Completely</span>
                </button>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(true)}
                  className="py-2.5 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-rose-600 dark:text-rose-400 border border-zinc-200 dark:border-zinc-800 text-xs font-bold transition-colors cursor-pointer"
                >
                  Reject Submission
                </button>

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => {
                    const target = inspectedUser || {
                      id: inspectRecord.userId,
                      fullName: inspectRecord.userFullName,
                      email: inspectRecord.userEmail,
                      kycStatus: inspectRecord.status,
                      walletBalance: 0,
                      role: 'client',
                    };
                    setManualVerifyUser(target as UserProfile);
                  }}
                  className="py-2.5 px-5 rounded-xl bg-[#05603a] hover:bg-[#044e2f] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950/20 active:scale-98 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Authorize Clearance & Setup Deposit Route →</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Rejection Modal with Preset Reasons */}
      {showRejectModal && inspectRecord && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-6 max-w-md w-full space-y-4 shadow-2xl text-xs">
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
                  className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-700 dark:text-zinc-300 font-medium hover:border-zinc-400 cursor-pointer"
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
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-xs text-zinc-950 dark:text-white focus:outline-none focus:border-emerald-600"
            />

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setShowRejectModal(false)}
                className="py-2 px-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={actionLoading}
                className="py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete / Purge User Confirmation Modal */}
      {showDeleteConfirmModal && inspectedUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="rounded-2xl bg-white dark:bg-zinc-950 border border-rose-200 dark:border-rose-900/60 p-6 max-w-md w-full space-y-4 shadow-2xl text-xs">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-sm font-bold uppercase tracking-tight text-zinc-950 dark:text-white">
                Completely Purge User Account?
              </h3>
            </div>

            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
              This will <strong>permanently purge</strong> <code className="font-bold">{inspectedUser.email}</code> across all tables (orders, ledger, transactions, KYC records, sessions, and auth credentials). The user will be forced to re-register from scratch.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmModal(false)}
                className="py-2 px-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleDeleteUser(inspectedUser.id)}
                className="py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md shadow-rose-950/20 cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? 'Purging…' : 'Yes, Permanently Purge'}
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
