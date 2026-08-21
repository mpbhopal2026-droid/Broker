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


// Screens requiring approved KYC for live settlement & trading
const VERIFIED_ONLY_ROUTES = ['/withdraw', '/deposit', '/orders', '/funds'];

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
  const isKycOnboardingPage = pathname === '/kyc' || pathname === '/kyc/submitted';
  const isTradePage = pathname === '/trade';

  // Operator areas get the admin sidebar. Presentation only — access is enforced
  // in middleware and again in every route handler.
  const isOperator = currentUser?.role === 'admin' || currentUser?.role === 'staff' || currentUser?.role === 'developer';
  const isAdminArea = isOperator || pathname.startsWith('/admin') || pathname.startsWith('/developer');
  const needsVerification = !isOperator && VERIFIED_ONLY_ROUTES.some((r) => pathname.startsWith(r));
  // Three gates, all required before the app opens:
  //   1. Register       — name, mobile, email
  //   2. Identity       — Aadhaar and PAN uploaded
  //   3. Withdrawal a/c — where their money comes back to
  //
  // The third was not enforced. The gate only read kycStatus, so anyone
  // approved manually by an operator walked in with no payout account on file —
  // and that only surfaces later, when they try to withdraw and cannot, which
  // is the worst possible moment to discover it.
  const kycSubmitted = currentUser?.kycStatus === 'approved' || currentUser?.kycStatus === 'pending';
  const hasWithdrawalAccount = Boolean(
    currentUser?.bankAccountNumber && currentUser?.bankIfsc,
  );
  const hasSubmittedKyc = kycSubmitted && hasWithdrawalAccount;

  React.useEffect(() => {
    if (!isLoaded) return;

    if (!isAuthenticated && !isPublic && pathname !== '/login' && pathname !== '/') {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    // A signed-in user must never be left sitting on the login screen.
    //
    // This is the bug behind "the OTP works but nothing happens". After a
    // successful verify the page calls router.push('/dashboard'); if the
    // session context has not propagated by the time this effect runs on the
    // new path, the guard above sees isAuthenticated === false and bounces
    // straight back to /login. Session state then arrives — and nothing moved
    // them off, because the equivalent middleware rule was removed. They end up
    // parked on the login form while actually signed in, which reads as the
    // login being broken.
    if (isAuthenticated && isAuthPage) {
      if (isOperator) router.replace('/admin');
      else if (!hasSubmittedKyc) router.replace('/kyc');
      else router.replace('/dashboard');
      return;
    }

    // Authenticated users on root "/" should immediately go to /dashboard (or /admin for operators)
    if (isAuthenticated && pathname === '/') {
      if (isOperator) {
        router.replace('/admin');
      } else if (!hasSubmittedKyc) {
        router.replace('/kyc');
      } else {
        router.replace('/dashboard');
      }
      return;
    }

    // Role Isolation: Operators only access the Admin & Developer Console
    if (isAuthenticated && isOperator && !pathname.startsWith('/admin') && !pathname.startsWith('/developer') && !isAuthPage) {
      router.replace('/admin');
      return;
    }

    // Mandatory KYC Lockout Gate: Clients who haven't submitted KYC CANNOT use the app
    if (isAuthenticated && !isOperator && !hasSubmittedKyc && !isKycOnboardingPage && !isPublic && !isAuthPage) {
      router.replace('/kyc');
      return;
    }
  }, [isLoaded, isAuthenticated, isPublic, isOperator, isAuthPage, pathname, router, hasSubmittedKyc, isKycOnboardingPage]);

  // Auth & Welcome pages for visitors are standalone — zero chrome around them.
  if (isAuthPage || (pathname === '/' && !isAuthenticated) || (isPublic && !isAuthenticated)) {
    return <main className="min-h-screen w-full">{children}</main>;
  }

  // Session still resolving, or we are about to redirect. Show the shape.
  if (!isLoaded || (!isAuthenticated && !isPublic)) {
    return isAuthenticated ? <AppSkeleton /> : <AuthSkeleton />;
  }

  // Unsubmitted clients are strictly locked to the standalone KYC onboarding flow
  if (isAuthenticated && !isOperator && !hasSubmittedKyc) {
    if (isKycOnboardingPage) {
      return <main className="min-h-screen w-full">{children}</main>;
    }
    // Hard block any attempt to render dashboard/trades before redirecting
    return <AppSkeleton />;
  }

  // Dedicated Full-Screen OctaFX Trading Terminal — zero chrome overlap
  if (isTradePage) {
    return (
      <div className="h-screen w-full overflow-hidden bg-[#0b1018] text-white">
        {children}
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
