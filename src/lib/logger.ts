import 'server-only';

import { getServiceClient } from './supabase-server';

/**
 * Structured application logging.
 *
 * Separate from audit_logs on purpose: audit answers "who did what to whom" and
 * is evidence with a 180-day retention; this answers "what broke" and is
 * diagnostics with a 30-day retention. Mixing them makes both harder to read
 * and inflates the table you may one day have to hand to a regulator.
 *
 * Always writes to the console as well, so logs survive a database outage —
 * which is exactly when you most want them.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogContext {
  userId?: string | null;
  requestId?: string;
  [key: string]: unknown;
}

/** Keys whose values are never written to the log table. */
const REDACT_KEYS = [
  'password', 'token', 'secret', 'apikey', 'api_key', 'authorization',
  'cookie', 'session', 'otp', 'code', 'code_hash', 'sid', 'documentnumber',
  'document_number', 'aadhaar', 'pan', 'accountnumber', 'account_number',
];

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || value === undefined) return value;

  if (Array.isArray(value)) return value.slice(0, 20).map((v) => redact(v, depth + 1));

  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = REDACT_KEYS.some((r) => key.toLowerCase().includes(r))
        ? '[redacted]'
        : redact(val, depth + 1);
    }
    return out;
  }

  if (typeof value === 'string' && value.length > 2000) return `${value.slice(0, 2000)}…[truncated]`;

  return value;
}

async function write(level: LogLevel, source: string, message: string, context?: LogContext) {
  const line = `[${level}] ${source}: ${message}`;
  if (level === 'error' || level === 'fatal') console.error(line, context ?? '');
  else if (level === 'warn') console.warn(line, context ?? '');
  else console.log(line, context ?? '');

  // debug never reaches the database — it would dominate the table.
  if (level === 'debug') return;

  const db = getServiceClient();
  if (!db) return;

  try {
    const { userId, requestId, ...rest } = context ?? {};
    await db.from('system_logs').insert({
      level,
      source,
      message: message.slice(0, 2000),
      context: redact(rest) as Record<string, unknown>,
      user_id: userId ?? null,
      request_id: requestId ?? null,
    });
  } catch (err) {
    // Never let logging break the request it is describing.
    console.error('[logger] failed to persist log entry:', err);
  }
}

export const log = {
  debug: (source: string, message: string, context?: LogContext) => void write('debug', source, message, context),
  info:  (source: string, message: string, context?: LogContext) => void write('info', source, message, context),
  warn:  (source: string, message: string, context?: LogContext) => void write('warn', source, message, context),
  error: (source: string, message: string, context?: LogContext) => void write('error', source, message, context),
  fatal: (source: string, message: string, context?: LogContext) => void write('fatal', source, message, context),
};

/** Await this when the log must land before the response (e.g. in a catch). */
export function logAndWait(level: LogLevel, source: string, message: string, context?: LogContext) {
  return write(level, source, message, context);
}
