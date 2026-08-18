'use client';

import React, { useState } from 'react';
import { MessageSquare, X, Send, Headphones, CheckCircle2, Clock, Plus, ChevronRight, LifeBuoy } from 'lucide-react';
import { useApp } from '@/lib/store';
import { SupportTicket } from '@/lib/types';

export const SupportChatWidget: React.FC = () => {
  const {
    currentUser,
    supportTickets,
    ticketMessages,
    createSupportTicket,
    sendChatMessage,
  } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'history'>('chat');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // New Ticket Form State
  const [showNewForm, setShowNewForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<SupportTicket['category']>('general');
  const [message, setMessage] = useState('');

  // Active Chat Message Input
  const [chatInput, setChatInput] = useState('');

  // Filter tickets for current user
  const userTickets = supportTickets.filter(
    (t) => t.userId === currentUser?.id || t.userEmail === currentUser?.email
  );

  const activeTicket = userTickets.find((t) => t.id === selectedTicketId) || userTickets[0];
  const messages = activeTicket ? ticketMessages[activeTicket.id] || [] : [];

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    const newId = await createSupportTicket(subject, category, message);
    setSelectedTicketId(newId);
    setShowNewForm(false);
    setSubject('');
    setMessage('');
    setActiveTab('chat');
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeTicket) return;
    sendChatMessage(activeTicket.id, chatInput);
    setChatInput('');
  };

  return (
    <>
      {/* Floating Action Launcher Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-20 sm:bottom-6 right-5 z-40 p-3.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-600/30 transition-all active:scale-95 flex items-center gap-2 font-bold text-xs"
        aria-label="Support & Live Chat"
      >
        <Headphones className="w-5 h-5" />
        <span className="hidden sm:inline">Support Chat</span>
      </button>

      {/* Floating Support Window */}
      {isOpen && (
        <div className="fixed bottom-20 sm:bottom-20 right-4 sm:right-6 z-50 w-full max-w-sm sm:max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[520px] animate-fadeIn">
          
          {/* Header */}
          <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <LifeBuoy className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="font-bold text-xs text-white">Global Forex Support</h3>
                <p className="text-[10px] text-slate-400">24/7 Dealing Desk Assistance</p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Sub Navigation Bar */}
          <div className="flex items-center border-b border-slate-100 bg-slate-50 text-xs shrink-0">
            <button
              onClick={() => {
                setActiveTab('chat');
                setShowNewForm(false);
              }}
              className={`flex-1 py-2.5 font-bold border-b-2 text-center transition-all ${
                activeTab === 'chat' && !showNewForm
                  ? 'border-emerald-600 text-emerald-700 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              💬 Live Chat
            </button>

            <button
              onClick={() => {
                setActiveTab('history');
                setShowNewForm(false);
              }}
              className={`flex-1 py-2.5 font-bold border-b-2 text-center transition-all ${
                activeTab === 'history'
                  ? 'border-emerald-600 text-emerald-700 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              📋 History ({userTickets.length})
            </button>
          </div>

          {/* Body Section */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
            
            {/* Create New Ticket Form */}
            {showNewForm ? (
              <form onSubmit={handleCreateTicket} className="space-y-3 text-xs bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="font-bold text-slate-900">Start New Support Ticket</h4>
                  <button
                    type="button"
                    onClick={() => setShowNewForm(false)}
                    className="text-slate-400 hover:text-slate-700"
                  >
                    Cancel
                  </button>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Deposit verification query"
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900"
                  >
                    <option value="deposit">Deposit & Payment</option>
                    <option value="withdrawal">Withdrawal Payout</option>
                    <option value="kyc">KYC Verification</option>
                    <option value="trading">Trading Position</option>
                    <option value="general">General Support</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Message</label>
                  <textarea
                    rows={3}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your issue or request..."
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
                >
                  Submit & Open Live Chat
                </button>
              </form>
            ) : activeTab === 'chat' ? (
              
              /* Live Chat Stream */
              activeTicket ? (
                <div className="flex flex-col h-full justify-between space-y-3">
                  
                  {/* Ticket Header Pill */}
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs shrink-0">
                    <div className="truncate">
                      <strong className="text-slate-900 block truncate">{activeTicket.subject}</strong>
                      <span className="text-[10px] text-slate-500 uppercase">{activeTicket.category}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      activeTicket.status === 'open' ? 'bg-emerald-100 text-emerald-800' :
                      activeTicket.status === 'in_progress' ? 'bg-sky-100 text-sky-800' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {activeTicket.status}
                    </span>
                  </div>

                  {/* Messages Bubble List */}
                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                    {messages.map((m) => {
                      const isClient = m.senderRole === 'client';
                      return (
                        <div
                          key={m.id}
                          className={`flex flex-col ${isClient ? 'items-end' : 'items-start'}`}
                        >
                          <div className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                            isClient
                              ? 'bg-emerald-600 text-white rounded-br-none shadow-sm'
                              : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-sm'
                          }`}>
                            <span className="text-[10px] font-bold block opacity-75 mb-0.5">
                              {m.senderName}
                            </span>
                            {m.message}
                          </div>
                          <span className="text-[9px] text-slate-400 mt-1">
                            {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Message Input Box */}
                  <form onSubmit={handleSendMessage} className="flex items-center gap-2 pt-2 border-t border-slate-200 shrink-0">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                    <button
                      type="submit"
                      className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>

                </div>
              ) : (
                <div className="text-center py-10 space-y-3 bg-white p-6 rounded-xl border border-slate-200">
                  <MessageSquare className="w-8 h-8 text-slate-400 mx-auto" />
                  <h4 className="text-xs font-bold text-slate-800">No active support chat</h4>
                  <p className="text-[11px] text-slate-500">Need help with a deposit, withdrawal, or trade?</p>
                  <button
                    onClick={() => setShowNewForm(true)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                  >
                    Start New Live Chat
                  </button>
                </div>
              )

            ) : (

              /* Support Ticket History List */
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-bold text-slate-800">Your Support Tickets</span>
                  <button
                    onClick={() => setShowNewForm(true)}
                    className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> New Ticket
                  </button>
                </div>

                {userTickets.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSelectedTicketId(t.id);
                      setActiveTab('chat');
                    }}
                    className="w-full p-3 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 text-left transition-all flex items-center justify-between"
                  >
                    <div className="space-y-1 truncate pr-2">
                      <strong className="text-xs text-slate-900 block truncate">{t.subject}</strong>
                      <p className="text-[11px] text-slate-500 truncate">{t.lastMessage}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>
                ))}
              </div>

            )}

          </div>

        </div>
      )}
    </>
  );
};
