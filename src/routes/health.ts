import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase-server';
import { loadSession } from '@/lib/auth-server';
import { checkConfig } from '@/lib/env';
import { activeSmsProvider } from '@/lib/sms';
import { isResendConfigured } from '@/lib/resend';
import { ok } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Configuration and connectivity check.
 *
 * Deliberately two-tier. Anyone gets a boolean per subsystem, which is enough
 * to answer "is it me or the site" and is not worth hiding. Only an operator
 * sees which specific variables are missing — a public list of absent secrets
 * tells an attacker exactly which defences are switched off.
 *
 * This exists because the failure it diagnoses is otherwise silent: an invalid
 * database key surfaces as a generic 500 on sign-in with nothing in the UI to
 * indicate the cause.
 */
export async function GET(_req: NextRequest) {
  const config = checkConfig();

  // Actually talk to the database. Credentials can be present and still be
  // rejected, which is exactly the state this project has been in.
  let database: 'ok' | 'unreachable' | 'rejected' | 'not_configured' = 'not_configured';
  const db = getServiceClient();

  if (db) {
    try {
      const { error } = await db.from('profiles').select('id', { head: true, count: 'exact' }).limit(1);
      if (!error) database = 'ok';
      else database = /invalid api key|jwt/i.test(error.message) ? 'rejected' : 'unreachable';
    } catch {
      database = 'unreachable';
    }
  }

  const summary = {
    database,
    email: isResendConfigured ? 'ok' : 'not_configured',
    sms: activeSmsProvider() === 'none' ? 'not_configured' : activeSmsProvider(),
    sessions: config.checks.find((c) => c.key === 'SESSION_SECRET')?.present ? 'ok' : 'not_configured',
    canSignIn: database === 'ok' && Boolean(config.checks.find((c) => c.key === 'SESSION_SECRET')?.present),
  };

  const viewer = await loadSession().catch(() => null);
  const isOperator = viewer && viewer.role !== 'client';

  if (!isOperator) return ok({ status: summary });

  return ok({
    status: summary,
    detail: {
      healthy: config.healthy,
      blocking: config.blocking,
      checks: config.checks,
      // A secret with a NEXT_PUBLIC_ prefix is published in the browser bundle;
      // surfacing it here makes that mistake visible rather than silent.
      leakedToClient: config.leaks,
    },
  });
}
