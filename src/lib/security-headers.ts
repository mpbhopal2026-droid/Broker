import { NextResponse } from 'next/server';

/**
 * Content Security Policy, shared by both middlewares.
 *
 * Next.js emits inline <script> tags for hydration and route data. With a
 * nonce-based script-src those are blocked unless Next stamps the same nonce on
 * them — and it only does that if it can read the nonce from the CSP header on
 * the *request*. Setting the header on the response alone (which is what this
 * did originally) produces a policy that blocks the framework's own scripts:
 * the page renders server-side, hydration never runs, and the app sits on its
 * loading skeleton forever with no error beyond CSP violations in the console.
 *
 * So buildCsp() is called once per request and applied in two places:
 * requestHeaders (so Next can read the nonce) and the response (so the browser
 * enforces it). See applySecurity() below.
 */
export function buildCsp(nonce: string): string {
  const scriptSources = [
    `'self'`,
    `'unsafe-inline'`,
    `'unsafe-eval'`,
    `https://s3.tradingview.com`,
    `https://www.gstatic.com`,
    `https://www.googleapis.com`,
    `https://static.cloudflareinsights.com`,
    `https://cloudflareinsights.com`,
    `https://*.cloudflareinsights.com`,
  ].join(' ');

  return [
    `default-src 'self'`,
    `style-src 'self' 'unsafe-inline'`,
    `script-src ${scriptSources}`,
    `script-src-elem ${scriptSources}`,
    `img-src 'self' data: blob: https:`,
    `font-src 'self' data: https://fonts.gstatic.com`,
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.googleapis.com https://*.firebaseio.com https://api.resend.com https://cloudflareinsights.com https://*.cloudflareinsights.com https://static.cloudflareinsights.com`,
    `frame-src 'self' https://s.tradingview.com https://www.tradingview.com`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ].join('; ');
}

/** Non-CSP headers. Safe to apply to any response, including redirects. */
export function securityHeaders(res: NextResponse, nonce: string): NextResponse {
  res.headers.set('Content-Security-Policy', buildCsp(nonce));
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(), payment=()');
  res.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  res.headers.set('X-DNS-Prefetch-Control', 'off');

  if (process.env.NODE_ENV === 'production') {
    res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }

  return res;
}

/**
 * Build the pass-through response for a request Next.js will render.
 *
 * The CSP goes on the request headers as well so Next can extract the nonce and
 * apply it to the scripts it injects. Redirects and 404s do not render, so they
 * only need securityHeaders().
 */
export function applySecurity(req: Request, nonce: string): NextResponse {
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  return securityHeaders(res, nonce);
}
