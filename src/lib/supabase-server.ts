import 'server-only';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client. Bypasses Row Level Security entirely.
 *
 * `server-only` above makes the build fail if this module is ever imported
 * from a Client Component, so the key cannot leak into the browser bundle.
 * Never re-export the key itself.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const isServerSupabaseConfigured = Boolean(
  url && serviceRoleKey && !url.includes('placeholder') && !serviceRoleKey.includes('your-')
);

let cached: SupabaseClient | null = null;

/** Returns null when unconfigured so callers degrade instead of throwing at import time. */
export function getServiceClient(): SupabaseClient | null {
  if (!isServerSupabaseConfigured) return null;
  if (!cached) {
    cached = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
