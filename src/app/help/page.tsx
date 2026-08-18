'use client';

import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  LifeBuoy,
  Mail,
  Phone,
  Clock,
  ShieldCheck,
  ChevronDown,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Headphones,
  Search
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { SupportTicket } from '@/lib/types';

export default function HelpPage() {
  const {
    currentUser,
    supportTickets,
    ticketMessages,
    createSupportTicket,
    sendChatMessage,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'chat' | 'contact' | 'faqs'>('chat');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // New Ticket Form
  const [showNewForm, setShowNewForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<SupportTicket['category']>('deposit');
  const [initialMessage, setInitialMessage] = useState('');

  // Active Chat Message Input
  const [chatInput, setChatInput] = useState('');

  // FAQ Search
  const [faqSearch, setFaqSearch] = useState('');
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  // Filter tickets for current user
  const userTickets = supportTickets.filter(
    (t) => t.userId === currentUser?.id || t.userEmail === currentUser?.email
  );

  const activeTicket = userTickets.find((t) => t.id === selectedTicketId) || userTickets[0];
  const messages = activeTicket ? ticketMessages[activeTicket.id] || [] : [];

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !initialMessage.trim()) return;

    const newId = await createSupportTicket(subject, category, initialMessage);
    setSelectedTicketId(newId);
    setShowNewForm(false);
    setSubject('');
    setInitialMessage('');
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeTicket) return;
    sendChatMessage(activeTicket.id, chatInput);
    setChatInput('');
  };

  const faqs = [
    {
      q: 'How are manual INR deposits credited to my wallet?',
      a: 'When you transfer funds via UPI or Net Banking and submit your 12-digit UTR number, the Dealing Desk verifies receipt in the bank portal and approves the credit. The INR is converted to USD at the current deposit rate and credited immediately.',
    },
    {
      q: 'How fast are withdrawal payouts processed?',
      a: 'Withdrawal payout requests submitted during banking hours are processed via domestic IMPS or UPI within 15 to 30 minutes following compliance verification.',
    },
    {
      q: 'What documents are accepted for KYC verification?',
      a: 'We accept PAN Card, Aadhaar Card, Passport, Voter ID, or Driving License. Document photos are encrypted under India\'s Digital Personal Data Protection (DPDP) Act 2023.',
    },
    {
      q: 'What are the dealing desk trading hours?',
      a: 'Forex and Commodities markets trade 24 hours a day, 5 days a week (Monday 00:00 GMT to Friday 23:59 GMT). Cryptocurrencies trade 24/7.',
    },
    {
      q: 'Can I trade on a demo account before depositing real funds?',
      a: 'Yes! You can toggle to Demo Mode at any time from your sidebar/navbar to practice trading with virtual capital risk-free.',
    },
  ];

  const filteredFaqs = faqs.filter(
    (f) =>
      f.q.toLowerCase().includes(faqSearch.toLowerCase()) ||
      f.a.toLowerCase().includes(faqSearch.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="bg-white dark:bg-[#0f172a] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <LifeBuoy className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Help & Support Center
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            24/7 Live Dealing Desk Chat, ticket history, direct support lines, and trading FAQs.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl text-xs font-bold shrink-0 border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'chat'
                ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            💬 Live Support Chat
          </button>
          <button
            onClick={() => setActiveTab('contact')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'contact'
                ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            📞 Contact Lines
          </button>
          <button
            onClick={() => setActiveTab('faqs')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'faqs'
                ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            ❓ FAQs
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Support Tickets List (4 cols) */}
          <div className="lg:col-span-4 bg-white dark:bg-[#0f172a] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Support Requests</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Your open & resolved tickets</p>
              </div>
              <button
                onClick={() => setShowNewForm(true)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                New Ticket
              </button>
            </div>

            {/* Tickets List */}
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {userTickets.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-400 space-y-2">
                  <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p>No active support tickets.</p>
                  <button
                    onClick={() => setShowNewForm(true)}
                    className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                  >
                    Create your first ticket
                  </button>
                </div>
              ) : (
                userTickets.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSelectedTicketId(t.id);
                      setShowNewForm(false);
                    }}
                    className={`w-full p-3 rounded-xl border text-left transition-all space-y-1.5 ${
                      selectedTicketId === t.id || (!selectedTicketId && activeTicket?.id === t.id)
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 shadow-2xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{t.subject}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${
                        t.status === 'open' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' :
                        t.status === 'in_progress' ? 'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}>
                        {t.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{t.lastMessage}</p>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-mono">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right Column: Live Chat Screen or New Form (8 cols) */}
          <div className="lg:col-span-8 bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden flex flex-col h-[560px]">
            
            {showNewForm ? (
              /* Create New Ticket Form */
              <div className="p-6 space-y-4 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">Submit New Support Request</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Connect directly with a dealing desk support officer</p>
                  </div>
                  <button
                    onClick={() => setShowNewForm(false)}
                    className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white font-bold"
                  >
                    Cancel
                  </button>
                </div>

                <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Subject / Issue Title</label>
                    <input
                      type="text"
                      required
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. Deposit UTR verification query"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-slate-900 dark:text-white focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-slate-900 dark:text-white focus:border-emerald-500"
                    >
                      <option value="deposit">Deposit & Payment Verification</option>
                      <option value="withdrawal">Withdrawal Payout Query</option>
                      <option value="kyc">KYC Identity Review</option>
                      <option value="trading">Trading Position Assistance</option>
                      <option value="general">General Advisory Query</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Detailed Description</label>
                    <textarea
                      rows={5}
                      required
                      value={initialMessage}
                      onChange={(e) => setInitialMessage(e.target.value)}
                      placeholder="Please enter all relevant details (e.g. UTR number, deposit amount, transaction ID)..."
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-slate-900 dark:text-white focus:border-emerald-500 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all"
                  >
                    Submit Ticket & Launch Live Chat
                  </button>
                </form>
              </div>
            ) : activeTicket ? (
              /* Live Chat Stream Screen */
              <div className="flex flex-col h-full">
                
                {/* Chat Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 flex items-center justify-between shrink-0">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{activeTicket.subject}</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Category: <span className="uppercase font-semibold">{activeTicket.category}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                      activeTicket.status === 'open' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' :
                      activeTicket.status === 'in_progress' ? 'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}>
                      {activeTicket.status}
                    </span>
                  </div>
                </div>

                {/* Messages Body */}
                <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/40 dark:bg-slate-900/30">
                  {messages.map((m) => {
                    const isClient = m.senderRole === 'client';
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isClient ? 'items-end' : 'items-start'}`}
                      >
                        <div className={`max-w-[80%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                          isClient
                            ? 'bg-emerald-600 text-white rounded-br-none shadow-2xs'
                            : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-bl-none shadow-2xs'
                        }`}>
                          <span className="text-[10px] font-bold block opacity-80 mb-1">
                            {m.senderName}
                          </span>
                          {m.message}
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-mono">
                          {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Input Bar */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0f172a] flex items-center gap-2 shrink-0">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type your message to support..."
                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send</span>
                  </button>
                </form>

              </div>
            ) : (
              <div className="text-center py-16 px-6 space-y-4 m-auto">
                <Headphones className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Need Help or Trade Guidance?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Our 24/7 Dealing Desk Support Team is available to verify deposits, process payouts, and assist with trading.
                </p>
                <button
                  onClick={() => setShowNewForm(true)}
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
                >
                  Start New Support Request
                </button>
              </div>
            )}

          </div>

        </div>
      )}

      {activeTab === 'contact' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-[#0f172a] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <Mail className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Dealing Desk Support Email</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">support@globalforex.com</p>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono block">SLA: 5-10 Minutes</span>
          </div>

          <div className="bg-white dark:bg-[#0f172a] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <Phone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Direct Phone Desk (India)</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">+91 731 498 1200</p>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono block">Mon - Sat: 9:00 AM to 11:30 PM IST</span>
          </div>

          <div className="bg-white dark:bg-[#0f172a] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <ShieldCheck className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              <span>Grievance Officer (India DPDP Act)</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">grievance@globalforex.com</p>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono block">Indore (MP), India • SLA: 24 Hours</span>
          </div>

          <div className="bg-white dark:bg-[#0f172a] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <span>Trading Market Hours</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">Forex & Commodities: 24/5 (Mon-Fri) • Crypto: 24/7</p>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono block">Dealing Desk Active</span>
          </div>
        </div>
      )}

      {activeTab === 'faqs' && (
        <div className="bg-white dark:bg-[#0f172a] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={faqSearch}
              onChange={(e) => setFaqSearch(e.target.value)}
              placeholder="Search frequently asked questions..."
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white focus:border-emerald-500"
            />
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            {filteredFaqs.map((faq, i) => (
              <div key={i} className="bg-white dark:bg-[#0f172a]">
                <button
                  onClick={() => setOpenFaqIdx(openFaqIdx === i ? null : i)}
                  className="w-full p-4 flex items-center justify-between text-left text-xs font-bold text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openFaqIdx === i ? 'rotate-180 text-emerald-600' : ''}`} />
                </button>
                {openFaqIdx === i && (
                  <div className="p-4 pt-0 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800 font-sans">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
