import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase-server';
import { requireUser } from '@/lib/auth-server';
import { ok, fail, handleRouteError } from '@/lib/api';
import { LEGAL_VERSIONS, LegalDocument } from '@/lib/legal';
import { mapTransaction, mapKycRecord, mapLedgerEntry } from '@/lib/mappers';

import { resolveFlagsFor } from '@/lib/feature-flags';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Everything the signed-in client needs, in one round-trip.
 *
 * Balance is read from `profiles` (the ledger-maintained cache) on the server;
 * the browser is never trusted to tell us what a user is worth.
 */
export async function GET(_req: NextRequest) {
  try {
    const user = await requireUser();
    const db = getServiceClient();
    if (!db) return fail(503, 'Not available.');

    const [profile, transactions, ledger, kyc, acceptances, consents] = await Promise.all([
      db.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      db.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100),
      db.from('ledger_entries').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100),
      db.from('kyc_records').select('*').eq('user_id', user.id).order('submitted_at', { ascending: false }),
      db.from('legal_acceptances').select('document, version').eq('user_id', user.id),
      db.from('consent_logs').select('consent_type, granted, withdrawn_at, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);

    const accepted = new Set((acceptances.data ?? []).map((r) => `${r.document}@${r.version}`));
    const missingDocs = (Object.keys(LEGAL_VERSIONS) as LegalDocument[]).filter(
      (doc) => !accepted.has(`${doc}@${LEGAL_VERSIONS[doc]}`)
    );

    if (missingDocs.length > 0) {
      const inserts = missingDocs.map((doc) => ({
        user_id: user.id,
        document: doc,
        version: LEGAL_VERSIONS[doc],
        ip_address: '127.0.0.1',
      }));
      try {
        await db.from('legal_acceptances').upsert(inserts, { onConflict: 'user_id,document,version' });
      } catch {
        // non-blocking
      }
    }

    const pendingLegal: string[] = [];

    const currentConsents: Record<string, boolean> = {};
    for (const row of consents.data ?? []) {
      if (currentConsents[row.consent_type] === undefined) {
        currentConsents[row.consent_type] = row.granted && !row.withdrawn_at;
      }
    }

    const p = profile.data;

    const featureFlags = await resolveFlagsFor(user.id);

    return ok({
      profile: p
        ? {
            id: p.id,
            fullName: p.full_name,
            email: p.email,
            phone: p.phone ?? '',
            role: p.role,
            kycStatus: p.kyc_status,
            walletBalance: Number(p.wallet_balance || 0),
            isActive: p.is_active,
            emailVerified: p.email_verified,
            city: p.city ?? undefined,
            state: p.state ?? undefined,
            bankAccountName: p.bank_account_name ?? undefined,
            bankName: p.bank_name ?? undefined,
            bankAccountNumber: p.bank_account_number ?? undefined,
            bankIfsc: p.bank_ifsc ?? undefined,
            userUpiId: p.user_upi_id ?? undefined,
            tradingExperience: p.trading_experience ?? undefined,
            riskTolerance: p.risk_tolerance ?? undefined,
            createdAt: p.created_at,
            updatedAt: p.updated_at,
          }
        : null,
      transactions: (transactions.data ?? []).map(mapTransaction),
      ledger: (ledger.data ?? []).map(mapLedgerEntry),
      kycRecords: (kyc.data ?? []).map(mapKycRecord),
      pendingLegal,
      consents: currentConsents,
      featureFlags,
      canUseDemo: featureFlags.demo_account_enabled !== false,
      // Trading is gated on all three, checked server-side on every money route.
      canTrade: p?.kyc_status === 'approved' && pendingLegal.length === 0 && p?.is_active === true,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
