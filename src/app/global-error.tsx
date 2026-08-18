'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-[#0b0f17] text-white flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-2xl bg-[#0f172a] border border-slate-800 text-center space-y-4 shadow-2xl">
          <h2 className="text-xl font-bold">Application Error</h2>
          <p className="text-xs text-slate-400">A global application error occurred.</p>
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
