import { AuditLog, ConsentLog } from './types';

/**
 * Client-side audit access.
 *
 * This module used to WRITE audit entries into localStorage with a hardcoded
 * IP address ('103.212.144.18 (Client Gateway)'). That is not an audit trail:
 * the subject of the log could edit it freely, and the recorded IP was fiction.
 * Writing now happens server-side in auditServer(), against an append-only
 * table with the real request IP. What remains here is read-only.
 */

async function getJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) return fallback;
    const body = await res.json();
    return (body?.ok ? body : fallback) as T;
  } catch {
    return fallback;
  }
}

export async function fetchAuditLogs(limit = 200): Promise<AuditLog[]> {
  const body = await getJson<{ logs?: AuditLog[] }>(`/api/admin/audit-logs?limit=${limit}`, {});
  return body.logs ?? [];
}

export async function fetchConsentLogs(): Promise<ConsentLog[]> {
  const body = await getJson<{ history?: ConsentLog[] }>('/api/consent', {});
  return body.history ?? [];
}

/**
 * Report a client-observable event (page-level actions the server cannot see).
 * Best-effort and unauthenticated-safe: the server attaches the real identity
 * and IP, and ignores anything it cannot attribute to a live session.
 */
export function reportClientEvent(eventType: string, metadata?: Record<string, unknown>): void {
  try {
    void fetch('/api/audit/client-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ eventType, metadata }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* never let telemetry break a user action */
  }
}
