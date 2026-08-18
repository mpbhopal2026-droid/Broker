import { UserProfile, KYCRecord } from './types';

/**
 * Onboarding progress, derived entirely from server state.
 *
 * Nothing is stored about "which step the user is on" — the steps are computed
 * from facts (is the email verified, are the documents accepted, is KYC
 * approved). That makes the flow naturally resumable across devices and
 * impossible to skip by fiddling with local state, which a stored step index
 * would allow.
 */

export type StepId = 'verify_email' | 'accept_terms' | 'kyc' | 'fund' | 'trade';
export type StepState = 'done' | 'current' | 'pending' | 'blocked' | 'in_review';

export interface OnboardingStep {
  id: StepId;
  title: string;
  description: string;
  state: StepState;
  href: string;
  cta: string;
  /** Shown when the step is waiting on us rather than on the user. */
  note?: string;
}

export interface OnboardingProgress {
  steps: OnboardingStep[];
  completedCount: number;
  totalCount: number;
  percent: number;
  isComplete: boolean;
  nextStep: OnboardingStep | null;
}

export function computeOnboarding(params: {
  profile: UserProfile | null;
  pendingLegal: string[];
  kycRecords: KYCRecord[];
  hasDeposited: boolean;
}): OnboardingProgress {
  const { profile, pendingLegal, kycRecords, hasDeposited } = params;

  const emailVerified = Boolean(profile);
  const termsAccepted = pendingLegal.length === 0;
  const latestKyc = kycRecords[0];
  const kycStatus = profile?.kycStatus ?? 'not_submitted';

  const steps: OnboardingStep[] = [];

  steps.push({
    id: 'verify_email',
    title: 'Verify your email',
    description: 'We sent a code to confirm your address.',
    state: emailVerified ? 'done' : 'current',
    href: '/login',
    cta: 'Verify',
  });

  steps.push({
    id: 'accept_terms',
    title: 'Read and accept the terms',
    description: 'Risk disclosure, client agreement, privacy notice and terms.',
    state: !emailVerified ? 'blocked' : termsAccepted ? 'done' : 'current',
    href: '/legal/accept',
    cta: 'Review documents',
  });

  // KYC has a genuine waiting state — the user has done their part and is
  // waiting on a reviewer. Showing that as "pending" would wrongly imply they
  // still have something to do.
  let kycState: StepState;
  let kycNote: string | undefined;

  if (!termsAccepted) {
    kycState = 'blocked';
  } else if (kycStatus === 'approved') {
    kycState = 'done';
  } else if (kycStatus === 'pending') {
    kycState = 'in_review';
    kycNote = 'Submitted — our compliance desk is reviewing your documents.';
  } else if (kycStatus === 'rejected') {
    kycState = 'current';
    kycNote = latestKyc?.adminNotes
      ? `Needs correction: ${latestKyc.adminNotes}`
      : 'Your last submission needs correction.';
  } else {
    kycState = 'current';
  }

  steps.push({
    id: 'kyc',
    title: 'Verify your identity',
    description: 'Upload a PAN, Aadhaar, passport, voter ID or driving licence.',
    state: kycState,
    href: '/kyc',
    cta: kycStatus === 'rejected' ? 'Re-upload documents' : 'Start verification',
    note: kycNote,
  });

  steps.push({
    id: 'fund',
    title: 'Add funds',
    description: 'Deposit by UPI or bank transfer, then submit your UTR.',
    state: kycStatus !== 'approved' ? 'blocked' : hasDeposited ? 'done' : 'current',
    href: '/deposit',
    cta: 'Make a deposit',
  });

  steps.push({
    id: 'trade',
    title: 'Start trading',
    description: 'Practise on the demo account any time — no deposit needed.',
    state: kycStatus === 'approved' && hasDeposited ? 'current' : 'pending',
    href: '/market',
    cta: 'Open markets',
  });

  const completedCount = steps.filter((s) => s.state === 'done').length;
  const nextStep = steps.find((s) => s.state === 'current') ?? null;

  return {
    steps,
    completedCount,
    totalCount: steps.length,
    percent: Math.round((completedCount / steps.length) * 100),
    isComplete: completedCount >= steps.length - 1, // 'trade' is never "done"
    nextStep,
  };
}
