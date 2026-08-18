import { NextRequest } from 'next/server';
import { loadSession } from '@/lib/auth-server';
import { ok, fail } from '@/lib/api';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { logAndWait } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Browser error sink.
 *
 * Server logs only ever show half the picture. A client whose deposit page
 * throws during render sends no failing request at all — from the server's
 * point of view nothing happened, while the client sees a blank screen and
 * gives up. This is the other half.
 *
 * It is deliberately narrow: a public endpoint that writes to the log table is
 * a way to flood it, so the level is clamped, the payload is capped, and the
 * caller is rate limited by IP.
 */

const ALLOWED_LEVELS = ['warn', 'error'] as const;

export async function POST(req: NextRequest) {
  // Enough for genuine bursts (one broken page can throw several times per
  // render) without letting anyone fill the table.
  const limit = rateLimit(`clientlog:${clientIp(req)}`, 20, 60);
  if (!limit.allowed) return fail(429, 'Too many reports.', { retryAfter: limit.retryAfterSeconds });

  const body = await req.json().catch(() => null);
  if (!body) return fail(400, 'Malformed report.');

  const level = ALLOWED_LEVELS.includes(body.level) ? body.level : 'error';
  const message = String(body.message ?? '').slice(0, 500);
  if (!message) return fail(400, 'A message is required.');

  // Attributing the report to a signed-in user is what makes it actionable —
  // "someone saw an error" is not something you can follow up on. Anonymous
  // reports are still accepted; they just carry no user id.
  const session = await loadSession().catch(() => null);

  // Awaited so the entry is durable before we acknowledge: a page that is about
  // to crash may not survive long enough for a background write to land.
  await logAndWait(level, 'browser', message, {
    userId: session?.id ?? null,
    path: String(body.path ?? '').slice(0, 300),
    stack: String(body.stack ?? '').slice(0, 3000),
    userAgent: req.headers.get('user-agent')?.slice(0, 300),
    componentStack: String(body.componentStack ?? '').slice(0, 2000),
  });

  return ok({ recorded: true });
}
