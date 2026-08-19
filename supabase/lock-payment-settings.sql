-- ==============================================================================
-- LOCK THE BROKER PAYMENT SETTINGS TABLE
-- ==============================================================================
-- URGENT. Run this before anything else in this file set.
--
-- A live check found broker_payment_settings readable by the ANON key:
--
--   curl "$SUPABASE_URL/rest/v1/broker_payment_settings?select=*" \
--        -H "apikey: $ANON_KEY"
--   -> 200, one row, full banking details
--
-- The anon key is published in every browser bundle. It is not a secret and was
-- never meant to be one — RLS is what makes publishing it safe. This table had
-- no policy, so the key read it directly, bypassing the API entirely.
--
-- What was exposed: bank name, account holder, account number, IFSC and UPI id.
-- The realistic abuse is impersonation rather than theft — scrape the real
-- account name and UPI id, then send clients "updated deposit instructions"
-- where every detail matches except the destination. A client who has paid this
-- account before has no way to tell the difference.
--
-- Safe to run more than once.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- STEP 1 — see the exposure for yourself first
-- ------------------------------------------------------------------------------
SELECT relname,
       relrowsecurity  AS rls_enabled,
       relforcerowsecurity AS rls_forced
  FROM pg_class
 WHERE relname = 'broker_payment_settings';
-- rls_enabled = false is the problem.


-- ------------------------------------------------------------------------------
-- STEP 2 — close it
-- ------------------------------------------------------------------------------
ALTER TABLE public.broker_payment_settings ENABLE ROW LEVEL SECURITY;

-- Revoke the blanket grant that let anon read at all.
REVOKE ALL ON public.broker_payment_settings FROM anon;
REVOKE ALL ON public.broker_payment_settings FROM authenticated;

-- Signed-in clients need the deposit details to actually deposit, so they may
-- SELECT. They may never write: where money is sent is an operator decision,
-- and a client who could edit it could redirect their own deposit and then
-- dispute the credit.
GRANT SELECT ON public.broker_payment_settings TO authenticated;

DROP POLICY IF EXISTS "payment settings readable by signed in users" ON public.broker_payment_settings;
CREATE POLICY "payment settings readable by signed in users"
    ON public.broker_payment_settings FOR SELECT
    TO authenticated
    USING (true);

-- No policy for anon, and no INSERT/UPDATE/DELETE policy for anyone. Operator
-- writes go through the API on the service-role client, behind settings:edit
-- and audited.


-- ------------------------------------------------------------------------------
-- STEP 3 — confirm
-- ------------------------------------------------------------------------------
SELECT relname, relrowsecurity AS rls_enabled
  FROM pg_class
 WHERE relname = 'broker_payment_settings';
-- rls_enabled must now be true.

-- Then re-run the curl from the header comment. It must return [] rather than
-- the row.


-- ==============================================================================
-- STEP 4 — sweep every other table
-- ==============================================================================
-- Any table listed by this query has no row level security and is readable by
-- the anon key. Expect zero rows. Anything that appears needs the same
-- treatment as above before it holds real data.
SELECT c.relname AS table_without_rls
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public'
   AND c.relkind = 'r'
   AND c.relrowsecurity = false
 ORDER BY c.relname;


-- ==============================================================================
-- Why the API fix alone was not enough
-- ==============================================================================
-- The route now calls requireUser(), which stops the /api/settings path. But
-- PostgREST is a second, independent door into the same data, and the anon key
-- opens it from any browser console. Route guards and RLS are not alternatives;
-- the route protects the API, RLS protects the database.
