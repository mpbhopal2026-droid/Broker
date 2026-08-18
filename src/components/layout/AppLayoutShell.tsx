'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { DemoModeBanner } from '@/components/trading/AccountModeSwitch';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { useApp } from '@/lib/store';
import { AppSkeleton, AuthSkeleton } from '@/components/ui/AppSkeleton';
import { VerificationGate } from '@/components/layout/VerificationGate';
import { KycVerificationPromptModal } from '@/components/kyc/KycVerificationPromptModal';

/**
 * Everything sits behind sign-in.
 *
 * Only the auth and legal routes render for a signed-out visitor; anything else
 * bounces to /login. Middleware enforces the same rule server-side — this is the
 * client-side half so a visitor never sees a flash of an empty dashboard while
 * the redirect happens.
 *
 * While the session is resolving we render a skeleton rather than a blank page
 * or a full-screen spinner: the layout is already known, so showing its shape
 * makes the wait feel shorter and stops the content jumping when it arrives.
 */


// Screens requiring approved KYC for live settlement
const VERIFIED_ONLY_ROUTES = ['/withdraw', '/orders'];

const PUBLIC_ROUTES = ['/', '/login', '/register', '/legal', '/privacy', '/grievance', '/help'];

export const AppLayoutShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const {
    isLoaded,
    isAuthenticated,
    currentUser,
  } = useApp();

  const isPublic = PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));
  const isAuthPage = pathname === '/login' || pathname === '/register';
  const isKycPage = pathname === '/kyc';
  const isTradePage = pathname === '/trade';

  // Operator areas get the admin sidebar. Presentation only — access is enforced
  // in middleware and again in every route handler.
  const isOperator = currentUser?.role === 'admin' || currentUser?.role === 'staff' || currentUser?.role === 'developer';
  const isAdminArea = isOperator || pathname.startsWith('/admin') || pathname.startsWith('/developer');
  const needsVerification = !isOperator && VERIFIED_ONLY_ROUTES.some((r) => pathname.startsWith(r));

  React.useEffect(() => {
    if (!isLoaded) return;

    if (!isAuthenticated && !isPublic && pathname !== '/login' && pathname !== '/') {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    // Role Isolation: Operators only access the Admin & Developer Console
    if (isAuthenticated && isOperator && !pathname.startsWith('/admin') && !pathname.startsWith('/developer') && !isAuthPage) {
      router.replace('/admin');
      return;
    }
  }, [isLoaded, isAuthenticated, isPublic, isOperator, isAuthPage, pathname, router]);

  // Auth pages are standalone — no chrome around them.
  if (isAuthPage) {
    return <main className="min-h-screen w-full">{children}</main>;
  }

  // Session still resolving, or we are about to redirect. Show the shape.
  if (!isLoaded || (!isAuthenticated && !isPublic)) {
    return isAuthenticated ? <AppSkeleton /> : <AuthSkeleton />;
  }

  if (isPublic && !isAuthenticated) {
    return <main className="min-h-screen w-full">{children}</main>;
  }

  // Dedicated Full-Screen OctaFX Trading Terminal — zero chrome overlap
  if (isTradePage) {
    return (
      <div className="h-screen w-full overflow-hidden bg-[#0b1018] text-white">
        {children}
      </div>
    );
  }

  // Isolated Distraction-Free Institutional KYC Portal
  if (isKycPage) {
    return (
      <div className="min-h-screen w-full bg-slate-50 dark:bg-[#0b0f17] text-slate-900 dark:text-white flex flex-col transition-colors">
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full">
      {isAdminArea ? <AdminSidebar /> : <AppSidebar />}

      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader />
        <DemoModeBanner />
        <main className="flex-1 pb-16 md:pb-8 p-3 sm:p-6 min-w-0 overflow-x-hidden">
          {needsVerification ? <VerificationGate>{children}</VerificationGate> : children}
        </main>
        <MobileBottomNav />
        <KycVerificationPromptModal />
      </div>

    </div>
  );
};
