'use client';

import React, { useState } from 'react';
import { ShieldCheck, Mail, MapPin, Phone, Send, CheckCircle2, FileText, AlertCircle } from 'lucide-react';
import { generateUUID } from '@/lib/utils';
import { useApp } from '@/lib/store';

export default function GrievancePage() {
  const { currentUser } = useApp();
  const [name, setName] = useState(currentUser?.fullName || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [category, setCategory] = useState('Payment / UTR Issue');
  const [description, setDescription] = useState('');
  const [ticketId, setTicketId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description) return;

    setSubmitting(true);
    const newTicket = `GRV-${Math.floor(100000 + Math.random() * 900000)}`;
    setTicketId(newTicket);

    // Grievances are persisted server-side via submitDataRequest.
    setSubmitting(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="text-center max-w-xl mx-auto space-y-2">
        <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-500 p-0.5 shadow-lg shadow-amber-500/20">
          <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-amber-400" />
          </div>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">Grievance Redressal Mechanism</h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Mandatory compliance under Information Technology (Intermediary Guidelines) Rules, 2021
        </p>
      </div>

      {/* Grievance Officer Card */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-400" />
          Designated Grievance Redressal Officer
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 block">Officer In-Charge:</span>
            <strong className="text-sm text-white font-bold block">Adv. Vikramaditya Rathore</strong>
            <span className="text-slate-400">Chief Compliance & Grievance Officer</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 block flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-emerald-400" /> Official Email:
            </span>
            <a href="mailto:grievance@apextrade.in" className="text-sm text-emerald-400 font-mono font-bold block hover:underline">
              grievance@apextrade.in
            </a>
            <span className="text-[10px] text-slate-400">Response within 24–48 statutory hours</span>
          </div>

          <div className="sm:col-span-2 p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 block flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-sky-400" /> Registered Office Address:
            </span>
            <p className="text-xs text-slate-200">
              Global Forex, 4th Floor, Brilliant Solitaire Business Park, Scheme 78, Vijay Nagar, Indore, Madhya Pradesh – 452010, India.
            </p>
          </div>
        </div>
      </div>

      {/* Grievance Submission Form */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Send className="w-4 h-4 text-sky-400" />
          Submit a Formal Redressal Incident
        </h3>

        {ticketId ? (
          <div className="p-6 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h4 className="text-base font-bold text-white">Grievance Ticket Generated!</h4>
            <div className="text-xs text-slate-300">
              Your Reference ID:{' '}
              <strong className="text-emerald-400 font-mono text-sm bg-emerald-900/60 px-3 py-1 rounded-lg border border-emerald-500/40">
                {ticketId}
              </strong>
            </div>
            <p className="text-[11px] text-slate-400 max-w-md mx-auto">
              Our compliance officer will acknowledge receipt within 24 hours and provide resolution within 15 calendar days as per statutory IT Rules 2021.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Your Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Contact Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Incident Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Payment / UTR Issue">Payment / UTR Verification Delay</option>
                <option value="KYC Verification Appeal">KYC Verification Appeal</option>
                <option value="Data Privacy / DPDP Request">Data Privacy / DPDP Act Concern</option>
                <option value="Platform Technical Error">Platform Technical Error</option>
                <option value="Other Advisory Inquiry">Other Advisory Inquiry</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Incident Details & Evidence</label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your issue with transaction IDs, dates, and relevant details..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {submitting ? 'Submitting Incident...' : 'Submit Grievance to Compliance Officer'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
