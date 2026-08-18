import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase-server';
import { requireUser, auditServer } from '@/lib/auth-server';
import { clientIp } from '@/lib/rate-limit';
import { ok, fail, handleRouteError } from '@/lib/api';
import { CONSENT_PURPOSES, CONSENT_VERSION, ConsentPurpose } from '@/lib/legal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Grant or withdraw consent for a single purpose — DPDP s.6.
 *
 * s.6(4) requires withdrawal to be as easy as granting, which is why this is
 * one endpoint taking a boolean rather than a withdrawal request form.
 * Purposes marked `withdrawable: false` are refused with a reason, because
 * they rest on a legal obligation rather than consent; pretending they can be
 * withdrawn would be the real dark pattern.
 *
 * Nothing is ever deleted here — a withdrawal is a new row plus a timestamp on
 * the old one, so the consent history stays auditable.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const body = await req.json().catch(() => ({}));
    const purpose = body?.purpose as ConsentPurpose;
    const granted = body?.granted === true;

    if (!purpose || !(purpose in CONSENT_PURPOSES)) {
      return fail(400, 'Unknown consent purpose.');
    }

    const definition = CONSENT_PURPOSES[purpose];

    if (!granted && !definition.withdrawable) {
      return fail(409, `This cannot be withdrawn while your account is open. ${definition.reason}`);
    }

    const db = getServiceClient();
    if (!db) return fail(503, 'Not available.');

    const now = new Date().toISOString();

    if (!granted) {
      await db
        .from('consent_logs')
        .update({ withdrawn_at: now })
        .eq('user_id', user.id)
        .eq('consent_type', purpose)
        .eq('granted', true)
        .is('withdrawn_at', null);
    }

    const { error } = await db.from('consent_logs').insert({
      user_id: user.id,
      email: user.email,
      consent_type: purpose,
      consent_version: CONSENT_VERSION,
      granted,
      purpose: definition.description,
      withdrawn_at: granted ? null : now,
      ip_address: clientIp(req),
      user_agent: req.headers.get('user-agent') || 'unknown',
    });

    if (error) {
      console.error('[consent] insert failed:', error);
      return fail(500, 'Could not record your choice. Please try again.');
    }

    await auditServer(req, granted ? 'CONSENT_GRANTED' : 'CONSENT_WITHDRAWN', {
      userId: user.id,
      metadata: { purpose, version: CONSENT_VERSION },
    });

    return ok({
      purpose,
      granted,
      message: granted ? 'Consent recorded.' : 'Consent withdrawn.',
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

/** Current consent state per purpose. */
export async function GET() {
  try {
    const user = await requireUser();
    const db = getServiceClient();
    if (!db) return fail(503, 'Not available.');

    const { data } = await db
      .from('consent_logs')
      .select('consent_type, granted, consent_version, withdrawn_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const current: Record<string, boolean> = {};
    for (const row of data ?? []) {
      if (current[row.consent_type] === undefined) {
        current[row.consent_type] = row.granted && !row.withdrawn_at;
      }
    }

    return ok({ consents: current, history: data ?? [], version: CONSENT_VERSION });
  } catch (err) {
    return handleRouteError(err);
  }
}
