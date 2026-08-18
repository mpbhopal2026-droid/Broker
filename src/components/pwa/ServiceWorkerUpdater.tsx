'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker and makes sure a deployed fix actually reaches
 * people.
 *
 * The previous worker cached application code cache-first, so once a device had
 * loaded the app it kept running that build forever. The only remedy was asking
 * each client to clear site data or reinstall the app — which is not a thing you
 * can ask clients to do, so in practice a fix simply never arrived.
 *
 * Three things fix that here: the worker no longer caches code at all, an update
 * check runs on load and whenever the app is brought back to the foreground, and
 * a new worker taking control reloads the page once.
 */
export function ServiceWorkerUpdater() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    let reloading = false;

    // Fires when a new worker takes control. Reload once so the tab is running
    // the code that just activated, rather than a half-old bundle.
    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    let registration: ServiceWorkerRegistration | undefined;

    void navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        registration = reg;

        // A worker already waiting means an update downloaded on a previous
        // visit and stalled. Tell it to take over now.
        if (reg.waiting) reg.waiting.postMessage('SKIP_WAITING');

        reg.addEventListener('updatefound', () => {
          const next = reg.installing;
          if (!next) return;
          next.addEventListener('statechange', () => {
            // Only skip waiting when there is an existing controller: on a first
            // install there is nothing to replace and no reason to reload.
            if (next.state === 'installed' && navigator.serviceWorker.controller) {
              next.postMessage('SKIP_WAITING');
            }
          });
        });

        return reg.update();
      })
      .catch(() => {
        // A failed registration must never break the app. Worst case the client
        // simply has no offline support.
      });

    // Phones keep an installed PWA suspended for days. Checking on every return
    // to the foreground is what makes a same-day fix actually land.
    const onVisible = () => {
      if (document.visibilityState === 'visible') void registration?.update().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return null;
}
