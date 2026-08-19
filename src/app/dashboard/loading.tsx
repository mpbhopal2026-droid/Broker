import React from 'react';

export default function DashboardLoading() {
  return (
    <div className="space-y-4 max-w-7xl mx-auto p-4 animate-pulse">
      <div className="h-6 w-36 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-zinc-100 dark:bg-zinc-900 rounded-md border border-zinc-200 dark:border-zinc-800" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 h-80 bg-zinc-100 dark:bg-zinc-900 rounded-md border border-zinc-200 dark:border-zinc-800" />
        <div className="lg:col-span-4 h-80 bg-zinc-100 dark:bg-zinc-900 rounded-md border border-zinc-200 dark:border-zinc-800" />
      </div>
    </div>
  );
}
