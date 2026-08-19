-- ==============================================================================
-- OPERATOR SESSION LOCATION TRACKING
-- ==============================================================================
-- Records approximate location on each session so a developer can review where
-- staff and admin accounts have signed in from.
--
-- SCOPE, DELIBERATELY: the developer view reads OPERATOR sessions only. Client
-- locations are stored on the same table because sessions are one table, but
-- nothing surfaces them and nothing should. Logging where your own staff access
-- an administrative system is ordinary security practice; building a map of
-- where your customers are is a DPDP purpose-limitation problem, and the fact
-- that the column exists is not a reason to start reading it.
--
-- Location comes from Vercel and Cloudflare edge headers — no IP-geolocation
-- service is called. Sending every operator's IP to a third party to ask where
-- they are would create the exposure this feature exists to contain.
--
-- Safe to run more than once.
-- ==============================================================================

ALTER TABLE public.sessions
    ADD COLUMN IF NOT EXISTS geo_country TEXT,
    ADD COLUMN IF NOT EXISTS geo_region  TEXT,
    ADD COLUMN IF NOT EXISTS geo_city    TEXT;

COMMENT ON COLUMN public.sessions.geo_country IS
  'Edge-derived country. Approximate; wrong for VPN and some mobile carriers.';

-- The developer console filters by role and orders by recency.
CREATE INDEX IF NOT EXISTS sessions_user_created_idx
    ON public.sessions (user_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- Operator access history
-- ------------------------------------------------------------------------------
-- One row per operator session, newest first. A view rather than a query in the
-- route so the role filter lives in one place and cannot be forgotten by a
-- future caller.
CREATE OR REPLACE VIEW public.operator_session_log AS
SELECT
    s.id,
    s.user_id,
    p.email,
    p.full_name,
    p.role,
    s.ip_address,
    s.user_agent,
    s.geo_city,
    s.geo_region,
    s.geo_country,
    s.created_at   AS signed_in_at,
    s.last_seen_at,
    s.expires_at,
    s.revoked_at,
    (s.revoked_at IS NULL AND s.expires_at > NOW()) AS is_active
FROM public.sessions s
JOIN public.profiles p ON p.id = s.user_id
WHERE p.role IN ('admin', 'staff', 'developer')
ORDER BY s.created_at DESC;

-- No client ever reads this. It is reached through /api/developer, which is
-- gated on the logs:view capability.
REVOKE ALL ON public.operator_session_log FROM anon, authenticated;

SELECT 'session location tracking ready' AS status;
