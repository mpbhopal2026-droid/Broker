'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, X } from 'lucide-react';

export const StatutoryDisclaimer: React.FC = () => {
  const [closed, setClosed] = useState(false);

  if (closed) return null;

  return (
    <div className="bg-slate-900/90 border-b border-slate-800 text-[11px] text-slate-400 px-4 py-1.5 flex items-center justify-between">
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-2">
        <span className="truncate">
          <strong className="text-slate-300">Notice:</strong> Advisory & broker guidance platform. All funds routed via verified broker banking channels under RBI FEMA guidelines.
        </span>
        <button
          onClick={() => setClosed(true)}
          className="text-slate-500 hover:text-slate-300 p-0.5"
          aria-label="Close notice"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
