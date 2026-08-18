-- ==============================================================================
-- NOTIFICATIONS
-- ==============================================================================
-- The application has been writing to public.notifications since the notify
-- helper was added, but the table was never created — so every notifyUser()
-- call has been failing and /api/notifications returns 500. Because notify is
-- deliberately best-effort (it must never break the request it describes), the
-- failures were silent: deposits approved, KYC reviewed, withdrawals processed,
-- and the client was told nothing.
--
-- Safe to run more than once.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type       TEXT NOT NULL,
    title      TEXT NOT NULL,
    body       TEXT NOT NULL,
    link       TEXT,
    priority   TEXT NOT NULL DEFAULT 'normal'
               CHECK (priority IN ('low', 'normal', 'high')),
    read_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The unread badge counts on this, and the list is always newest-first for one
-- user, so both queries are covered here.
CREATE INDEX IF NOT EXISTS notifications_user_idx
    ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_unread_idx
    ON public.notifications (user_id) WHERE read_at IS NULL;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
-- A client reads only their own notifications and may mark them read. They may
-- never INSERT: a notification is the platform telling the client something,
-- and a client who could write one could manufacture "Deposit approved" in
-- their own feed and screenshot it.
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.notifications FROM anon, authenticated;
GRANT SELECT ON public.notifications TO authenticated;
GRANT UPDATE (read_at) ON public.notifications TO authenticated;

DROP POLICY IF EXISTS "own notifications readable" ON public.notifications;
CREATE POLICY "own notifications readable"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "own notifications markable" ON public.notifications;
CREATE POLICY "own notifications markable"
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Writes come from the service-role client inside notifyUser(). No INSERT
-- policy for authenticated exists, deliberately.

-- ---------------------------------------------------------------------------
-- Retention
-- ---------------------------------------------------------------------------
-- Diagnostics for the client, not evidence — the audit trail and the ledger are
-- the records that must survive. Ninety days keeps the feed useful without
-- growing without bound.
CREATE OR REPLACE FUNCTION public.purge_old_notifications()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    DELETE FROM public.notifications
     WHERE created_at < NOW() - INTERVAL '90 days'
       AND read_at IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.purge_old_notifications() FROM PUBLIC, anon, authenticated;

SELECT 'notifications ready' AS status;
