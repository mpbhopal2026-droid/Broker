/**
 * Deployment role.
 *
 * The same codebase is deployed twice:
 *
 *   APP_ROLE=client  →  app.yourdomain.com    client PWA
 *   APP_ROLE=admin   →  admin.yourdomain.com  admin console
 *
 * Each deployment serves only its own routes and returns 404 for the other's.
 * Two things follow from that:
 *
 *   1. The admin console is not reachable from the client origin at all, so an
 *      XSS on the client app has no admin endpoints to call.
 *
 *   2. Session cookies are host-only (no Domain attribute), so a cookie issued
 *      on app.yourdomain.com is never sent to admin.yourdomain.com. A stolen
 *      client session cannot be replayed against the admin console even if the
 *      account holds the admin role.
 *
 * Read via a getter rather than a module constant so tests and the Edge runtime
 * both see the current value.
 */

export type AppRole = 'client' | 'admin';

export function appRole(): AppRole {
  return process.env.APP_ROLE === 'admin' ? 'admin' : 'client';
}

export function isAdminDeployment(): boolean {
  return appRole() === 'admin';
}

/** Paths the ADMIN deployment serves. Everything else 404s there. */
const ADMIN_ALLOWED_PREFIXES = [
  '/admin',
  '/developer',
  '/staff',
  '/api/admin',
  '/api/developer',
  '/api/auth',      // admins must be able to sign in
  '/api/settings',  // broker settings are managed here
  '/api/send-email',
  '/api/audit',
  '/login',
  '/legal',
  '/privacy',
  '/grievance',
];

/** Paths the CLIENT deployment must never serve. */
const ADMIN_ONLY_PREFIXES = ['/admin', '/developer', '/staff', '/api/admin', '/api/developer'];

export function isPathAllowedForRole(pathname: string, role: AppRole): boolean {
  if (role === 'admin') {
    if (pathname === '/') return true; // redirected to /admin by middleware
    return ADMIN_ALLOWED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  }

  // Client deployment: block anything admin.
  return !ADMIN_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Optional IP allowlist for the admin deployment.
 *
 * Comma-separated exact IPs or CIDR-style /24 and /16 prefixes in
 * ADMIN_IP_ALLOWLIST. Empty means no restriction.
 *
 * This is a useful extra lock on a small admin console, but it relies on
 * x-forwarded-for, which is only trustworthy behind a proxy that overwrites it
 * (Vercel, Cloudflare, nginx with real_ip). Do not treat it as the only control
 * — authentication still applies underneath.
 */
export function isIpAllowedForAdmin(ip: string): boolean {
  const raw = process.env.ADMIN_IP_ALLOWLIST?.trim();
  if (!raw) return true;

  const entries = raw.split(',').map((e) => e.trim()).filter(Boolean);
  if (entries.length === 0) return true;

  return entries.some((entry) => {
    if (entry === ip) return true;
    if (entry.endsWith('.*')) return ip.startsWith(entry.slice(0, -1));
    if (entry.endsWith('/24')) {
      const prefix = entry.slice(0, -3).split('.').slice(0, 3).join('.');
      return ip.startsWith(`${prefix}.`);
    }
    if (entry.endsWith('/16')) {
      const prefix = entry.slice(0, -3).split('.').slice(0, 2).join('.');
      return ip.startsWith(`${prefix}.`);
    }
    return false;
  });
}

/** Cookie name differs per deployment so the two sessions can never be confused. */
export function sessionCookieName(): string {
  return isAdminDeployment() ? 'apex_admin_session' : 'apex_session';
}
