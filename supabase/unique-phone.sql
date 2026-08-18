-- ==============================================================================
-- ONE ACCOUNT PER PHONE NUMBER
-- ==============================================================================
-- email is already UNIQUE. phone was not, so the same number could be attached
-- to any number of accounts — which defeats phone sign-in (the lookup would
-- match more than one profile) and lets one person hold several accounts under
-- one identity, which is exactly what KYC exists to prevent.
--
-- Run the SELECT first: the constraint cannot be added while duplicates exist.
-- ==============================================================================

-- STEP 1 — any duplicates? Resolve these before step 2.
SELECT phone, count(*) AS accounts, array_agg(email) AS emails
  FROM public.profiles
 WHERE phone IS NOT NULL AND phone <> ''
 GROUP BY phone
HAVING count(*) > 1;

-- STEP 2 — enforce it. Partial index so the many rows with no phone yet are
-- not treated as duplicates of each other.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique
    ON public.profiles (phone)
    WHERE phone IS NOT NULL AND phone <> '';

-- STEP 3 — confirm.
SELECT indexname FROM pg_indexes
 WHERE tablename = 'profiles' AND indexname = 'profiles_phone_unique';
