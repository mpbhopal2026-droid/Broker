-- Mail delivery tracking.
--
-- email_log records what we *handed to Resend*. That is not the same as what
-- reached the client: a login code can be accepted by the API and then bounce,
-- land in spam, or be blocked by the recipient's server. On a platform where a
-- client cannot sign in without that email, "sent" is not good enough — we need
-- the delivery outcome, which only arrives later by webhook.
--
-- Safe to run more than once.

-- ---------------------------------------------------------------------------
-- 1. Delivery outcome on the existing log row
-- ---------------------------------------------------------------------------
ALTER TABLE public.email_log
    ADD COLUMN IF NOT EXISTS delivery_status TEXT
        CHECK (delivery_status IN (
            'queued', 'delivered', 'delayed', 'bounced', 'complained', 'opened', 'clicked'
        )),
    ADD COLUMN IF NOT EXISTS delivered_at   TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS opened_at      TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS clicked_at     TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS bounced_at     TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS bounce_reason  TEXT,
    ADD COLUMN IF NOT EXISTS last_event_at  TIMESTAMPTZ;

-- The webhook arrives with only the provider's message id, so this lookup is on
-- the hot path of every event.
CREATE INDEX IF NOT EXISTS email_log_provider_msg_idx
    ON public.email_log (provider_message_id)
    WHERE provider_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS email_log_delivery_status_idx
    ON public.email_log (delivery_status, created_at DESC);

-- ---------------------------------------------------------------------------
-- 2. Raw event trail
-- ---------------------------------------------------------------------------
-- Kept separate from email_log because one email produces many events and the
-- order matters when you are explaining to a client why they never got a code.
CREATE TABLE IF NOT EXISTS public.email_events (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email_log_id        UUID REFERENCES public.email_log(id) ON DELETE CASCADE,
    provider_message_id TEXT NOT NULL,
    event_type          TEXT NOT NULL,
    recipient           TEXT,
    payload             JSONB,
    occurred_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Resend retries on non-2xx, so the same event can arrive twice. This makes
    -- a replay a no-op instead of a duplicate row.
    UNIQUE (provider_message_id, event_type, occurred_at)
);

CREATE INDEX IF NOT EXISTS email_events_log_idx
    ON public.email_events (email_log_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS email_events_msg_idx
    ON public.email_events (provider_message_id);

-- ---------------------------------------------------------------------------
-- 3. Lock both tables down
-- ---------------------------------------------------------------------------
-- No client ever reads these. Delivery logs name every recipient address on the
-- platform, so they are service-role only; the developer dashboard reaches them
-- through a capability-checked API route, not directly.
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_events FROM anon, authenticated;

DROP POLICY IF EXISTS "email_events no client access" ON public.email_events;
CREATE POLICY "email_events no client access"
    ON public.email_events FOR SELECT
    TO authenticated
    USING (false);

-- ---------------------------------------------------------------------------
-- 4. Delivery health view for the developer dashboard
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.email_delivery_health AS
SELECT
    template,
    count(*)                                                          AS attempted,
    count(*) FILTER (WHERE status = 'sent')                           AS accepted,
    count(*) FILTER (WHERE status = 'failed')                         AS failed,
    count(*) FILTER (WHERE delivery_status = 'delivered')             AS delivered,
    count(*) FILTER (WHERE delivery_status = 'bounced')               AS bounced,
    count(*) FILTER (WHERE delivery_status = 'complained')            AS complained,
    count(*) FILTER (WHERE delivery_status IS NULL AND status = 'sent') AS awaiting_event,
    max(created_at)                                                   AS last_attempt_at
FROM public.email_log
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY template
ORDER BY attempted DESC;

REVOKE ALL ON public.email_delivery_health FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Retention
-- ---------------------------------------------------------------------------
-- Diagnostics, not evidence. Ninety days is long enough to investigate a
-- delivery complaint and short enough that we are not warehousing every address
-- we have ever mailed.
CREATE OR REPLACE FUNCTION public.purge_email_events()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    DELETE FROM public.email_events WHERE created_at < NOW() - INTERVAL '90 days';
$$;

REVOKE ALL ON FUNCTION public.purge_email_events() FROM PUBLIC, anon, authenticated;

SELECT 'mail tracking ready' AS status;
