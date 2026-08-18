import { Transaction, KYCRecord, LedgerEntry, UserProfile, WithdrawalDetails } from './types';

/**
 * Database row → domain object.
 *
 * Postgres columns are snake_case; the UI types are camelCase. Every API route
 * that returns one of these shapes must map through here rather than passing
 * raw rows to the client — an unmapped row renders as a page full of blanks,
 * and it silently leaks column names and any field the UI never intended to
 * show.
 */

type Row = Record<string, any>;

/** Joined `profiles!...(full_name, email)` comes back as an object or an array. */
function joinedProfile(row: Row): { full_name?: string; email?: string } {
  const joined = row.profiles;
  if (!joined) return {};
  return Array.isArray(joined) ? (joined[0] ?? {}) : joined;
}

export function mapTransaction(row: Row): Transaction {
  const profile = joinedProfile(row);

  return {
    id: row.id,
    userId: row.user_id,
    userFullName: profile.full_name ?? row.user_full_name ?? undefined,
    userEmail: profile.email ?? row.user_email ?? undefined,
    type: row.type,
    amount: Number(row.amount ?? 0),
    amountINR: row.amount_inr !== null && row.amount_inr !== undefined ? Number(row.amount_inr) : undefined,
    paymentMode: row.payment_mode ?? undefined,
    utrNumber: row.utr_number ?? undefined,
    proofImagePath: row.proof_image_path ?? undefined,
    withdrawalDetails: (row.withdrawal_account_details ?? undefined) as WithdrawalDetails | undefined,
    status: row.status,
    adminRemarks: row.admin_remarks ?? undefined,
    createdAt: row.created_at,
    processedAt: row.processed_at ?? undefined,
  };
}

export function mapKycRecord(row: Row): KYCRecord {
  const profile = joinedProfile(row);

  return {
    id: row.id,
    userId: row.user_id,
    userFullName: profile.full_name ?? undefined,
    userEmail: profile.email ?? undefined,
    documentType: row.document_type,
    // Only ever the masked form (e.g. XXXXXX1234). The full number is encrypted
    // at rest and is deliberately not selected by any read path.
    documentNumber: row.document_number_masked ?? '',
    filePaths: row.file_paths ?? [],
    status: row.status,
    adminNotes: row.admin_notes ?? undefined,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at ?? undefined,
    reviewedBy: row.reviewed_by ?? undefined,
  };
}

/** Map a ledger reason to the label the statement screen groups by. */
function ledgerLabel(reason: string, direction: 'credit' | 'debit'): string {
  const r = (reason ?? '').toLowerCase();
  if (r.includes('deposit')) return 'Deposit';
  if (r.includes('withdraw')) return 'Withdrawal';
  if (r.includes('adjust')) return 'Adjustment';
  if (r.includes('trade') || r.includes('p&l')) return 'Trade P&L';
  return direction === 'credit' ? 'Credit' : 'Debit';
}

export function mapLedgerEntry(row: Row): LedgerEntry {
  const direction = row.direction as 'credit' | 'debit';
  const amount = Number(row.amount ?? 0);

  return {
    id: row.id,
    user_id: row.user_id,
    direction,
    amount,
    balance_after: Number(row.balance_after ?? 0),
    reason: row.reason,
    reference_type: row.reference_type ?? null,
    reference_id: row.reference_id ?? null,
    created_at: row.created_at,

    // Presentation aliases so the statement screen can render a credit/debit
    // ledger view directly. Same numbers, split by direction.
    userId: row.user_id,
    date: row.created_at,
    type: ledgerLabel(row.reason, direction),
    description: row.reason,
    credit: direction === 'credit' ? amount : 0,
    debit: direction === 'debit' ? amount : 0,
    balance: Number(row.balance_after ?? 0),
  };
}

export function mapProfile(row: Row, usdToInrRate = 84.5): UserProfile {
  const balance = Number(row.wallet_balance ?? 0);

  return {
    id: row.id,
    fullName: row.full_name ?? 'Trader',
    email: row.email,
    phone: row.phone ?? '',
    role: row.role ?? 'client',
    kycStatus: row.kyc_status ?? 'not_submitted',
    walletBalance: balance,
    walletBalanceINR: Number((balance * usdToInrRate).toFixed(2)),
    isActive: row.is_active !== false,
    city: row.city ?? undefined,
    state: row.state ?? undefined,
    bankAccountName: row.bank_account_name ?? undefined,
    bankName: row.bank_name ?? undefined,
    bankAccountNumber: row.bank_account_number ?? undefined,
    bankIfsc: row.bank_ifsc ?? undefined,
    userUpiId: row.user_upi_id ?? undefined,
    tradingExperience: row.trading_experience ?? undefined,
    riskTolerance: row.risk_tolerance ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
