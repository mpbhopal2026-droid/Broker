'use client';

import React from 'react';

/**
 * Loading placeholder shaped like the real layout.
 *
 * A skeleton beats a spinner here because the layout is already known: showing
 * its shape keeps the page from jumping when content arrives, and reads as
 * "loading" rather than "broken". Marked aria-busy with a polite live region so
 * screen readers announce the wait instead of reading a wall of empty boxes.
 */

const Bar: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse rounded bg-slate-200/70 dark:bg-slate-700/40 ${className}`} />
);

export const AuthSkeleton: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center px-4" aria-busy="true" aria-live="polite">
    <span className="sr-only">Loading sign-in…</span>
    <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 space-y-5">
      <Bar className="h-20 w-20 rounded-2xl mx-auto" />
      <Bar className="h-3 w-40 mx-auto" />
      <div className="space-y-2 pt-2">
        <Bar className="h-3 w-24" />
        <Bar className="h-10 w-full rounded-xl" />
      </div>
      <Bar className="h-11 w-full rounded-xl" />
    </div>
  </div>
);

import { DashboardSkeleton } from './DashboardSkeleton';

export const AppSkeleton: React.FC<{ withSidebar?: boolean }> = ({ withSidebar = true }) => (
  <div className="flex min-h-screen w-full" aria-busy="true" aria-live="polite">
    <span className="sr-only">Loading your account…</span>

    {withSidebar && (
      <aside className="hidden md:flex w-60 shrink-0 flex-col gap-2 border-r border-slate-200 dark:border-slate-800 p-4">
        <div className="flex items-center gap-2.5 pb-6">
          <Bar className="w-7 h-7 rounded-lg" />
          <Bar className="h-4 w-28" />
        </div>
        {Array.from({ length: 7 }).map((_, i) => (
          <Bar key={i} className="h-9 w-full" />
        ))}
      </aside>
    )}

    <div className="flex-1 flex flex-col min-w-0">
      <header className="h-14 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-6">
        <Bar className="h-4 w-32" />
        <div className="flex items-center gap-2">
          <Bar className="h-8 w-24 rounded-lg" />
          <Bar className="h-8 w-8 rounded-full" />
        </div>
      </header>

      <main className="flex-1 p-3 sm:p-6 overflow-x-hidden">
        <DashboardSkeleton />
      </main>
    </div>
  </div>
);
