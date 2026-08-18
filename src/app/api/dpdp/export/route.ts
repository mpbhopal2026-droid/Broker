import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase-server';
import { requireUser, auditServer } from '@/lib/auth-server';
import { rateLimit } from '@/lib/rate-limit';
import { fail, tooManyRequests, handleRouteError } from '@/lib/api';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Right to access — DPDP s.11. Returns everything held about the requesting
 * user as a downloadable JSON file.
 *
 * Note what is deliberately absent: session identifiers and the encrypted KYC
 * document number. Both are security material rather than personal data the
 * principal needs, and including them would turn a routine export into a
 * credential leak if the file were mishandled.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();

    const limit = rateLimit(`dpdp:export:${user.id}`, 5, 24 * 60 * 60);
    if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);

    const db = getServiceClient();
    if (!db) return fail(503, 'Not available.');

    const [profile, kyc, transactions, ledger, consents, acceptances, requests, logins] = await Promise.all([
      db.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      db.from('kyc_records').select('id, document_type, document_number_masked, status, admin_notes, submitted_at, reviewed_at').eq('user_id', user.id),
      db.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      db.from('ledger_entries').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      db.from('consent_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      db.from('legal_acceptances').select('*').eq('user_id', user.id),
      db.from('data_requests').select('*').eq('user_id', user.id),
      db.from('sessions').select('ip_address, user_agent, created_at, last_seen_at, revoked_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
    ]);

    const profileData = { ...(profile.data ?? {}) };
    delete (profileData as Record<string, unknown>).fcm_token;

    const payload = {
      exportedAt: new Date().toISOString(),
      exportedUnder: 'Digital Personal Data Protection Act, 2023 — Section 11 (Right to access information)',
      dataPrincipal: { id: user.id, email: user.email },
      profile: profileData,
      kycRecords: kyc.data ?? [],
      transactions: transactions.data ?? [],
      walletLedger: ledger.data ?? [],
      consentHistory: consents.data ?? [],
      legalAcceptances: acceptances.data ?? [],
      dataRequests: requests.data ?? [],
      loginHistory: logins.data ?? [],
      notes: [
        'Full KYC document numbers are stored encrypted and are not included in this export.',
        'Session identifiers are excluded as security material.',
        'Financial records are retained under applicable financial-records law even after an erasure request.',
      ],
    };

    await auditServer(req, 'DPDP_DATA_EXPORTED', { userId: user.id });

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="apextrade-data-export-${user.id}.json"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
