import { NextRequest } from 'next/server';
import { loadSession, auditServer } from '@/lib/auth-server';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { ok, cleanString } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Client-reported events (navigation, UI actions the server cannot observe).
 *
 * Treated as untrusted hints, never as authorisation evidence: the event name
 * is allow-listed, identity comes from the session rather than the payload, and
 * the row is tagged so nobody later mistakes a client claim for a server fact.
 */
const ALLOWED_EVENTS = new Set([
  'KYC_FORM_OPENED',
  'KYC_STEP_SAVED',
  'KYC_SUBMITTED',
  'DEPOSIT_FORM_OPENED',
  'WITHDRAW_FORM_OPENED',
  'RISK_DISCLOSURE_VIEWED',
  'PRIVACY_NOTICE_VIEWED',
  'CONSENT_SCREEN_VIEWED',
  'TRADE_TICKET_OPENED',
  'ORDER_BUY',
  'ORDER_SELL',
  'DEMO_DEPOSIT',
  'DEMO_WITHDRAW',
  'SWITCH_TO_DEMO',
  'SWITCH_TO_LIVE',
  'TAB_SWITCHED',
  'WATCHLIST_TOGGLED',
  'CLIENT_ACTION',
  'BUTTON_CLICK',
]);

export async function POST(req: NextRequest) {
  try {
    const limit = rateLimit(`client-event:${clientIp(req)}`, 120, 60);
    if (!limit.allowed) return ok({ recorded: false });

    const body = await req.json().catch(() => ({}));
    const eventType = cleanString(body?.eventType, 64);

    if (!eventType || !ALLOWED_EVENTS.has(eventType)) return ok({ recorded: false });

    const user = await loadSession();
    if (!user) return ok({ recorded: false });

    await auditServer(req, eventType, {
      userId: user.id,
      metadata: { ...(body?.metadata ?? {}), source: 'client-reported' },
    });

    return ok({ recorded: true });
  } catch {
    return ok({ recorded: false });
  }
}
