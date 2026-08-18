-- ==============================================================================
-- APEXTRADE — PRODUCTION SUPABASE / POSTGRESQL SCHEMA
-- ==============================================================================
-- Security model:
--   * Clients hold the `authenticated` role and may only read/write their own
--     rows, and only non-privileged columns of those rows.
--   * `role`, `kyc_status`, `wallet_balance`, `email_verified` are NOT writable
--     by clients at all — enforced twice: column-level GRANTs (hard) and a
--     BEFORE UPDATE trigger (defence in depth).
--   * All money movement goes through the append-only `ledger_entries` table
--     via credit_wallet()/debit_wallet(). `wallet_balance` is a cache of that
--     ledger, never a primary value.
--   * Admin actions run server-side under the service role, never from the
--     browser.
--
-- Apply with:  supabase db push     (or paste into the SQL editor)
-- Safe to re-run: every CREATE POLICY / TRIGGER / CONSTRAINT has a DROP guard.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. PROFILES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'admin')),
    kyc_status TEXT NOT NULL DEFAULT 'not_submitted'
        CHECK (kyc_status IN ('not_submitted', 'pending', 'approved', 'rejected')),
    wallet_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (wallet_balance >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,

    -- Client-editable profile fields
    city TEXT,
    state TEXT,
    bank_account_name TEXT,
    bank_name TEXT,
    bank_account_number TEXT,
    bank_ifsc TEXT,
    user_upi_id TEXT,
    trading_experience TEXT CHECK (trading_experience IN ('beginner', 'intermediate', 'expert')),
    risk_tolerance TEXT CHECK (risk_tolerance IN ('conservative', 'moderate', 'aggressive')),

    firebase_uid TEXT,
    fcm_token TEXT,

    -- DPDP: soft-delete marker so erasure can be honoured without breaking
    -- financial records that must be retained under separate law.
    erasure_requested_at TIMESTAMPTZ,
    anonymised_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Additive migration for existing deployments
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_account_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_ifsc TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_upi_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trading_experience TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS risk_tolerance TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS erasure_requested_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS anonymised_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles (lower(email));
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles (role);

-- ==============================================================================
-- 2. SESSIONS  (server-side, revocable)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    -- sha256 of the session id. The raw id lives only in the user's cookie, so
    -- a database dump does not hand an attacker usable sessions.
    sid_hash TEXT UNIQUE NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS sessions_user_idx ON public.sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON public.sessions (expires_at) WHERE revoked_at IS NULL;

-- ==============================================================================
-- 3. LOGIN / VERIFICATION OTPs  (hashed, single-use, expiring)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.auth_otps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    purpose TEXT NOT NULL CHECK (purpose IN ('login', 'email_verify', 'withdrawal_2fa')),
    -- sha256(code + email + purpose). The plaintext code is emailed and never stored.
    code_hash TEXT NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    consumed_at TIMESTAMPTZ,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS auth_otps_lookup_idx
    ON public.auth_otps (lower(email), purpose, expires_at DESC)
    WHERE consumed_at IS NULL;

-- ==============================================================================
-- 4. KYC RECORDS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.kyc_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL
        CHECK (document_type IN ('aadhaar', 'pan', 'passport', 'voter_id', 'driving_license')),
    -- Store only the last 4 digits in clear; full number encrypted at rest
    -- (AES-256-GCM, base64 of iv||ciphertext, key held in KYC_ENCRYPTION_KEY).
    document_number_masked TEXT NOT NULL,
    document_number_encrypted TEXT,
    file_paths TEXT[] NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS kyc_user_idx ON public.kyc_records (user_id);
CREATE INDEX IF NOT EXISTS kyc_status_idx ON public.kyc_records (status) WHERE status = 'pending';

-- ==============================================================================
-- 5. TRANSACTIONS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    amount_inr NUMERIC(14, 2),
    utr_number TEXT,
    proof_image_path TEXT,
    payment_mode TEXT DEFAULT 'bank_transfer',
    withdrawal_account_details JSONB,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
    admin_remarks TEXT,
    processed_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS transactions_user_idx ON public.transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS transactions_pending_idx ON public.transactions (status) WHERE status = 'pending';

-- A given UTR may only ever be credited once.
CREATE UNIQUE INDEX IF NOT EXISTS transactions_utr_unique
    ON public.transactions (utr_number)
    WHERE utr_number IS NOT NULL AND status = 'completed';

-- ==============================================================================
-- 6. LEDGER  (append-only; the source of truth for money)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    direction TEXT NOT NULL CHECK (direction IN ('credit', 'debit')),
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    balance_after NUMERIC(14, 2) NOT NULL,
    reason TEXT NOT NULL,
    reference_type TEXT,
    reference_id UUID,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ledger_user_idx ON public.ledger_entries (user_id, created_at DESC);

-- Immutability: the ledger is append-only, including for the service role.
CREATE OR REPLACE FUNCTION public.reject_ledger_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'ledger_entries is append-only; corrections must be posted as new offsetting entries';
END;
$$;

DROP TRIGGER IF EXISTS ledger_no_update ON public.ledger_entries;
CREATE TRIGGER ledger_no_update BEFORE UPDATE OR DELETE ON public.ledger_entries
    FOR EACH ROW EXECUTE FUNCTION public.reject_ledger_mutation();

-- ==============================================================================
-- 7. BROKER PAYMENT SETTINGS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.broker_payment_settings (
    id INT PRIMARY KEY DEFAULT 1,
    bank_name TEXT NOT NULL DEFAULT 'HDFC Bank Ltd.',
    account_holder TEXT NOT NULL DEFAULT '',
    account_number TEXT NOT NULL DEFAULT '',
    ifsc_code TEXT NOT NULL DEFAULT '',
    upi_id TEXT NOT NULL DEFAULT '',
    qr_image_url TEXT,
    crypto_usdt_address TEXT,
    usd_to_inr_rate NUMERIC(10, 4) NOT NULL DEFAULT 84.50,
    instructions TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.broker_payment_settings
    ADD COLUMN IF NOT EXISTS usd_to_inr_rate NUMERIC(10, 4) NOT NULL DEFAULT 84.50;

INSERT INTO public.broker_payment_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 8. DPDP ACT 2023 — CONSENT, LEGAL ACCEPTANCE, DATA PRINCIPAL REQUESTS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.consent_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    email TEXT,
    consent_type TEXT NOT NULL,
    consent_version TEXT NOT NULL,
    granted BOOLEAN NOT NULL DEFAULT TRUE,
    -- s.6(4): withdrawal must be as easy as granting. Recorded, never deleted.
    withdrawn_at TIMESTAMPTZ,
    purpose TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.consent_logs ADD COLUMN IF NOT EXISTS granted BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.consent_logs ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMPTZ;
ALTER TABLE public.consent_logs ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'unspecified';
ALTER TABLE public.consent_logs ADD COLUMN IF NOT EXISTS email TEXT;

CREATE INDEX IF NOT EXISTS consent_user_idx ON public.consent_logs (user_id, created_at DESC);

-- Versioned acceptance of Terms / Risk Disclosure / Client Agreement
CREATE TABLE IF NOT EXISTS public.legal_acceptances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    document TEXT NOT NULL CHECK (document IN ('terms', 'risk_disclosure', 'privacy_notice', 'client_agreement')),
    version TEXT NOT NULL,
    document_hash TEXT,
    ip_address TEXT,
    user_agent TEXT,
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, document, version)
);

-- DPDP ss.11-13: access, correction, erasure, grievance
CREATE TABLE IF NOT EXISTS public.data_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    request_type TEXT NOT NULL
        CHECK (request_type IN ('access', 'correction', 'erasure', 'grievance', 'consent_withdrawal')),
    details TEXT,
    status TEXT NOT NULL DEFAULT 'received'
        CHECK (status IN ('received', 'in_progress', 'completed', 'rejected')),
    resolution_notes TEXT,
    handled_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Statutory clock. Grievances must be resolved within the period prescribed
    -- by the DPDP Rules; this column makes breaches queryable.
    due_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS data_requests_open_idx
    ON public.data_requests (due_at) WHERE status IN ('received', 'in_progress');

-- ==============================================================================
-- 9. AUDIT LOGS  (append-only)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_created_idx ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_user_idx ON public.audit_logs (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.reject_audit_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs is append-only';
END;
$$;

DROP TRIGGER IF EXISTS audit_no_update ON public.audit_logs;
CREATE TRIGGER audit_no_update BEFORE UPDATE OR DELETE ON public.audit_logs
    FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();

-- ==============================================================================
-- 10. PRIVILEGE-ESCALATION GUARD
-- ==============================================================================
-- Belt and braces. The column GRANTs in section 12 are the hard control; this
-- trigger catches anything that slips past them (a mis-scoped grant, a future
-- policy edit, a compromised anon key used against a mis-set policy).

CREATE OR REPLACE FUNCTION public.guard_profile_privileged_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- The service role (server-side admin actions) is allowed through.
    IF current_setting('request.jwt.claim.role', true) = 'service_role'
       OR current_user = 'postgres' THEN
        RETURN NEW;
    END IF;

    IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'role cannot be changed by the account holder';
    END IF;
    IF NEW.wallet_balance IS DISTINCT FROM OLD.wallet_balance THEN
        RAISE EXCEPTION 'wallet_balance is ledger-derived and cannot be set directly';
    END IF;
    IF NEW.kyc_status IS DISTINCT FROM OLD.kyc_status THEN
        RAISE EXCEPTION 'kyc_status is set by compliance review only';
    END IF;
    IF NEW.email_verified IS DISTINCT FROM OLD.email_verified THEN
        RAISE EXCEPTION 'email_verified is set by the verification flow only';
    END IF;
    IF NEW.email IS DISTINCT FROM OLD.email THEN
        RAISE EXCEPTION 'email changes must go through the verification flow';
    END IF;
    IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
        RAISE EXCEPTION 'is_active is set by administrators only';
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_privileged ON public.profiles;
CREATE TRIGGER profiles_guard_privileged BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privileged_columns();

-- ==============================================================================
-- 11. MONEY MOVEMENT  (the only sanctioned path)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.post_ledger_entry(
    p_user_id UUID,
    p_direction TEXT,
    p_amount NUMERIC,
    p_reason TEXT,
    p_reference_type TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_balance NUMERIC(14,2);
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'amount must be positive';
    END IF;

    -- Row lock serialises concurrent credits/debits for this user, so two
    -- simultaneous withdrawals cannot both pass the sufficient-funds check.
    SELECT wallet_balance INTO v_balance
    FROM public.profiles WHERE id = p_user_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'unknown user %', p_user_id;
    END IF;

    IF p_direction = 'credit' THEN
        v_balance := v_balance + p_amount;
    ELSIF p_direction = 'debit' THEN
        IF v_balance < p_amount THEN
            RAISE EXCEPTION 'insufficient balance: have %, need %', v_balance, p_amount;
        END IF;
        v_balance := v_balance - p_amount;
    ELSE
        RAISE EXCEPTION 'direction must be credit or debit';
    END IF;

    INSERT INTO public.ledger_entries
        (user_id, direction, amount, balance_after, reason, reference_type, reference_id, created_by)
    VALUES
        (p_user_id, p_direction, p_amount, v_balance, p_reason, p_reference_type, p_reference_id, p_created_by);

    UPDATE public.profiles
    SET wallet_balance = v_balance, updated_at = NOW()
    WHERE id = p_user_id;

    RETURN v_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.post_ledger_entry FROM PUBLIC, anon, authenticated;

-- Reconciliation check: cached balance must equal the ledger's last entry.
CREATE OR REPLACE VIEW public.balance_reconciliation AS
SELECT
    p.id AS user_id,
    p.email,
    p.wallet_balance AS cached_balance,
    COALESCE((
        SELECT SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END)
        FROM public.ledger_entries l WHERE l.user_id = p.id
    ), 0) AS ledger_balance,
    p.wallet_balance - COALESCE((
        SELECT SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END)
        FROM public.ledger_entries l WHERE l.user_id = p.id
    ), 0) AS drift
FROM public.profiles p;

-- ==============================================================================
-- 12. GRANTS  (hard column-level enforcement)
-- ==============================================================================

REVOKE ALL ON public.profiles FROM anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;
-- Clients may update only these columns. `role`, `wallet_balance`, `kyc_status`,
-- `email`, `email_verified` and `is_active` are deliberately absent.
GRANT UPDATE (
    full_name, phone, city, state,
    bank_account_name, bank_name, bank_account_number, bank_ifsc, user_upi_id,
    trading_experience, risk_tolerance, fcm_token, updated_at
) ON public.profiles TO authenticated;

REVOKE ALL ON public.ledger_entries FROM anon, authenticated;
GRANT SELECT ON public.ledger_entries TO authenticated;

REVOKE ALL ON public.sessions FROM anon, authenticated;
REVOKE ALL ON public.auth_otps FROM anon, authenticated;

REVOKE ALL ON public.audit_logs FROM anon, authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;

GRANT SELECT, INSERT ON public.kyc_records TO authenticated;
GRANT SELECT, INSERT ON public.transactions TO authenticated;
GRANT SELECT, INSERT ON public.consent_logs TO authenticated;
GRANT SELECT, INSERT ON public.legal_acceptances TO authenticated;
GRANT SELECT, INSERT ON public.data_requests TO authenticated;
GRANT SELECT ON public.broker_payment_settings TO anon, authenticated;

-- ==============================================================================
-- 13. ROW LEVEL SECURITY
-- ==============================================================================

ALTER TABLE public.profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_otps               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_records             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_acceptances       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_requests           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs              ENABLE ROW LEVEL SECURITY;

-- Force RLS even for the table owner, so a mistake in connection role does not
-- silently expose every row.
ALTER TABLE public.profiles     FORCE ROW LEVEL SECURITY;
ALTER TABLE public.transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_records  FORCE ROW LEVEL SECURITY;

-- Helper: is the caller an admin? SECURITY DEFINER so the lookup itself is not
-- subject to the policy being evaluated (which would recurse).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin' AND is_active
    );
$$;

-- --- profiles ---------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"   ON public.profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
CREATE POLICY "profiles_select_admin" ON public.profiles FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"   ON public.profiles FOR UPDATE
    USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- --- kyc_records ------------------------------------------------------------
DROP POLICY IF EXISTS "Users can insert own KYC" ON public.kyc_records;
DROP POLICY IF EXISTS "Users can view own KYC"   ON public.kyc_records;

DROP POLICY IF EXISTS "kyc_insert_own" ON public.kyc_records;
CREATE POLICY "kyc_insert_own"   ON public.kyc_records FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "kyc_select_own" ON public.kyc_records;
CREATE POLICY "kyc_select_own"   ON public.kyc_records FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "kyc_select_admin" ON public.kyc_records;
CREATE POLICY "kyc_select_admin" ON public.kyc_records FOR SELECT USING (public.is_admin());
-- Review is a server-side (service role) action; no client UPDATE policy exists.

-- --- transactions -----------------------------------------------------------
DROP POLICY IF EXISTS "Users can insert transactions"   ON public.transactions;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;

DROP POLICY IF EXISTS "tx_insert_own" ON public.transactions;
CREATE POLICY "tx_insert_own" ON public.transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id AND status = 'pending');
DROP POLICY IF EXISTS "tx_select_own" ON public.transactions;
CREATE POLICY "tx_select_own"   ON public.transactions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "tx_select_admin" ON public.transactions;
CREATE POLICY "tx_select_admin" ON public.transactions FOR SELECT USING (public.is_admin());
-- Approval/rejection is service-role only. Clients cannot UPDATE at all, so a
-- client cannot self-approve a deposit.

-- --- ledger -----------------------------------------------------------------
DROP POLICY IF EXISTS "ledger_select_own" ON public.ledger_entries;
CREATE POLICY "ledger_select_own"   ON public.ledger_entries FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "ledger_select_admin" ON public.ledger_entries;
CREATE POLICY "ledger_select_admin" ON public.ledger_entries FOR SELECT USING (public.is_admin());

-- --- payment settings -------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view broker payment settings" ON public.broker_payment_settings;
DROP POLICY IF EXISTS "settings_select_all" ON public.broker_payment_settings;
CREATE POLICY "settings_select_all" ON public.broker_payment_settings FOR SELECT USING (true);

-- --- consent / legal / data requests ---------------------------------------
DROP POLICY IF EXISTS "Users can insert consent" ON public.consent_logs;

DROP POLICY IF EXISTS "consent_insert_own" ON public.consent_logs;
CREATE POLICY "consent_insert_own" ON public.consent_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "consent_select_own" ON public.consent_logs;
CREATE POLICY "consent_select_own" ON public.consent_logs FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "consent_select_admin" ON public.consent_logs;
CREATE POLICY "consent_select_admin" ON public.consent_logs FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "legal_insert_own" ON public.legal_acceptances;
CREATE POLICY "legal_insert_own" ON public.legal_acceptances FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "legal_select_own" ON public.legal_acceptances;
CREATE POLICY "legal_select_own" ON public.legal_acceptances FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "legal_select_admin" ON public.legal_acceptances;
CREATE POLICY "legal_select_admin" ON public.legal_acceptances FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "dsr_insert_own" ON public.data_requests;
CREATE POLICY "dsr_insert_own"   ON public.data_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "dsr_select_own" ON public.data_requests;
CREATE POLICY "dsr_select_own"   ON public.data_requests FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "dsr_select_admin" ON public.data_requests;
CREATE POLICY "dsr_select_admin" ON public.data_requests FOR SELECT USING (public.is_admin());

-- --- audit ------------------------------------------------------------------
DROP POLICY IF EXISTS "audit_select_own" ON public.audit_logs;
CREATE POLICY "audit_select_own"   ON public.audit_logs FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "audit_select_admin" ON public.audit_logs;
CREATE POLICY "audit_select_admin" ON public.audit_logs FOR SELECT USING (public.is_admin());
-- Writes are service-role only; there is deliberately no INSERT policy.

-- --- sessions / otps --------------------------------------------------------
-- No policies at all: these tables are reachable only via the service role.

-- ==============================================================================
-- 14. RETENTION  (DPDP s.8(7) — erase when the purpose is served)
-- ==============================================================================
-- Financial records carry their own statutory retention and are excluded here.
-- Schedule via pg_cron:  SELECT cron.schedule('apex-retention','0 3 * * *','SELECT public.apply_retention_policy()');

CREATE OR REPLACE FUNCTION public.apply_retention_policy()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM public.auth_otps WHERE expires_at < NOW() - INTERVAL '1 day';
    DELETE FROM public.sessions  WHERE expires_at < NOW() - INTERVAL '30 days';

    -- CERT-In direction 5(iii) requires security logs to be retained 180 days.
    DELETE FROM public.audit_logs WHERE created_at < NOW() - INTERVAL '180 days';
END;
$$;

-- ==============================================================================
-- 15. PRICING — BUY/SELL SPREAD
-- ==============================================================================
-- `usd_to_inr_rate` is the MID rate. Clients never transact at mid: they buy USD
-- (deposit) at mid + spread and sell USD (withdrawal) at mid - spread. The
-- spread is the dealing desk's buffer for executing the matching real-world
-- transaction, and is disclosed to the client before they commit.
--
-- Both legs are stored as a rupee amount rather than a percentage so the desk
-- can reason about it directly, and both are bounded so a typo cannot quietly
-- take a large cut.

ALTER TABLE public.broker_payment_settings
    ADD COLUMN IF NOT EXISTS inr_spread_deposit NUMERIC(8, 4) NOT NULL DEFAULT 0.50,
    ADD COLUMN IF NOT EXISTS inr_spread_withdrawal NUMERIC(8, 4) NOT NULL DEFAULT 0.50,
    -- How long a quote stays honourable. This is the execution window.
    ADD COLUMN IF NOT EXISTS quote_validity_seconds INT NOT NULL DEFAULT 60,
    -- Default instrument spread in basis points, used when no per-symbol row exists.
    ADD COLUMN IF NOT EXISTS default_spread_bps NUMERIC(8, 2) NOT NULL DEFAULT 5.00;

ALTER TABLE public.broker_payment_settings
    DROP CONSTRAINT IF EXISTS spread_bounds;
ALTER TABLE public.broker_payment_settings
    ADD CONSTRAINT spread_bounds CHECK (
        inr_spread_deposit    >= 0 AND inr_spread_deposit    <= 5.0 AND
        inr_spread_withdrawal >= 0 AND inr_spread_withdrawal <= 5.0 AND
        default_spread_bps    >= 0 AND default_spread_bps    <= 200 AND
        quote_validity_seconds BETWEEN 5 AND 600
    );

-- Per-instrument spread overrides. Gold needs a wider spread than EUR/USD.
CREATE TABLE IF NOT EXISTS public.instrument_spreads (
    symbol TEXT PRIMARY KEY,
    spread_bps NUMERIC(8, 2) NOT NULL DEFAULT 5.00 CHECK (spread_bps >= 0 AND spread_bps <= 500),
    is_tradeable BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by UUID REFERENCES public.profiles(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.instrument_spreads (symbol, spread_bps) VALUES
    ('XAU/USD', 12.00),
    ('EUR/USD',  3.00),
    ('GBP/USD',  4.00),
    ('USD/INR',  5.00),
    ('BTC/USD', 25.00),
    ('WTI/USD', 15.00)
ON CONFLICT (symbol) DO NOTHING;

-- ==============================================================================
-- 16. DEMO / PAPER TRADING
-- ==============================================================================
-- Entirely separate from real money. Demo balances live in their own column and
-- demo positions in their own table, so no demo value can ever reach the real
-- ledger, a withdrawal, or a client's actual balance. Demo fills are priced from
-- sample quotes — honest only because nothing is at stake, which is exactly why
-- the separation has to be structural rather than a flag on a shared table.

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS demo_balance NUMERIC(14, 2) NOT NULL DEFAULT 100.00
        CHECK (demo_balance >= 0),
    ADD COLUMN IF NOT EXISTS demo_reset_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.demo_trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    pair_name TEXT NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
    lot_size NUMERIC(12, 4) NOT NULL CHECK (lot_size > 0),
    margin NUMERIC(14, 2) NOT NULL CHECK (margin > 0),
    leverage INT NOT NULL CHECK (leverage BETWEEN 1 AND 500),
    entry_price NUMERIC(18, 6) NOT NULL,
    exit_price NUMERIC(18, 6),
    stop_loss NUMERIC(18, 6),
    take_profit NUMERIC(18, 6),
    pnl NUMERIC(14, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS demo_trades_user_idx ON public.demo_trades (user_id, opened_at DESC);
CREATE INDEX IF NOT EXISTS demo_trades_open_idx ON public.demo_trades (user_id) WHERE status = 'OPEN';

-- Demo balance is server-maintained; clients may read but never write it.
-- Note it is absent from the column GRANT in section 12, and the section 10
-- trigger is extended below to reject direct changes.
CREATE OR REPLACE FUNCTION public.guard_profile_privileged_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF current_setting('request.jwt.claim.role', true) = 'service_role'
       OR current_user = 'postgres' THEN
        RETURN NEW;
    END IF;

    IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'role cannot be changed by the account holder';
    END IF;
    IF NEW.wallet_balance IS DISTINCT FROM OLD.wallet_balance THEN
        RAISE EXCEPTION 'wallet_balance is ledger-derived and cannot be set directly';
    END IF;
    IF NEW.demo_balance IS DISTINCT FROM OLD.demo_balance THEN
        RAISE EXCEPTION 'demo_balance is maintained by the demo engine';
    END IF;
    IF NEW.kyc_status IS DISTINCT FROM OLD.kyc_status THEN
        RAISE EXCEPTION 'kyc_status is set by compliance review only';
    END IF;
    IF NEW.email_verified IS DISTINCT FROM OLD.email_verified THEN
        RAISE EXCEPTION 'email_verified is set by the verification flow only';
    END IF;
    IF NEW.email IS DISTINCT FROM OLD.email THEN
        RAISE EXCEPTION 'email changes must go through the verification flow';
    END IF;
    IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
        RAISE EXCEPTION 'is_active is set by administrators only';
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

REVOKE ALL ON public.demo_trades FROM anon, authenticated;
GRANT SELECT ON public.demo_trades TO authenticated;
GRANT SELECT ON public.instrument_spreads TO anon, authenticated;

ALTER TABLE public.demo_trades        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instrument_spreads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "demo_select_own" ON public.demo_trades;
CREATE POLICY "demo_select_own"   ON public.demo_trades FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "demo_select_admin" ON public.demo_trades;
CREATE POLICY "demo_select_admin" ON public.demo_trades FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS "spreads_select_all" ON public.instrument_spreads;
CREATE POLICY "spreads_select_all" ON public.instrument_spreads FOR SELECT USING (true);

-- ==============================================================================
-- 17. STAFF & DEVELOPER ROLES
-- ==============================================================================
-- Four roles, least privilege:
--   client    — the account holder
--   staff     — reviews KYC and deposits; cannot change money or settings
--   admin     — full operational control
--   developer — tooling only (flags, logs, mail); NO access to client money
--
-- developer is deliberately not a superset of admin. Whoever builds the system
-- should not also be able to move client funds — that separation is what makes
-- the audit trail meaningful.

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check CHECK (role IN ('client', 'staff', 'admin', 'developer'));

-- is_admin() gates RLS on operational tables. Staff read the same queues, so
-- they are included here; write paths are separated in the application layer.
CREATE OR REPLACE FUNCTION public.is_staff_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('staff', 'admin') AND is_active
    );
$$;

CREATE OR REPLACE FUNCTION public.is_developer()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'developer' AND is_active
    );
$$;

-- ==============================================================================
-- 18. FEATURE FLAGS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.feature_flags (
    key TEXT PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    description TEXT NOT NULL,
    -- 0-100. Bucketed by hash(user_id + key), so a user's bucket is stable
    -- across requests rather than flickering on every page load.
    rollout_percent INT NOT NULL DEFAULT 100 CHECK (rollout_percent BETWEEN 0 AND 100),
    updated_by UUID REFERENCES public.profiles(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.feature_flags (key, enabled, description, rollout_percent) VALUES
    ('demo_trading',        TRUE,  'Demo / paper trading account', 100),
    ('live_trading',        FALSE, 'Live order entry. Requires a real market-data feed before enabling.', 0),
    ('deposits',            TRUE,  'Accept new deposit submissions', 100),
    ('withdrawals',         TRUE,  'Accept new withdrawal requests', 100),
    ('kyc_submission',      TRUE,  'Accept new KYC document uploads', 100),
    ('registration',        TRUE,  'Allow new account signups', 100),
    ('maintenance_mode',    FALSE, 'Show a maintenance notice and block money movement', 100)
ON CONFLICT (key) DO NOTHING;

-- ==============================================================================
-- 19. EMAIL DELIVERY LOG
-- ==============================================================================
-- Every outbound message is recorded. Without this, "the client says they never
-- got the OTP" is unanswerable.
--
-- Note what is NOT stored: the message body. It contains OTPs, balances and
-- personal data, and a log table is a far softer target than the mail provider.

CREATE TABLE IF NOT EXISTS public.email_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient TEXT NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    template TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'mocked')),
    provider_message_id TEXT,
    error TEXT,
    duration_ms INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS email_log_created_idx ON public.email_log (created_at DESC);
CREATE INDEX IF NOT EXISTS email_log_recipient_idx ON public.email_log (lower(recipient), created_at DESC);
CREATE INDEX IF NOT EXISTS email_log_failed_idx ON public.email_log (created_at DESC) WHERE status = 'failed';

-- ==============================================================================
-- 20. SYSTEM LOGS
-- ==============================================================================
-- Application errors and warnings, separate from audit_logs. audit_logs answers
-- "who did what to whom"; this answers "what broke". Mixing them makes both
-- harder to read.

CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error', 'fatal')),
    source TEXT NOT NULL,
    message TEXT NOT NULL,
    context JSONB,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    request_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS system_logs_created_idx ON public.system_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS system_logs_level_idx ON public.system_logs (level, created_at DESC)
    WHERE level IN ('error', 'fatal');

-- Grants: these are operator tooling, reachable only through the service role.
REVOKE ALL ON public.feature_flags  FROM anon, authenticated;
REVOKE ALL ON public.email_log      FROM anon, authenticated;
REVOKE ALL ON public.system_logs    FROM anon, authenticated;
GRANT SELECT ON public.feature_flags TO authenticated;

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_log     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs   ENABLE ROW LEVEL SECURITY;

-- Flags are readable by any signed-in user (the UI needs them); only the
-- service role writes them.
DROP POLICY IF EXISTS "flags_select_all" ON public.feature_flags;
CREATE POLICY "flags_select_all" ON public.feature_flags FOR SELECT USING (true);
-- email_log and system_logs get no policies at all: service role only.

-- Retention: extend the existing policy to cover the new log tables.
CREATE OR REPLACE FUNCTION public.apply_retention_policy()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM public.auth_otps WHERE expires_at < NOW() - INTERVAL '1 day';
    DELETE FROM public.sessions  WHERE expires_at < NOW() - INTERVAL '30 days';

    -- CERT-In direction 5(iii) requires security logs to be retained 180 days.
    DELETE FROM public.audit_logs WHERE created_at < NOW() - INTERVAL '180 days';

    -- Operational logs: shorter, they are diagnostics not evidence.
    DELETE FROM public.email_log   WHERE created_at < NOW() - INTERVAL '90 days';
    DELETE FROM public.system_logs WHERE created_at < NOW() - INTERVAL '30 days'
        AND level NOT IN ('error', 'fatal');
    DELETE FROM public.system_logs WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- ==============================================================================
-- 21. APP SETTINGS  (branding & contact — everything admin-editable)
-- ==============================================================================
-- Single row. No brand name, contact address or legal entity is hardcoded in
-- the application; it all lives here so an operator can change it without a
-- deploy. Legal-facing fields (company name, address, grievance officer) are
-- included because publishing stale or invented ones is a compliance problem,
-- not a cosmetic one.

CREATE TABLE IF NOT EXISTS public.app_settings (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),

    -- Identity
    app_name TEXT NOT NULL DEFAULT 'Global Forex',
    app_short_name TEXT NOT NULL DEFAULT 'Global Forex',
    tagline TEXT NOT NULL DEFAULT 'Markets, transparently',
    logo_url TEXT,
    favicon_url TEXT,

    -- Theme
    primary_color TEXT NOT NULL DEFAULT '#3faa4a',
    accent_color TEXT NOT NULL DEFAULT '#1e5aa8',

    -- Legal entity (published in Terms and the Client Agreement)
    company_legal_name TEXT NOT NULL DEFAULT '',
    company_registration_no TEXT NOT NULL DEFAULT '',
    company_address TEXT NOT NULL DEFAULT '',
    governing_law_city TEXT NOT NULL DEFAULT '',

    -- Contact
    support_email TEXT NOT NULL DEFAULT '',
    support_phone TEXT NOT NULL DEFAULT '',
    grievance_officer_name TEXT NOT NULL DEFAULT '',
    grievance_officer_email TEXT NOT NULL DEFAULT '',
    grievance_officer_phone TEXT NOT NULL DEFAULT '',
    grievance_response_days INT NOT NULL DEFAULT 30 CHECK (grievance_response_days BETWEEN 1 AND 90),

    -- Email sender identity
    email_from_name TEXT NOT NULL DEFAULT 'Global Forex',
    email_footer_note TEXT NOT NULL DEFAULT '',

    -- Public presence
    website_url TEXT,
    telegram_url TEXT,
    whatsapp_number TEXT,

    updated_by UUID REFERENCES public.profiles(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.app_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Rename an already-seeded row. Safe to re-run; only touches the old default.
UPDATE public.app_settings
   SET app_name = 'Global Forex',
       app_short_name = 'Global Forex',
       email_from_name = 'Global Forex',
       logo_url = COALESCE(logo_url, '/icons/logo.svg'),
       favicon_url = COALESCE(favicon_url, '/icons/favicon.svg')
 WHERE id = 1 AND app_name IN ('Apex Trade', 'Global Forex');

REVOKE ALL ON public.app_settings FROM anon, authenticated;
GRANT SELECT ON public.app_settings TO anon, authenticated;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
-- Branding is public by nature; writes are service-role only.
DROP POLICY IF EXISTS "app_settings_select_all" ON public.app_settings;
CREATE POLICY "app_settings_select_all" ON public.app_settings FOR SELECT USING (true);

-- ==============================================================================
-- 22. STORAGE BUCKETS
-- ==============================================================================
-- Three buckets. Two are PRIVATE and must stay that way.
--
--   kyc-documents   PRIVATE — identity documents (PAN, Aadhaar, passport).
--   payment-proofs  PRIVATE — deposit screenshots; show bank details and names.
--   public-assets   PUBLIC  — logos and branding only. Never client data.
--
-- A public bucket URL is permanent and unguessable-by-obscurity only: anyone
-- who ever sees the link keeps access forever, and Supabase public URLs are
-- predictable from the object path. For identity documents that is a standing
-- data breach, so reads go through short-lived signed URLs instead.
--
-- Path convention is `{user_id}/{uuid}.{ext}`. The policies below use
-- storage.foldername(name)[1] to compare the first path segment against
-- auth.uid(), which is what scopes a user to their own folder.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    ('kyc-documents',  'kyc-documents',  FALSE, 5242880,  ARRAY['image/jpeg','image/png','image/webp','application/pdf']),
    ('payment-proofs', 'payment-proofs', FALSE, 5242880,  ARRAY['image/jpeg','image/png','image/webp','application/pdf']),
    ('public-assets',  'public-assets',  TRUE,  2097152,  ARRAY['image/jpeg','image/png','image/webp','image/svg+xml'])
ON CONFLICT (id) DO UPDATE
    SET public = EXCLUDED.public,
        file_size_limit = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;

-- --- kyc-documents ----------------------------------------------------------
DROP POLICY IF EXISTS "kyc_upload_own" ON storage.objects;
CREATE POLICY "kyc_upload_own" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'kyc-documents'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "kyc_read_own" ON storage.objects;
CREATE POLICY "kyc_read_own" ON storage.objects FOR SELECT TO authenticated
    USING (
        bucket_id = 'kyc-documents'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "kyc_read_reviewers" ON storage.objects;
CREATE POLICY "kyc_read_reviewers" ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'kyc-documents' AND public.is_staff_or_admin());

-- No UPDATE or DELETE policy: a submitted identity document is evidence for the
-- KYC decision and must not be swapped or removed after review. Erasure runs
-- server-side under the service role as part of a DPDP request.

-- --- payment-proofs ---------------------------------------------------------
DROP POLICY IF EXISTS "proof_upload_own" ON storage.objects;
CREATE POLICY "proof_upload_own" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'payment-proofs'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "proof_read_own" ON storage.objects;
CREATE POLICY "proof_read_own" ON storage.objects FOR SELECT TO authenticated
    USING (
        bucket_id = 'payment-proofs'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "proof_read_reviewers" ON storage.objects;
CREATE POLICY "proof_read_reviewers" ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'payment-proofs' AND public.is_staff_or_admin());

-- --- public-assets ----------------------------------------------------------
DROP POLICY IF EXISTS "assets_read_all" ON storage.objects;
CREATE POLICY "assets_read_all" ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'public-assets');

-- Branding uploads are an operator action; the service role handles them, so
-- there is deliberately no client INSERT policy here.

-- ==============================================================================
-- 23. SUPPORT & BUG REPORTS
-- ==============================================================================
-- Anyone signed in — client, staff or admin — can raise a ticket with a
-- screenshot. Diagnostics (page URL, viewport, user agent, recent JS errors)
-- are captured automatically, because "it's broken" without them costs a
-- round-trip to reproduce.

CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    -- Snapshot of the reporter's role at report time. Their role may change
    -- later, and the ticket should still say who was looking at what.
    reporter_role TEXT NOT NULL DEFAULT 'client',
    reporter_email TEXT,

    category TEXT NOT NULL DEFAULT 'bug'
        CHECK (category IN ('bug', 'payment', 'kyc', 'account', 'feature', 'other')),
    severity TEXT NOT NULL DEFAULT 'normal'
        CHECK (severity IN ('low', 'normal', 'high', 'blocker')),
    subject TEXT NOT NULL,
    description TEXT NOT NULL,

    -- Object path in the private support-screenshots bucket.
    screenshot_path TEXT,

    -- Auto-captured diagnostics
    page_url TEXT,
    user_agent TEXT,
    viewport TEXT,
    app_role TEXT,
    console_errors JSONB,

    status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'wont_fix')),
    developer_notes TEXT,
    assigned_to UUID REFERENCES public.profiles(id),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS support_open_idx ON public.support_tickets (created_at DESC)
    WHERE status IN ('open', 'in_progress');
CREATE INDEX IF NOT EXISTS support_user_idx ON public.support_tickets (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS support_severity_idx ON public.support_tickets (severity, created_at DESC)
    WHERE status = 'open';

REVOKE ALL ON public.support_tickets FROM anon, authenticated;
GRANT SELECT, INSERT ON public.support_tickets TO authenticated;

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_insert_own" ON public.support_tickets;
CREATE POLICY "support_insert_own" ON public.support_tickets FOR INSERT
    WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "support_select_own" ON public.support_tickets;
CREATE POLICY "support_select_own" ON public.support_tickets FOR SELECT
    USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "support_select_ops" ON public.support_tickets;
CREATE POLICY "support_select_ops" ON public.support_tickets FOR SELECT
    USING (public.is_staff_or_admin() OR public.is_developer());
-- Status changes are a service-role action, so there is no client UPDATE policy:
-- a reporter cannot mark their own ticket resolved.

-- Screenshots may show balances and personal data, so this bucket is private
-- like the others and served only through short-lived signed URLs.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('support-screenshots', 'support-screenshots', FALSE, 5242880,
        ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE
    SET public = EXCLUDED.public,
        file_size_limit = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "support_ss_upload_own" ON storage.objects;
CREATE POLICY "support_ss_upload_own" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'support-screenshots'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "support_ss_read_own" ON storage.objects;
CREATE POLICY "support_ss_read_own" ON storage.objects FOR SELECT TO authenticated
    USING (
        bucket_id = 'support-screenshots'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "support_ss_read_ops" ON storage.objects;
CREATE POLICY "support_ss_read_ops" ON storage.objects FOR SELECT TO authenticated
    USING (
        bucket_id = 'support-screenshots'
        AND (public.is_staff_or_admin() OR public.is_developer())
    );

-- ==============================================================================
-- 24. BOOTSTRAP THE FIRST ADMIN
-- ==============================================================================
-- Admin cannot be self-assigned anywhere in the application. Promote the first
-- one deliberately, here, then manage the rest through the admin panel.
--
--   UPDATE public.profiles SET role = 'admin' WHERE email = 'you@yourdomain.com';

-- ==============================================================================
-- 25. NOTIFICATIONS  (persistent, per-user)
-- ==============================================================================
-- In-app notifications previously lived in React state and vanished on refresh,
-- so a client who missed the toast never learned their deposit was credited.
-- These persist, carry a deep link, and track read state.

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'system'
        CHECK (type IN ('deposit', 'withdrawal', 'kyc', 'security', 'system', 'support')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    /** Where clicking it takes the user, e.g. /transactions. */
    link TEXT,
    /** Higher priority sorts first and renders more prominently. */
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_idx
    ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_unread_idx
    ON public.notifications (user_id) WHERE read_at IS NULL;

REVOKE ALL ON public.notifications FROM anon, authenticated;
GRANT SELECT, UPDATE (read_at) ON public.notifications TO authenticated;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

-- Clients may only mark their own as read. Creating a notification is a
-- service-role action: a client-writable notification table is a phishing
-- surface inside the product.
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Per-channel delivery preferences.
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS notify_email BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS notify_inapp BOOLEAN NOT NULL DEFAULT TRUE;

-- Security and money notifications ignore preferences — a client must always be
-- told their balance moved or someone signed in. Only marketing is optional,
-- and that is governed by DPDP consent, not this flag.

-- ==============================================================================
-- 26. PHONE LOGIN  (second OTP channel alongside email)
-- ==============================================================================
-- The OTP table was email-only. Adding a channel + identifier lets the same
-- verified flow — hashed code, single use, 10 min TTL, 5 attempts, rate limited
-- — carry SMS without duplicating any of that logic.

ALTER TABLE public.auth_otps
    ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'email'
        CHECK (channel IN ('email', 'sms')),
    -- The address the code was sent to: an email or an E.164 phone number.
    ADD COLUMN IF NOT EXISTS identifier TEXT;

-- Backfill so existing rows keep working.
UPDATE public.auth_otps SET identifier = email WHERE identifier IS NULL;

-- email is no longer always present (SMS logins have none).
ALTER TABLE public.auth_otps ALTER COLUMN email DROP NOT NULL;

CREATE INDEX IF NOT EXISTS auth_otps_identifier_idx
    ON public.auth_otps (lower(identifier), purpose, expires_at DESC)
    WHERE consumed_at IS NULL;

-- One verified phone per account, so a number cannot be attached to two logins.
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique
    ON public.profiles (phone) WHERE phone IS NOT NULL AND phone_verified;
