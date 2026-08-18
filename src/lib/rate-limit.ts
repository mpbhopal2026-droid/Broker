/**
 * Fixed-window rate limiter.
 *
 * IN-MEMORY AND PER-INSTANCE. This is real protection for a single-instance
 * deployment, but on Vercel/serverless each lambda has its own map, so an
 * attacker spreading requests across instances gets a higher effective limit.
 * Before taking real client money, back this with Redis/Upstash (swap the
 * `hits` map for a Redis INCR + EXPIRE) — the call sites do not change.
 */

interface Window {
  count: number;
  resetAt: number;
}

const hits = new Map<string, Window>();

// Bound memory: drop expired windows whenever the map grows past this.
const MAX_TRACKED_KEYS = 10_000;

function sweep(now: number) {
  if (hits.size < MAX_TRACKED_KEYS) return;
  const expired: string[] = [];
  hits.forEach((window, key) => {
    if (window.resetAt <= now) expired.push(key);
  });
  expired.forEach((key) => hits.delete(key));
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = hits.get(key);

  if (!existing || existing.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  existing.count += 1;

  if (existing.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  return { allowed: true, remaining: limit - existing.count, retryAfterSeconds: 0 };
}

/**
 * Best-effort client IP. Trusts x-forwarded-for, which is only safe behind a
 * proxy that overwrites it (Vercel, Cloudflare, nginx with real_ip). If you
 * deploy without such a proxy, clients can spoof this header.
 */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}
