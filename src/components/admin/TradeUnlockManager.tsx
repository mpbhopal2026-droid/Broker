'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Zap,
  Lock,
  Unlock,
  Users,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { useAdmin } from '@/lib/admin-store';
import { formatUSD } from '@/lib/utils';
import { UserProfile } from '@/lib/types';

export const TradeUnlockManager: React.FC = () => {
  const { users, adminUpdateUserProfile, refreshAdminData, showToast } = useAdmin();
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Clients with accounts
  const clientUsers = users.filter((u) => u.role === 'client');

  const handleToggleTradeLock = async (user: UserProfile) => {
    setProcessingId(user.id);
    const newStatus = !user.isActive; // Toggle active trading permission
    const res = await adminUpdateUserProfile(user.id, { isActive: newStatus });
    setProcessingId(null);

    if (res?.success) {
      showToast({
        type: 'success',
        title: newStatus ? 'Trading Unlocked' : 'Trading Locked',
        message: `${user.fullName || user.email} is now ${newStatus ? 'UNLOCKED for Live Execution' : 'LOCKED (Dealing Desk Approval Required)'}.`,
      });
      await refreshAdminData();
    } else {
      showToast({
        type: 'error',
        title: 'Update Failed',
        message: res?.error || 'Could not update trading permission.',
      });
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4 font-sans text-slate-900">
      
      {/* Card Header with Active Green Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#e6f4ea] text-[#00875a] border border-[#b7e4c7] shadow-2xs">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <span>Live Trading Clearance & Unlock Desk</span>
              <span className="px-2 py-0.5 rounded-full bg-[#e6f4ea] text-[#00875a] text-[10px] font-bold lowercase">
                live
              </span>
            </h2>
            <p className="text-[11px] text-slate-500 font-normal mt-0.5">
              1-tap authorization to lock or unlock direct live market execution for clients.
            </p>
          </div>
        </div>

        <Link
          href="/admin/users"
          className="text-xs font-bold text-[#00875a] hover:text-[#00704a] flex items-center gap-1 self-start sm:self-auto"
        >
          <span>All {clientUsers.length} Clients</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Client List Rows */}
      <div className="divide-y divide-slate-100">
        {clientUsers.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 font-mono">
            No client accounts registered yet.
          </div>
        ) : (
          clientUsers.slice(0, 4).map((client) => {
            const isUnlocked = client.isActive !== false;
            const isKycApproved = client.kycStatus === 'approved';
            const isBusy = processingId === client.id;

            return (
              <div
                key={client.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 p-2 rounded-xl transition-colors"
              >
                {/* Client Meta */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 ${
                    isUnlocked
                      ? 'bg-[#e6f4ea] text-[#00875a] border border-[#b7e4c7]'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {client.fullName ? client.fullName.slice(0, 2).toUpperCase() : 'CL'}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 truncate">
                        {client.fullName || 'Client User'}
                      </span>
                      <span className={`px-2 py-0.2 rounded text-[9px] font-extrabold uppercase ${
                        isKycApproved
                          ? 'bg-[#e6f4ea] text-[#00875a]'
                          : client.kycStatus === 'pending'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        KYC {client.kycStatus || 'Unverified'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                      <span className="truncate max-w-[140px] sm:max-w-[200px]">{client.email}</span>
                      <span>·</span>
                      <strong className="text-slate-700 font-sans font-bold">
                        {formatUSD(client.walletBalance ?? 0)}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Status & 1-Tap Toggle Action */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <span className={`text-[11px] font-bold px-2 py-1 rounded-lg border ${
                    isUnlocked
                      ? 'bg-[#e6f4ea] text-[#00875a] border-[#b7e4c7]'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                    {isUnlocked ? 'Trading Unlocked' : 'Trading Locked'}
                  </span>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleToggleTradeLock(client)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer ${
                      isUnlocked
                        ? 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-700'
                        : 'bg-[#00875a] hover:bg-[#00704a] text-white shadow-xs'
                    }`}
                  >
                    {isBusy ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : isUnlocked ? (
                      <>
                        <Lock className="w-3.5 h-3.5 text-slate-500" />
                        <span>Lock</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3.5 h-3.5 text-white" />
                        <span>Unlock Trading</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
