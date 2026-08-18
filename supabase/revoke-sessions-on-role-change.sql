-- ==============================================================================
-- REVOKE SESSIONS WHEN A ROLE CHANGES
-- ==============================================================================
-- The session cookie carries {sid, uid, role} signed at sign-in, so middleware
-- can authorise at the edge without a database round trip. The cost is that the
-- role in that cookie is a snapshot: it keeps saying whatever was true when the
-- user last signed in.
--
-- Promoting someone therefore appears not to work — they were promoted to admin
-- but their cookie still says client, so middleware answers /admin with 404
-- until they sign out and back in.
--
-- The direction that actually matters is the other one. DEMOTING an operator, or
-- suspending them, left a cookie asserting 'admin' valid for the remaining life
-- of the session — now up to 30 days. Route handlers re-read the role from the
-- database via requireCapability(), so such a cookie could not perform an admin
-- action, but it should never have kept working at the routing layer at all.
--
-- Revoking their sessions forces a fresh sign-in and a correctly-stamped cookie.
--
-- Safe to run more than once.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.revoke_sessions_on_privilege_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Deactivation counts too: a suspended account must stop being able to
    -- route anywhere, not merely fail at the point of action.
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


-- ------------------------------------------------------------------------------
-- Clear the sessions that are stale RIGHT NOW
-- ------------------------------------------------------------------------------
-- Every operator promoted before this trigger existed is holding a cookie that
-- still says 'client'. This revokes those so they can sign in again and pick up
-- the correct role.
UPDATE public.sessions s
   SET revoked_at = NOW()
  FROM public.profiles p
 WHERE s.user_id = p.id
   AND s.revoked_at IS NULL
   AND p.role <> 'client'
   AND s.created_at < p.updated_at;


-- ------------------------------------------------------------------------------
-- Verify
-- ------------------------------------------------------------------------------
-- Expect zero rows. Anything returned is still holding a stale-role cookie.
SELECT p.email, p.role, s.created_at AS session_started, p.updated_at AS role_changed
  FROM public.sessions s
  JOIN public.profiles p ON p.id = s.user_id
 WHERE s.revoked_at IS NULL
   AND s.created_at < p.updated_at
   AND p.role <> 'client';
