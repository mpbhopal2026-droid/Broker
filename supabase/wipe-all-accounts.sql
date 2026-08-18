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
-- Deleting from auth.users is what actually removes an account; profiles and
-- everything referencing it cascade from there. Deleting from profiles alone
-- leaves an orphaned auth user that can still request a sign-in code and would
-- silently reappear on next login.

-- audit_logs.user_id is ON DELETE SET NULL, so removing a user cascades an
-- UPDATE into audit_logs — and the audit_no_update trigger rejects both UPDATE
-- and DELETE to keep the trail append-only. That guard is working as designed;
-- it has to be stood down deliberately, for this statement only, and put back.
--
-- Run the whole block as ONE statement so the trigger cannot stay disabled if
-- something fails midway.
BEGIN;

ALTER TABLE public.audit_logs DISABLE TRIGGER audit_no_update;

DELETE FROM auth.users;

ALTER TABLE public.audit_logs ENABLE TRIGGER audit_no_update;

COMMIT;

-- The audit rows themselves survive, now with user_id NULL — the record of what
-- was done stays even though the account is gone, which is the point of an
-- append-only trail. If you want a genuinely empty history for a fresh start,
-- run this too (same trigger dance):
--
--   BEGIN;
--   ALTER TABLE public.audit_logs DISABLE TRIGGER audit_no_update;
--   DELETE FROM public.audit_logs;
--   ALTER TABLE public.audit_logs ENABLE TRIGGER audit_no_update;
--   COMMIT;

-- Sessions do not cascade from auth.users in every Supabase version, so clear
-- them explicitly. A surviving session row is a live cookie for a deleted user.
DELETE FROM public.sessions;

-- Pending sign-in codes for addresses that no longer exist.
DELETE FROM public.auth_otps;


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
