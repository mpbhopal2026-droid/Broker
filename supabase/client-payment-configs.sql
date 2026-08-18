-- ==============================================================================
-- PER-CLIENT PAYMENT ROUTING
-- ==============================================================================
-- Lets an operator route an individual client's deposits to a different account
-- than the platform default.
--
-- This replaces a localStorage implementation. Browser storage was the wrong
-- home for it twice over: the destination account a client is told to send real
-- INR to became writable by anything with script access to the origin, and the
-- operator's "save" only ever reached the operator's own browser, so the config
-- never reached the client while the UI reported success.
--
-- Safe to run more than once.
-- ==============================================================================

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

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
-- A client may read ONLY their own row, and may never write one. Where their
-- money goes is an operator decision; if a client could edit this they could
-- redirect their own deposit and then dispute the credit.
ALTER TABLE public.client_payment_configs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.client_payment_configs FROM anon, authenticated;
GRANT SELECT ON public.client_payment_configs TO authenticated;

DROP POLICY IF EXISTS "own payment config readable" ON public.client_payment_configs;
CREATE POLICY "own payment config readable"
    ON public.client_payment_configs FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() AND is_active);

-- No INSERT/UPDATE/DELETE policy exists for authenticated on purpose. Writes go
-- through the service-role client in the API route, behind settings:edit.

-- ---------------------------------------------------------------------------
-- Changes are evidence
-- ---------------------------------------------------------------------------
-- Redirecting a client's deposits is exactly the action that would matter in a
-- dispute over missing funds, so the API route audits every write. This trigger
-- keeps updated_at honest regardless of what the caller sends.
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

SELECT 'client payment configs ready' AS status;
