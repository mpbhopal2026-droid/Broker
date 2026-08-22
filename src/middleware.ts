import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySessionCookieValue } from '@/lib/session';
import { OPERATIONS_ROLES } from '@/lib/permissions';
import { securityHeaders, applySecurity } from '@/lib/security-headers';

/**
 * Route guards + security headers for the single app.
 *
 * Client and admin live in one deployment, so /admin and /developer are guarded
 * here by role rather than by being absent from the build. This layer verifies
 * the cookie signature and expiry only — it does not hit the database and so
 * cannot see a revoked session. Every route handler that moves money, exposes
 * another user's data, or performs an operator action independently calls
 * requireUser() / requireAdmin() / requireCapability(), which do check
 * revocation and re-read the role from the database.
 *
 * Never rely on this layer alone for authorisation.
 */

// Every authenticated area. Anything not listed here and not public falls
// through to the client-side guard in AppLayoutShell.
const CLIENT_ROUTES = [
  '/onboarding', '/dashboard', '/deposit', '/withdraw', '/kyc', '/profile',
  '/transactions', '/funds', '/portfolio', '/orders', '/trade', '/market',
  '/markets', '/watchlist', '/settings', '/notifications', '/support',
];
const ADMIN_ROUTES = ['/admin', '/developer', '/staff'];
const AUTH_ROUTES = ['/login', '/register'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const nonce = crypto.randomUUID();

  const session = await verifySessionCookieValue(req.cookies.get(SESSION_COOKIE)?.value);
  const hasOpsRole = session ? OPERATIONS_ROLES.includes(session.role) : false;

  const needsAuth = CLIENT_ROUTES.some((r) => pathname.startsWith(r));
  const needsOps = ADMIN_ROUTES.some((r) => pathname.startsWith(r));
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));

  if ((needsAuth || needsOps) && !session) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return securityHeaders(NextResponse.redirect(url), nonce);
  }

  // A signed-in client hitting an operator area gets 404, not 403 — a 403
  // confirms the area exists and is worth probing.
  if (needsOps && !hasOpsRole) {
    return securityHeaders(new NextResponse(null, { status: 404 }), nonce);
  }

  // Renders go through applySecurity so Next can read the nonce from the
  // request CSP and stamp it on its own inline hydration scripts.
  return applySecurity(req, nonce);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons/|manifest.json|firebase-messaging-sw.js|sw.js).*)'],
};
