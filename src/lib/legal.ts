/**
 * Versioned legal documents.
 *
 * Bump the version whenever the substance of a document changes. Acceptance is
 * recorded per (user, document, version), so a change forces re-acceptance
 * rather than silently binding clients to terms they never saw — which is the
 * whole point of "informed" consent under DPDP s.6(1).
 */

export const LEGAL_VERSIONS = {
  terms: '2026-08-v1',
  risk_disclosure: '2026-08-v1',
  privacy_notice: '2026-08-v1',
  client_agreement: '2026-08-v1',
} as const;

export type LegalDocument = keyof typeof LEGAL_VERSIONS;

export const LEGAL_DOCUMENTS: Record<LegalDocument, { title: string; href: string; required: boolean }> = {
  privacy_notice: { title: 'Privacy Notice (DPDP Act 2023)', href: '/privacy', required: true },
  risk_disclosure: { title: 'Risk Disclosure Statement', href: '/legal/risk-disclosure', required: true },
  terms: { title: 'Terms of Service', href: '/legal/terms', required: true },
  client_agreement: { title: 'Client Agreement', href: '/legal/client-agreement', required: true },
};

/** Consent purposes recorded separately, so each can be withdrawn on its own. */
export const CONSENT_PURPOSES = {
  kyc_identity: {
    label: 'Identity verification (KYC)',
    description:
      'Collecting and processing your PAN, Aadhaar or other identity documents to verify who you are, as required by anti-money-laundering rules.',
    withdrawable: false,
    reason: 'Required by law — the account cannot operate without it.',
  },
  account_operation: {
    label: 'Account and transaction processing',
    description: 'Processing deposits, withdrawals and account records.',
    withdrawable: false,
    reason: 'Required to provide the service you asked for.',
  },
  service_email: {
    label: 'Service and security emails',
    description: 'Sign-in codes, security alerts, deposit and withdrawal receipts.',
    withdrawable: false,
    reason: 'Required for account security.',
  },
  marketing_email: {
    label: 'Marketing and product updates',
    description: 'Occasional emails about new features, market commentary and offers.',
    withdrawable: true,
    reason: '',
  },
  analytics: {
    label: 'Usage analytics',
    description: 'Understanding how the app is used so we can improve it.',
    withdrawable: true,
    reason: '',
  },
} as const;

export type ConsentPurpose = keyof typeof CONSENT_PURPOSES;

export const CONSENT_VERSION = '2026-08-v1';

/** Grievance Officer, published as required by DPDP s.13(3). */
export const GRIEVANCE_OFFICER = {
  name: process.env.NEXT_PUBLIC_GRIEVANCE_OFFICER_NAME || '[Name to be appointed]',
  designation: 'Grievance Officer & Data Protection Contact',
  email: process.env.NEXT_PUBLIC_GRIEVANCE_OFFICER_EMAIL || 'grievance@mail.globalforex.online',
  phone: process.env.NEXT_PUBLIC_GRIEVANCE_OFFICER_PHONE || '[Phone to be published]',
  address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS || '[Registered office address to be published]',
  responseDays: 30,
};
