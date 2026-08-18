import 'server-only';

import { getServiceClient } from './supabase-server';

/**
 * Feature flags.
 *
 * Evaluated on the SERVER and enforced in the route handler, not just hidden in
 * the UI. A flag that only hides a button is a cosmetic change — the endpoint is
 * still callable by anyone with curl.
 *
 * Percentage rollout buckets on a hash of (userId + key), so a given user gets
 * a stable answer instead of flipping on every request.
 */

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  description: string;
  rolloutPercent: number;
  allowedUserIds?: string[];
  userOverrides?: Record<string, boolean>;
  updatedAt: string;
}

export function parseFlagMeta(desc: string | null | undefined): { description: string; allowedUserIds: string[]; userOverrides: Record<string, boolean> } {
  if (!desc) return { description: '', allowedUserIds: [], userOverrides: {} };
  const parts = desc.split('@@META@@');
  const pureDesc = parts[0].trim();
  if (parts.length > 1) {
    try {
      const parsed = JSON.parse(parts[1]);
      return {
        description: pureDesc,
        allowedUserIds: Array.isArray(parsed.allowedUserIds) ? parsed.allowedUserIds : [],
        userOverrides: typeof parsed.userOverrides === 'object' && parsed.userOverrides !== null ? parsed.userOverrides : {},
      };
    } catch {}
  }
  return { description: pureDesc, allowedUserIds: [], userOverrides: {} };
}

export function formatFlagDescription(baseDesc: string, allowedUserIds?: string[], userOverrides?: Record<string, boolean>): string {
  const cleanBase = (baseDesc || '').split('@@META@@')[0].trim();
  const meta = {
    allowedUserIds: allowedUserIds || [],
    userOverrides: userOverrides || {},
  };
  return `${cleanBase} @@META@@${JSON.stringify(meta)}`;
}

export const DEFAULT_FLAGS: FeatureFlag[] = [
  {
    key: 'demo_account_enabled',
    enabled: false, // Closed globally; only allowed individual users can demo
    description: 'Virtual Demo Trading simulation engine and header switch',
    rolloutPercent: 0,
    allowedUserIds: [],
    userOverrides: {},
    updatedAt: new Date().toISOString(),
  },
  {
    key: 'phone_otp_login',
    enabled: true,
    description: 'SMS Phone OTP authentication channel',
    rolloutPercent: 100,
    allowedUserIds: [],
    userOverrides: {},
    updatedAt: new Date().toISOString(),
  },
  {
    key: 'maintenance_mode',
    enabled: false,
    description: 'Broker platform emergency maintenance lockout',
    rolloutPercent: 0,
    allowedUserIds: [],
    userOverrides: {},
    updatedAt: new Date().toISOString(),
  },
  {
    key: 'crypto_deposits',
    enabled: false,
    description: 'USDT TRC20 and crypto payment gateway',
    rolloutPercent: 0,
    allowedUserIds: [],
    userOverrides: {},
    updatedAt: new Date().toISOString(),
  },
];

let cache: { value: FeatureFlag[]; expiresAt: number } | null = null;
const CACHE_TTL_MS = 10_000;

export function invalidateFlagCache(): void {
  cache = null;
}

export async function loadFlags(): Promise<FeatureFlag[]> {
  if (cache && cache.expiresAt > Date.now()) return cache.value;

  const db = getServiceClient();
  if (!db) return DEFAULT_FLAGS;

  try {
    const { data } = await db
      .from('feature_flags')
      .select('*')
      .order('key');

    const dbFlags: FeatureFlag[] = (data ?? []).map((row) => {
      const meta = parseFlagMeta(row.description);
      const allowedFromCol = Array.isArray(row.allowed_user_ids) ? row.allowed_user_ids : [];
      const overridesFromCol = typeof row.user_overrides === 'object' && row.user_overrides !== null ? row.user_overrides : {};
      
      const allowedUserIds = allowedFromCol.length > 0 ? allowedFromCol : meta.allowedUserIds;
      const userOverrides = Object.keys(overridesFromCol).length > 0 ? overridesFromCol : meta.userOverrides;

      return {
        key: row.key,
        enabled: Boolean(row.enabled),
        description: meta.description || row.description || '',
        rolloutPercent: Number(row.rollout_percent ?? 0),
        allowedUserIds,
        userOverrides,
        updatedAt: row.updated_at || new Date().toISOString(),
      };
    });

    // Merge default flags for any missing keys
    const merged = [...dbFlags];
    for (const def of DEFAULT_FLAGS) {
      if (!merged.some((f) => f.key === def.key)) {
        merged.push(def);
      }
    }

    cache = { value: merged, expiresAt: Date.now() + CACHE_TTL_MS };
    return merged;
  } catch (err) {
    console.error('[flags] load failed:', err);
    return DEFAULT_FLAGS;
  }
}

/** Stable 0-99 bucket for a user/flag pair. */
function bucket(userId: string, key: string): number {
  let hash = 2166136261;
  const input = `${userId}:${key}`;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % 100;
}

/**
 * Is this flag on for this user?
 *
 * Checks:
 * 1. Specific per-user override (allows enabling a single user even when global flag is false).
 * 2. Allowed user IDs whitelist.
 * 3. Global flag boolean + rollout percentage.
 */
export async function isEnabled(key: string, userId?: string): Promise<boolean> {
  const flags = await loadFlags();
  const flag = flags.find((f) => f.key === key);

  if (!flag) return false;

  // 1. Check direct single-user override
  if (userId && flag.userOverrides && flag.userOverrides[userId] !== undefined) {
    return flag.userOverrides[userId];
  }

  // 2. Check allowed users whitelist (allows individual user to demo when flag is off)
  if (userId && flag.allowedUserIds && flag.allowedUserIds.includes(userId)) {
    return true;
  }

  // 3. Check global flag
  if (!flag.enabled) return false;
  if (flag.rolloutPercent >= 100) return true;
  if (flag.rolloutPercent <= 0) return false;
  if (!userId) return false;

  return bucket(userId, key) < flag.rolloutPercent;
}

/** All flags resolved for one user, for handing to the client in one payload. */
export async function resolveFlagsFor(userId?: string): Promise<Record<string, boolean>> {
  const flags = await loadFlags();
  const resolved: Record<string, boolean> = {};

  for (const flag of flags) {
    if (userId && flag.userOverrides && flag.userOverrides[userId] !== undefined) {
      resolved[flag.key] = flag.userOverrides[userId];
    } else if (userId && flag.allowedUserIds && flag.allowedUserIds.includes(userId)) {
      resolved[flag.key] = true;
    } else if (!flag.enabled) {
      resolved[flag.key] = false;
    } else if (flag.rolloutPercent >= 100) {
      resolved[flag.key] = true;
    } else if (flag.rolloutPercent <= 0 || !userId) {
      resolved[flag.key] = false;
    } else {
      resolved[flag.key] = bucket(userId, flag.key) < flag.rolloutPercent;
    }
  }

  return resolved;
}

/**
 * Guard for money-moving routes. Returns an error string when the feature is
 * off, so the caller can fail with a clear message rather than a blank 403.
 */
export async function requireFlag(key: string, userId?: string): Promise<string | null> {
  if (await isEnabled('maintenance_mode', userId)) {
    return 'The platform is in maintenance. Please try again shortly.';
  }
  if (!(await isEnabled(key, userId))) {
    return 'This feature is currently unavailable.';
  }
  return null;
}
