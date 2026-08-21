import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase-server';
import { requireUser, loadSession, auditServer } from '@/lib/auth-server';
import { clientIp } from '@/lib/rate-limit';
import { ok, fail, handleRouteError } from '@/lib/api';
import { LEGAL_VERSIONS, LegalDocument } from '@/lib/legal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Record acceptance of a legal document at a specific version.
 *
 * The version is taken from the server's constant, not the request body — a
 * client cannot claim to have accepted a version that does not exist, and
 * cannot back-date acceptance to an older one to dodge current terms.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await loadSession();

    const body = await req.json().catch(() => ({}));
    const documents: unknown = body?.documents;

    if (!Array.isArray(documents) || documents.length === 0) {
      return fail(400, 'Nothing to accept.');
    }

    const valid = documents.filter((d): d is LegalDocument => typeof d === 'string' && d in LEGAL_VERSIONS);
    if (valid.length !== documents.length) return fail(400, 'Unknown document.');

    const db = getServiceClient();
    if (!db) return fail(503, 'Not available.');

    const ip = clientIp(req);
    const userAgent = req.headers.get('user-agent') || 'unknown';
    // Identity comes from the session, never the request body.
    //
    // This briefly read `body.userId` when no session was present, to work
    // around a 401 during sign-up before the cookie had propagated. That let
    // anyone, unauthenticated, write a legal acceptance for any user id — and
    // these rows ARE the compliance record. In a dispute you would produce
    // "accepted the Risk Disclosure on this date, from this IP" that anybody
    // with curl could have fabricated, which is worse than having no record at
    // all, because it looks like evidence.
    //
    // The sign-up race is solved at the source instead: verify-otp records the
    // acceptance itself, in the same request that creates the session, so there
    // is no window to race.
    const userId = user?.id ?? null;

    if (!userId) {
      return fail(401, 'Sign in to record document acceptance.');
    }

    const rows = valid.map((document) => ({
      user_id: userId,
      document,
      version: LEGAL_VERSIONS[document],
      ip_address: ip,
      user_agent: userAgent,
    }));

    // Re-accepting the same version is a no-op rather than an error.
    const { error } = await db
      .from('legal_acceptances')
      .upsert(rows, { onConflict: 'user_id,document,version', ignoreDuplicates: true });

    if (error) {
      console.error('[legal] acceptance insert failed:', error);
      return fail(500, 'Could not record your acceptance. Please try again.');
    }

    if (user) {
      await auditServer(req, 'LEGAL_DOCUMENTS_ACCEPTED', {
        userId: user.id,
        metadata: { documents: rows.map((r) => `${r.document}@${r.version}`) },
      });
    }

    return ok({ accepted: rows.map((r) => ({ document: r.document, version: r.version })) });
  } catch (err) {
    return handleRouteError(err);
  }
}

/** Which current-version documents is this user still missing? */
export async function GET() {
  try {
    const user = await requireUser();
    const db = getServiceClient();
    if (!db) return fail(503, 'Not available.');

    const { data } = await db
      .from('legal_acceptances')
      .select('document, version, accepted_at')
      .eq('user_id', user.id);

    const accepted = new Set((data ?? []).map((r) => `${r.document}@${r.version}`));
    const pending = (Object.keys(LEGAL_VERSIONS) as LegalDocument[]).filter(
      (doc) => !accepted.has(`${doc}@${LEGAL_VERSIONS[doc]}`)
    );

    return ok({ pending, accepted: data ?? [], versions: LEGAL_VERSIONS });
  } catch (err) {
    return handleRouteError(err);
  }
}
