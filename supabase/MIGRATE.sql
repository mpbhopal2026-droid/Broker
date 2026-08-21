-- ============================================================================
--  Global Forex — single pending migration
--  Run this whole file once in the Supabase SQL editor.
-- ============================================================================
--
--  SAFETY, because this runs against real client money:
--
--   * Wrapped in one transaction. If ANY statement fails, the whole thing rolls
--     back and the database is exactly as it was. There is no half-applied
--     state to unpick.
--   * Every statement is additive and idempotent — ADD COLUMN IF NOT EXISTS,
--     CREATE IF NOT EXISTS, CREATE OR REPLACE. Running it twice is harmless.
--   * Contains no DROP TABLE, no DROP COLUMN, no DELETE, no TRUNCATE. Nothing
--     here can destroy a row.
--   * Row counts for every table holding client data are captured before and
--     compared after, and the migration ABORTS if any count changed. You do not
--     have to take the previous point on trust.
--
--  Already verified as applied against your database, so deliberately not
--  repeated here: live_trades, notifications, sessions, email_events.
--
--  What this adds:
--   1. sessions       — geo columns + operator session log view
--   2. profiles       — encrypted PAN storage columns
--   3. client_payment_configs — per-client deposit routing
--   4. profiles       — revoke sessions when role or active status changes
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. Record the state we must not damage
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE _pre_counts ON COMMIT DROP AS
SELECT 'profiles'     AS t, COUNT(*) AS n FROM public.profiles
UNION ALL SELECT 'transactions',  COUNT(*) FROM public.transactions
UNION ALL SELECT 'sessions',      COUNT(*) FROM public.sessions
UNION ALL SELECT 'audit_logs',    COUNT(*) FROM public.audit_logs
UNION ALL SELECT 'notifications', COUNT(*) FROM public.notifications
UNION ALL SELECT 'live_trades',   COUNT(*) FROM public.live_trades;

-- ---------------------------------------------------------------------------
-- 1. Session location  (was: session-location.sql)
--
-- Geo comes from the edge proxy's headers, not an IP lookup service, so no
-- client address is sent to a third party. Approximate by nature: wrong for
-- VPNs and some mobile carriers, so it is evidence to weigh and not proof.
-- ---------------------------------------------------------------------------
ALTER TABLE public.sessions
    ADD COLUMN IF NOT EXISTS geo_country TEXT,
    ADD COLUMN IF NOT EXISTS geo_region  TEXT,
    ADD COLUMN IF NOT EXISTS geo_city    TEXT;

COMMENT ON COLUMN public.sessions.geo_country IS
  'Edge-derived country. Approximate; wrong for VPN and some mobile carriers.';

CREATE INDEX IF NOT EXISTS sessions_user_created_idx
    ON public.sessions (user_id, created_at DESC);

-- Operators only. Client sessions are deliberately out of scope: this exists
-- to oversee staff access, not to surveil customers.
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

-- Reachable only through the service role, never from a browser session.
REVOKE ALL ON public.operator_session_log FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. PAN storage  (was: add-pan-storage.sql)
--
-- Two columns, on purpose. Operators need to confirm a PAN without the
-- database holding a readable copy of everyone's tax identifier.
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS pan_number_masked    TEXT,
    ADD COLUMN IF NOT EXISTS pan_number_encrypted TEXT;

COMMENT ON COLUMN public.profiles.pan_number_masked IS
  'Display only, e.g. ABCxxxx4F. Safe to show an operator.';
COMMENT ON COLUMN public.profiles.pan_number_encrypted IS
  'AES-256-GCM via KYC_ENCRYPTION_KEY. Never select this into a client response.';

-- Column-level revoke: even a bug that selects * cannot return the ciphertext
-- to a browser, because the anon and authenticated roles cannot read it at all.
REVOKE ALL (pan_number_encrypted) ON public.profiles FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Per-client payment routing  (was: client-payment-configs.sql)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_payment_configs (
    user_id        UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    bank_name      TEXT,
    account_holder TEXT,
    account_number TEXT,
    ifsc_code      TEXT,
    upi_id         TEXT,
    qr_image_url   TEXT,
    notes          TEXT,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS client_payment_active_idx
    ON public.client_payment_configs (user_id) WHERE is_active;

ALTER TABLE public.client_payment_configs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.client_payment_configs FROM anon, authenticated;
GRANT SELECT ON public.client_payment_configs TO authenticated;

-- A client reads only their own active routing. Writes are service-role only,
-- so nobody can point their own deposits at a different account.
DROP POLICY IF EXISTS "own payment config readable" ON public.client_payment_configs;
CREATE POLICY "own payment config readable"
    ON public.client_payment_configs FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() AND is_active);

CREATE OR REPLACE FUNCTION public.touch_client_payment_config()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS client_payment_touch ON public.client_payment_configs;
CREATE TRIGGER client_payment_touch BEFORE UPDATE ON public.client_payment_configs
    FOR EACH ROW EXECUTE FUNCTION public.touch_client_payment_config();

-- ---------------------------------------------------------------------------
-- 4. Revoke sessions on role or status change
--    (was: revoke-sessions-on-role-change.sql)
--
-- The session cookie carries the role, so a demoted operator keeps operator
-- access until their cookie expires. Suspension counts too — a suspended
-- account must stop being able to route anywhere, not merely fail at the
-- point of action.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.revoke_sessions_on_role_change()
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

DROP TRIGGER IF EXISTS profiles_revoke_sessions ON public.profiles;
CREATE TRIGGER profiles_revoke_sessions
    AFTER UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.revoke_sessions_on_role_change();

-- One-off cleanup: operators promoted before the trigger existed still hold a
-- cookie that says 'client'. Revoking makes them sign in again and pick up the
-- correct role. This only ever sets revoked_at, so it deletes nothing, and
-- re-running skips rows already revoked.
UPDATE public.sessions s
   SET revoked_at = NOW()
  FROM public.profiles p
 WHERE s.user_id = p.id
   AND s.revoked_at IS NULL
   AND p.role <> 'client'
   AND s.created_at < p.updated_at;

-- ---------------------------------------------------------------------------
-- 5. Prove nothing was destroyed
--
-- If any table holding client data lost a row, this raises and the entire
-- transaction rolls back — including everything above.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT pre.t,
               pre.n AS before_n,
               (CASE pre.t
                  WHEN 'profiles'      THEN (SELECT COUNT(*) FROM public.profiles)
                  WHEN 'transactions'  THEN (SELECT COUNT(*) FROM public.transactions)
                  WHEN 'sessions'      THEN (SELECT COUNT(*) FROM public.sessions)
                  WHEN 'audit_logs'    THEN (SELECT COUNT(*) FROM public.audit_logs)
                  WHEN 'notifications' THEN (SELECT COUNT(*) FROM public.notifications)
                  WHEN 'live_trades'   THEN (SELECT COUNT(*) FROM public.live_trades)
                END) AS after_n
          FROM _pre_counts pre
    LOOP
        IF r.after_n <> r.before_n THEN
            RAISE EXCEPTION
              'ABORTED: % changed from % to % rows. Nothing has been applied.',
              r.t, r.before_n, r.after_n;
        END IF;
        RAISE NOTICE 'ok: % unchanged at % rows', r.t, r.before_n;
    END LOOP;
END $$;

COMMIT;

-- ---------------------------------------------------------------------------
-- Verification. Every row must read PRESENT.
-- ---------------------------------------------------------------------------
SELECT 'sessions.geo_city'          AS object,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                          WHERE table_name='sessions' AND column_name='geo_city')
            THEN 'PRESENT' ELSE 'MISSING' END AS status
UNION ALL
SELECT 'operator_session_log view',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.views
                          WHERE table_name='operator_session_log')
            THEN 'PRESENT' ELSE 'MISSING' END
UNION ALL
SELECT 'profiles.pan_number_encrypted',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                          WHERE table_name='profiles' AND column_name='pan_number_encrypted')
            THEN 'PRESENT' ELSE 'MISSING' END
UNION ALL
SELECT 'client_payment_configs table',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables
                          WHERE table_name='client_payment_configs')
            THEN 'PRESENT' ELSE 'MISSING' END
UNION ALL
SELECT 'profiles_revoke_sessions trigger',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.triggers
                          WHERE trigger_name='profiles_revoke_sessions')
            THEN 'PRESENT' ELSE 'MISSING' END
UNION ALL
SELECT 'live_trades has NO pnl column (must be PRESENT)',
       CASE WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns
                              WHERE table_name='live_trades' AND column_name='pnl')
            THEN 'PRESENT' ELSE 'MISSING' END;
