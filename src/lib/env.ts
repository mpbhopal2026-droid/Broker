import 'server-only';

/**
 * Environment configuration, split by exposure.
 *
 * The split is not cosmetic. Anything prefixed NEXT_PUBLIC_ is inlined into the
 * JavaScript bundle at build time and is readable by every visitor — putting a
 * secret there does not leak it eventually, it publishes it immediately. The
 * two groups below are kept apart so that mistake is hard to make by accident,
 * and `assertNoLeakedSecrets()` fails the check if a known-secret name ever
 * gains a public prefix.
 */

/** Safe to ship to the browser. */
export const PUBLIC_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY', // RLS-scoped by design; safe to publish
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_ADMIN_URL',
  'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
  'NEXT_PUBLIC_FIREBASE_API_KEY', // public by design; secured by Firebase rules
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
  'NEXT_PUBLIC_GRIEVANCE_OFFICER_NAME',
  'NEXT_PUBLIC_GRIEVANCE_OFFICER_EMAIL',
  'NEXT_PUBLIC_GRIEVANCE_OFFICER_PHONE',
  'NEXT_PUBLIC_COMPANY_ADDRESS',
] as const;

/** Server only. Never reference these from a Client Component. */
export const SERVER_ENV = [
  'SUPABASE_SERVICE_ROLE_KEY', // bypasses all RLS
  'SESSION_SECRET',            // forges any session if leaked
  'KYC_ENCRYPTION_KEY',        // decrypts stored identity numbers
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL',
  'RESEND_WEBHOOK_SECRET',  // verifies delivery events are really from Resend
  'MARKET_DATA_API_KEY',    // live price feed; without it quotes stay simulated
  'VAPID_PRIVATE_KEY',
  'MSG91_AUTH_KEY',
  'TWILIO_AUTH_TOKEN',
  'ADMIN_IP_ALLOWLIST',
  'APP_ROLE',
] as const;

/** Names that must never appear with a NEXT_PUBLIC_ prefix. */
const NEVER_PUBLIC = [
  'SERVICE_ROLE',
  'SESSION_SECRET',
  'ENCRYPTION_KEY',
  'RESEND_API_KEY',
  'AUTH_TOKEN',
  'PRIVATE_KEY',
  'MSG91_AUTH',
];

export interface EnvCheck {
  key: string;
  present: boolean;
  /** Blocks the feature entirely when missing. */
  required: boolean;
  note?: string;
}

export interface ConfigReport {
  healthy: boolean;
  /** Missing values that stop core flows working. */
  blocking: string[];
  checks: EnvCheck[];
  leaks: string[];
}

function has(key: string): boolean {
  const v = process.env[key];
  return Boolean(v && v.trim() && !/^(your-|generate-|re_your|\[)/i.test(v));
}

/**
 * A secret must never be readable from the browser. This catches the case where
 * someone copies a key into Vercel with a NEXT_PUBLIC_ prefix to "make it work".
 */
export function assertNoLeakedSecrets(): string[] {
  return Object.keys(process.env)
    .filter((k) => k.startsWith('NEXT_PUBLIC_'))
    .filter((k) => NEVER_PUBLIC.some((frag) => k.toUpperCase().includes(frag)));
}

export function checkConfig(): ConfigReport {
  const checks: EnvCheck[] = [
    { key: 'NEXT_PUBLIC_SUPABASE_URL', present: has('NEXT_PUBLIC_SUPABASE_URL'), required: true, note: 'Database host' },
    { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', present: has('NEXT_PUBLIC_SUPABASE_ANON_KEY'), required: true },
    { key: 'SUPABASE_SERVICE_ROLE_KEY', present: has('SUPABASE_SERVICE_ROLE_KEY'), required: true, note: 'Server-side database access' },
    { key: 'SESSION_SECRET', present: has('SESSION_SECRET'), required: true, note: 'Without it nobody can sign in' },
    { key: 'KYC_ENCRYPTION_KEY', present: has('KYC_ENCRYPTION_KEY'), required: false, note: 'Needed before storing real identity documents' },
    { key: 'RESEND_API_KEY', present: has('RESEND_API_KEY'), required: false, note: 'Login codes are logged to the console without it' },
    { key: 'RESEND_FROM_EMAIL', present: has('RESEND_FROM_EMAIL'), required: false },
    { key: 'RESEND_WEBHOOK_SECRET', present: has('RESEND_WEBHOOK_SECRET'), required: false, note: 'Delivery outcomes are unknown without it — sent is not delivered' },
    { key: 'MARKET_DATA_API_KEY', present: has('MARKET_DATA_API_KEY'), required: false, note: 'Quotes stay clearly marked simulated without it' },
    { key: 'MARKET_DATA_PROVIDER', present: has('MARKET_DATA_PROVIDER'), required: false, note: 'Set to twelvedata' },
    { key: 'MSG91_AUTH_KEY', present: has('MSG91_AUTH_KEY'), required: false, note: 'SMS login channel' },
    { key: 'NEXT_PUBLIC_APP_URL', present: has('NEXT_PUBLIC_APP_URL'), required: false, note: 'Links in outgoing email' },
  ];

  const blocking = checks.filter((c) => c.required && !c.present).map((c) => c.key);
  const leaks = assertNoLeakedSecrets();

  return { healthy: blocking.length === 0 && leaks.length === 0, blocking, checks, leaks };
}

/**
 * Human-readable reason a request could not be served, for the API layer.
 * Returns null when configuration is fine.
 */
export function configFailureMessage(): string | null {
  const { blocking } = checkConfig();
  if (blocking.length === 0) return null;

  if (blocking.includes('SESSION_SECRET')) {
    return 'Sign-in is unavailable: SESSION_SECRET is not set on the server.';
  }
  return `Sign-in is unavailable: the database is not configured (${blocking.join(', ')}).`;
}
