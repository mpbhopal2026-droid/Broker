import { NextResponse } from 'next/server';
import { AuthError } from './auth-server';
import { log } from './logger';

/**
 * Uniform JSON responses.
 *
 * Error text is deliberately generic. Distinguishing "no such account" from
 * "wrong code" hands an attacker a user-enumeration oracle, so the auth routes
 * return the same message either way.
 */

export function ok<T extends Record<string, unknown>>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, ...data }, init);
}

export function fail(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

/** Wraps a handler so AuthError maps to the right status and nothing else leaks. */
export function handleRouteError(err: unknown, source = 'api') {
  // An AuthError is an expected outcome (not signed in, wrong role, rate
  // limited), so it is not noise in the error log.
  if (err instanceof AuthError) return fail(err.status, err.message);

  // Persisted, not just printed: on Vercel the console scrolls out of reach
  // within hours, and a 500 nobody can reconstruct is a 500 nobody can fix.
  // Fire-and-forget so logging never delays the response.
  void log.error(source, err instanceof Error ? err.message : String(err), {
    stack: err instanceof Error ? err.stack?.slice(0, 4000) : undefined,
    name: err instanceof Error ? err.name : typeof err,
  });

  return fail(500, 'Something went wrong. Please try again.');
}

export function tooManyRequests(retryAfterSeconds: number) {
  return NextResponse.json(
    { ok: false, error: 'Too many attempts. Please wait and try again.' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normaliseEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) return null;
  return email;
}

export function cleanString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return null;
  return trimmed;
}
