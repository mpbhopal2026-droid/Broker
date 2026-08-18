-- ==============================================================================
-- BOOTSTRAP — run ONCE, after schema.sql, in the Supabase SQL editor
-- ==============================================================================
-- Order matters:
--   1. Run supabase/schema.sql first.
--   2. Sign in to the app through the normal flow with each address below.
--      That creates the account. There is no way to self-assign a role, so an
--      account must exist before it can be promoted.
--   3. Then run this file.
-- ==============================================================================


-- 1. PROMOTE THE FIRST OPERATORS -----------------------------------------------
-- Replace the addresses. Anything not listed stays a plain client.

UPDATE public.profiles SET role = 'admin'
 WHERE email = 'admin@mail.globalforex.online';

UPDATE public.profiles SET role = 'developer'
 WHERE email = 'dev@mail.globalforex.online';

-- Optional: staff review KYC and deposits but cannot move money or change settings.
-- UPDATE public.profiles SET role = 'staff' WHERE email = 'ops@mail.globalforex.online';


-- 2. CHECK IT WORKED ------------------------------------------------------------
-- Zero rows means the account does not exist yet: sign in through the app first,
-- then re-run step 1. A silent UPDATE affecting nothing is the usual mistake here.

SELECT email, role, is_active, email_verified, created_at
  FROM public.profiles
 WHERE role <> 'client'
 ORDER BY role;


-- 3. PUBLISHED DETAILS ----------------------------------------------------------
-- These appear in Terms, the grievance page and outgoing email. Leaving them
-- blank is safer than inventing them, but they must be real before launch —
-- publishing a Grievance Officer who does not exist is a misrepresentation.

UPDATE public.app_settings SET
    app_name                = 'Global Forex',
    app_short_name          = 'Global Forex',
    tagline                 = 'Markets, transparently',
    email_from_name         = 'Global Forex',
    website_url             = 'https://globalforex.online',
    support_email           = 'support@mail.globalforex.online',
    grievance_officer_email = 'grievance@mail.globalforex.online',
    -- TODO before launch — these four are legally published details:
    company_legal_name      = '',   -- registered entity name
    company_registration_no = '',   -- CIN / registration number
    company_address         = '',   -- registered office address
    grievance_officer_name  = '',   -- a real, named person
    updated_at              = NOW()
 WHERE id = 1;


-- 4. WHAT IS STILL MISSING ------------------------------------------------------
-- Run this any time. Every row returned must be filled before taking real money.

SELECT 'company_legal_name'      AS field WHERE (SELECT company_legal_name      FROM public.app_settings WHERE id=1) = ''
UNION ALL
SELECT 'company_address'              WHERE (SELECT company_address         FROM public.app_settings WHERE id=1) = ''
UNION ALL
SELECT 'grievance_officer_name'       WHERE (SELECT grievance_officer_name  FROM public.app_settings WHERE id=1) = ''
UNION ALL
SELECT 'support_email'                WHERE (SELECT support_email           FROM public.app_settings WHERE id=1) = '';


-- 5. RETENTION ------------------------------------------------------------------
-- Deletes expired OTPs and sessions, and ages out logs (audit at 180 days for
-- CERT-In, operational logs sooner).
--
-- Needs the pg_cron extension. Enable it first:
--   Supabase dashboard → Database → Extensions → search "pg_cron" → enable
--
-- This block is safe to run either way. The schedule call is wrapped in EXECUTE
-- so it is not parsed unless the extension is actually present — referencing
-- cron.schedule directly aborts the whole script with
-- 'schema "cron" does not exist'.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        EXECUTE $cron$
            SELECT cron.schedule(
                'globalforex-retention',
                '0 3 * * *',
                'SELECT public.apply_retention_policy()'
            )
        $cron$;
        RAISE NOTICE 'Retention scheduled: daily at 03:00 UTC.';
    ELSE
        RAISE NOTICE 'pg_cron is not enabled — retention NOT scheduled.';
        RAISE NOTICE 'Enable it under Database > Extensions, then re-run this file.';
        RAISE NOTICE 'Until then, run this by hand periodically:';
        RAISE NOTICE '    SELECT public.apply_retention_policy();';
    END IF;
END
$$;


-- 6. HEALTH CHECKS --------------------------------------------------------------
-- Any row here means a cached balance disagrees with its ledger. Investigate
-- before processing withdrawals.
SELECT * FROM public.balance_reconciliation WHERE drift <> 0;

-- Storage buckets. The first three MUST show public = false.
SELECT id, public, file_size_limit FROM storage.buckets ORDER BY id;
