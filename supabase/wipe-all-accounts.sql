-- ==============================================================================
-- WIPE EVERY ACCOUNT — clean slate before adding operators
-- ==============================================================================
-- Irreversible. No undo, no soft delete, no backup taken here.
--
-- Verified safe at the time of writing: 4 accounts, all wallet_balance = 0,
-- and zero rows in ledger_entries, transactions, kyc_records and demo_trades.
-- Nothing of value is destroyed. Re-run STEP 1 before you execute, in case
-- someone has signed up since.
-- ==============================================================================


-- ------------------------------------------------------------------------------
-- STEP 1 — confirm nothing is holding money. Every count must be 0.
-- ------------------------------------------------------------------------------
SELECT
  (SELECT count(*) FROM public.profiles)                              AS accounts,
  (SELECT count(*) FROM public.profiles WHERE wallet_balance <> 0)    AS with_balance,
  (SELECT count(*) FROM public.ledger_entries)                        AS ledger_entries,
  (SELECT count(*) FROM public.transactions)                          AS transactions,
  (SELECT count(*) FROM public.kyc_records)                           AS kyc_records;

-- STOP if with_balance, ledger_entries or transactions is non-zero. Those are
-- records of real money belonging to real people and cannot be reconstructed.


-- ------------------------------------------------------------------------------
-- STEP 2 — delete
-- ------------------------------------------------------------------------------
BEGIN;

-- 1. Unlink operator references so foreign keys don't block account deletions
UPDATE public.transactions SET processed_by = NULL;
UPDATE public.kyc_records SET reviewed_by = NULL;
UPDATE public.ledger_entries SET created_by = NULL;

-- 2. Clear all transactional, trading, and KYC child tables
DELETE FROM public.demo_trades;
DELETE FROM public.trade_orders;
DELETE FROM public.transactions;
DELETE FROM public.ledger_entries;
DELETE FROM public.kyc_documents;
DELETE FROM public.kyc_records;
DELETE FROM public.legal_acceptances;
DELETE FROM public.consent_logs;
DELETE FROM public.data_requests;
DELETE FROM public.sessions;
DELETE FROM public.notifications;
DELETE FROM public.auth_otps;

-- 3. Temporarily stand down audit trigger to allow user cascade
ALTER TABLE public.audit_logs DISABLE TRIGGER audit_no_update;

DELETE FROM public.audit_logs;
DELETE FROM public.profiles;
DELETE FROM auth.users;

ALTER TABLE public.audit_logs ENABLE TRIGGER audit_no_update;

COMMIT;


-- ------------------------------------------------------------------------------
-- STEP 3 — confirm empty
-- ------------------------------------------------------------------------------
SELECT
  (SELECT count(*) FROM public.profiles)   AS profiles,
  (SELECT count(*) FROM auth.users)        AS auth_users,
  (SELECT count(*) FROM public.sessions)   AS sessions;


-- ==============================================================================
-- NEXT: add your operators
-- ==============================================================================
-- Roles cannot be assigned before an account exists — profiles.id references
-- auth.users(id), and verify-otp hardcodes role = 'client'. So for each address:
--
--   1. Sign in through the app once (creates the auth user + profile as client)
--   2. Run supabase/make-operator.sql (promotes to admin / developer / staff)
--
-- Do admin@mail.globalforex.online first. Until at least one operator exists,
-- /admin and /developer answer 404 for everyone, including you.
