-- ==============================================================================
-- STORE THE PAN NUMBER
-- ==============================================================================
-- The KYC form collects a PAN, validates its format, sends it to the API — and
-- then it is discarded. There is no column for it and the route does not read
-- the field, so the client types their tax identifier and it vanishes.
--
-- That matters for a broker: PAN is the primary tax identifier in India, the
-- reviewer needs it to check against the uploaded card, and it is the number a
-- tax query would ask about. Collecting it and dropping it is the worst of both
-- — the client believes it is on record and it is not.
--
-- Stored the same way as the KYC document number: encrypted at rest, with a
-- masked copy for display so an operator can eyeball a match without the
-- plaintext ever reaching the browser.
--
-- Safe to run more than once.
-- ==============================================================================

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS pan_number_masked    TEXT,
    ADD COLUMN IF NOT EXISTS pan_number_encrypted TEXT;

COMMENT ON COLUMN public.profiles.pan_number_masked IS
  'Display only, e.g. ABCxxxx4F. Safe to show an operator.';
COMMENT ON COLUMN public.profiles.pan_number_encrypted IS
  'AES-256-GCM via KYC_ENCRYPTION_KEY. Never select this into a client response.';

-- The masked column is safe to read; the encrypted one is not. Column-level
-- grants keep the ciphertext out of any query a client could run, even if a
-- future RLS policy on profiles is written too loosely.
REVOKE ALL (pan_number_encrypted) ON public.profiles FROM anon, authenticated;

SELECT 'pan storage ready' AS status;
