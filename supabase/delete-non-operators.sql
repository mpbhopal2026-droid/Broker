-- ==============================================================================
-- DELETE ALL NON-OPERATOR ACCOUNTS
-- ==============================================================================
-- READ STEP 0 BEFORE RUNNING ANYTHING. This is irreversible: there is no undo,
-- no soft delete, and no backup taken by this file.
--
-- I have deliberately not run this for you. Deleting client accounts from a
-- live database is yours to execute, not something to have done on your behalf
-- from a chat message.
-- ==============================================================================


-- ------------------------------------------------------------------------------
-- STEP 0 — STOP. Right now this would delete EVERY account.
-- ------------------------------------------------------------------------------
-- As of the last check the profiles table held three accounts, ALL role
-- 'client', and ZERO operators:
--
--     client   veer@skillbridgeladder.in
--     client   veer@veertrading.in
--     client   otp-test@example.com
--
-- "Keep admin only" therefore keeps nothing. Run make-operator.sql FIRST and
-- confirm step 3 of that file returns at least one row, or you will lock
-- yourself out of your own platform entirely.
--
-- This query must return at least one row before you continue:
SELECT email, role FROM public.profiles WHERE role <> 'client';


-- ------------------------------------------------------------------------------
-- STEP 1 — see exactly what will be destroyed
-- ------------------------------------------------------------------------------
SELECT p.email, p.role, p.wallet_balance,
       (SELECT count(*) FROM public.transactions t WHERE t.user_id = p.id) AS transactions,
       (SELECT count(*) FROM public.ledger_entries l WHERE l.user_id = p.id) AS ledger_entries
  FROM public.profiles p
 WHERE p.role = 'client'
 ORDER BY p.email;


-- ------------------------------------------------------------------------------
-- STEP 2 — refuse to delete anyone holding money
-- ------------------------------------------------------------------------------
-- Any row here is an account with a non-zero balance or a ledger history.
-- Deleting it destroys the record of money that belonged to a real person,
-- which is the one thing you cannot reconstruct afterwards. Settle or export
-- these before going further.
SELECT p.email, p.wallet_balance
  FROM public.profiles p
 WHERE p.role = 'client'
   AND (p.wallet_balance > 0
        OR EXISTS (SELECT 1 FROM public.ledger_entries l WHERE l.user_id = p.id));


-- ------------------------------------------------------------------------------
-- STEP 3 — delete
-- ------------------------------------------------------------------------------
-- Only after steps 0-2 are satisfied. Uncomment to run.
--
-- Deleting from auth.users is what actually removes the account; profiles and
-- everything referencing it cascade from there. Deleting the profile alone
-- would leave an orphaned auth user that can still request a sign-in code.
--
-- The guard keeps every operator role, not just 'admin', so promoting someone
-- to staff or developer later does not put them in the blast radius.

-- DELETE FROM auth.users
--  WHERE id IN (
--    SELECT id FROM public.profiles
--     WHERE role NOT IN ('admin', 'staff', 'developer')
--       AND wallet_balance = 0
--       AND NOT EXISTS (SELECT 1 FROM public.ledger_entries l WHERE l.user_id = profiles.id)
--  );


-- ------------------------------------------------------------------------------
-- STEP 4 — confirm what survived
-- ------------------------------------------------------------------------------
SELECT email, role, is_active FROM public.profiles ORDER BY role, email;
