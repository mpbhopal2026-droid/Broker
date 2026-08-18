-- ==============================================================================
-- RUN THIS NOW — Supabase dashboard → SQL Editor → paste → Run
-- ==============================================================================
-- Sign-in fails with "Could not find the 'channel' column of 'auth_otps'".
--
-- Cause: schema.sql was run before the phone-login section was added, so the
-- application writes two columns the database does not have. Nothing is wrong
-- with your API keys — that error message was misleading and has been fixed.
--
-- Safe to re-run.

ALTER TABLE public.auth_otps
    ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'email'
        CHECK (channel IN ('email', 'sms')),
    ADD COLUMN IF NOT EXISTS identifier TEXT;

UPDATE public.auth_otps SET identifier = email WHERE identifier IS NULL;

ALTER TABLE public.auth_otps ALTER COLUMN email DROP NOT NULL;

CREATE INDEX IF NOT EXISTS auth_otps_identifier_idx
    ON public.auth_otps (lower(identifier), purpose, expires_at DESC)
    WHERE consumed_at IS NULL;

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS notify_email  BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS notify_inapp  BOOLEAN NOT NULL DEFAULT TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique
    ON public.profiles (phone) WHERE phone IS NOT NULL AND phone_verified;

-- Confirm: both columns must be listed.
SELECT column_name FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'auth_otps'
   AND column_name IN ('identifier', 'channel');

-- ---------------------------------------------------------------------------
-- KYC address columns
-- ---------------------------------------------------------------------------
-- api/me/kyc writes address and postal_code, which were never defined. The
-- update errored and its result was never checked, so kyc_status never reached
-- 'pending' and submissions silently never entered the compliance queue.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address     TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS postal_code TEXT;
