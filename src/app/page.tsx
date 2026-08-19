'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/store';
import { Loader2 } from 'lucide-react';

export default function RootPage() {
  const router = useRouter();
  const { currentUser, isLoaded } = useApp();

  useEffect(() => {
    if (!isLoaded) return;

    if (currentUser) {
      if (currentUser.role === 'admin' || currentUser.role === 'developer' || currentUser.role === 'staff') {
        router.replace('/admin');
      } else {
        router.replace('/dashboard');
      }
    } else {
      router.replace('/login');
    }
  }, [currentUser, isLoaded, router]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
      <Loader2 className="w-8 h-8 text-[#00875a] animate-spin" />
      <span className="text-xs font-mono text-slate-400">Loading Broker Terminal…</span>
    </div>
  );
}
