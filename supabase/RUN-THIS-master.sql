-- ==============================================================================
-- MASTER MIGRATION — run this whole file, top to bottom, in one go
-- ==============================================================================
-- Supabase Dashboard -> SQL Editor -> New query -> paste all of this -> Run.
--
-- Every statement is idempotent: running it twice changes nothing the second
-- time. If you are unsure whether something already ran, run this again.
--
-- The final section reports what is actually true afterwards. Read it. Do not
-- assume the file worked because it did not visibly error — the SQL Editor
-- stops at the FIRST failing statement and leaves everything after it unrun,
-- which is the most likely reason a previous attempt only half-applied.
-- ==============================================================================


-- ##############################################################################
-- 1. URGENT — bank details are readable by the anon key
-- ##############################################################################
-- The anon key ships in every browser bundle. It is not a secret; RLS is what
-- makes publishing it safe. This table had no policy, so anyone could read the
-- account number, IFSC and UPI id straight out of PostgREST, bypassing the API.
--
-- The realistic abuse is impersonation, not theft: scrape the real account name
-- and UPI id, then send clients "updated deposit instructions" where every
-- detail matches except the destination.

ALTER TABLE public.broker_payment_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.broker_payment_settings FROM anon;
REVOKE ALL ON public.broker_payment_settings FROM authenticated;

-- Signed-in clients need these details to deposit. They may never write them:
-- where money is sent is an operator decision, and a client who could edit it
-- could redirect their own deposit and then dispute the credit.
GRANT SELECT ON public.broker_payment_settings TO authenticated;

DROP POLICY IF EXISTS "payment settings readable by signed in users" ON public.broker_payment_settings;
CREATE POLICY "payment settings readable by signed in users"
    ON public.broker_payment_settings FOR SELECT
    TO authenticated
    USING (true);


-- ##############################################################################
-- 2. Store the PAN number
-- ##############################################################################
-- The KYC form collects a PAN, validates it, sends it — and it was discarded,
-- because no column existed. The client believed their tax identifier was on
-- record and it was not, and the reviewer had nothing to check the uploaded
-- card against.
--
-- Encrypted at rest like the KYC document number, with a masked copy so an
-- operator can eyeball a match without the plaintext reaching the browser.

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS pan_number_masked    TEXT,
    ADD COLUMN IF NOT EXISTS pan_number_encrypted TEXT;

REVOKE ALL (pan_number_encrypted) ON public.profiles FROM anon, authenticated;


-- ##############################################################################
-- 3. One account per phone number
-- ##############################################################################
-- email was already UNIQUE; phone was not. The same number could sit on any
-- number of accounts, which breaks phone sign-in (the lookup expects one
-- profile) and lets one person hold several accounts under one identity —
-- which is the thing KYC exists to prevent.
--
-- Partial index so the many rows with no phone are not treated as duplicates
-- of each other.

CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique
    ON public.profiles (phone)
    WHERE phone IS NOT NULL AND phone <> '';


-- ##############################################################################
-- 4. Revoke sessions when a role or account status changes
-- ##############################################################################
-- The session cookie carries {sid, uid, role} signed at sign-in so middleware
-- can authorise at the edge without a database round trip. The cost is that the
-- role in that cookie is a snapshot.
--
-- Promoting someone therefore appeared not to work — they were made admin but
-- their cookie still said client, so /admin answered 404 until they signed out.
--
-- The direction that actually matters is the reverse: DEMOTING or suspending an
-- operator left a cookie asserting 'admin' valid for the life of the session.
-- Routes re-read the role from the database so it could not perform an admin
-- action, but it should never have routed either.

CREATE OR REPLACE FUNCTION public.revoke_sessions_on_privilege_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF (NEW.role IS DISTINCT FROM OLD.role)
       OR (NEW.is_active IS DISTINCT FROM OLD.is_active AND NEW.is_active = false)
    THEN
        UPDATE public.sessions
           SET revoked_at = NOW()
         WHERE user_id = NEW.id
           AND revoked_at IS NULL;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_revoke_sessions_on_role_change ON public.profiles;
CREATE TRIGGER profiles_revoke_sessions_on_role_change
    AFTER UPDATE OF role, is_active ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.revoke_sessions_on_privilege_change();

REVOKE ALL ON FUNCTION public.revoke_sessions_on_privilege_change() FROM PUBLIC, anon, authenticated;

-- Clear sessions that are already stale. Anyone promoted while signed in is
-- holding a cookie with the old role; this signs them out once so they pick up
-- the right one. Expect to sign in again after running this.
UPDATE public.sessions s
   SET revoked_at = NOW()
  FROM public.profiles p
 WHERE s.user_id = p.id
   AND s.revoked_at IS NULL
   AND p.role <> 'client'
   AND s.created_at < p.updated_at;


-- ##############################################################################
-- 5. VERIFY — read this output
-- ##############################################################################

-- 5a. Must return rls_enabled = true.
SELECT 'broker_payment_settings RLS' AS check,
       relrowsecurity::text          AS result,
       CASE WHEN relrowsecurity THEN 'OK' ELSE 'FAILED — section 1 did not apply' END AS verdict
  FROM pg_class WHERE relname = 'broker_payment_settings';

-- 5b. Must return 2.
SELECT 'pan columns on profiles' AS check,
       count(*)::text            AS result,
       CASE WHEN count(*) = 2 THEN 'OK' ELSE 'FAILED — section 2 did not apply' END AS verdict
  FROM information_schema.columns
 WHERE table_name = 'profiles'
   AND column_name IN ('pan_number_masked', 'pan_number_encrypted');

-- 5c. Must return 1.
SELECT 'unique phone index' AS check,
       count(*)::text       AS result,
       CASE WHEN count(*) = 1 THEN 'OK' ELSE 'FAILED — section 3 did not apply' END AS verdict
  FROM pg_indexes
 WHERE tablename = 'profiles' AND indexname = 'profiles_phone_unique';

-- 5d. Must return 1.
SELECT 'session revoke trigger' AS check,
       count(*)::text           AS result,
       CASE WHEN count(*) = 1 THEN 'OK' ELSE 'FAILED — section 4 did not apply' END AS verdict
  FROM pg_trigger
 WHERE tgname = 'profiles_revoke_sessions_on_role_change';

-- 5e. Every table here is readable by the anon key. Anything sensitive in this
--     list needs the same treatment as section 1 before it holds real data.
SELECT 'tables without RLS' AS check, c.relname AS result, 'review' AS verdict
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = false
 ORDER BY c.relname;
