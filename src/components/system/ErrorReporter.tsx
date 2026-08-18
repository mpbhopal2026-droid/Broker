'use client';

import { useEffect } from 'react';

/**
 * Ships uncaught browser errors to the system log.
 *
 * Without this, half the platform's failures are invisible. A page that throws
 * during render sends no failing request, so the server sees a clean 200 while
 * the client sits on a blank screen — and the client is usually not going to
 * report it. Support tickets are for what users notice; this is for what they
 * do not.
 */
export function ErrorReporter() {
  useEffect(() => {
    // One page can throw the same error on every re-render. Reporting each one
    // would bury everything else in the log and burn the rate limit.
    const seen = new Set<string>();

    const report = (message: string, stack?: string) => {
      const key = `${message}::${stack?.slice(0, 200) ?? ''}`;
      if (seen.has(key) || seen.size > 10) return;
      seen.add(key);

      // keepalive so the report still goes out if the error is followed by a
      // navigation away from the broken page.
      void fetch('/api/logs/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        keepalive: true,
        body: JSON.stringify({
          level: 'error',
          message,
          stack,
          path: window.location.pathname,
        }),
      }).catch(() => {
        // If reporting the error also fails there is nothing useful left to do.
      });
    };

    const onError = (event: ErrorEvent) => {
      report(event.message || 'Uncaught error', event.error?.stack);
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason: any = event.reason;
      report(
        `Unhandled promise rejection: ${reason?.message ?? String(reason)}`.slice(0, 500),
        reason?.stack,
      );
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
