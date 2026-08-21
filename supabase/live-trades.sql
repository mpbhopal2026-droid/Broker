-- Live (real-money) trades executed by the dealing desk on a client's behalf.
--
-- Clients cannot open or close these. An operator executes the order in the
-- real market with a real counterparty, then records the fill here.
--
-- THERE IS DELIBERATELY NO pnl COLUMN.
--
-- That is the whole point of this table. The removed "Trade Injector" wrote a
-- profit figure straight from an admin form into the client's portfolio, which
-- meant an operator could type any number and it became fact. Profit is a
-- CONSEQUENCE of entry price, exit price and size — never an input. With no
-- column to hold it, that class of fabrication is structurally impossible
-- rather than merely discouraged. P&L is computed on read by positionPnl().
--
-- execution_ref is NOT NULL for the same reason: every fill must be traceable
-- to the broker confirmation that produced it, so a client's position can be
-- checked against a third party rather than taken on trust.

CREATE TABLE IF NOT EXISTS public.live_trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,

    symbol TEXT NOT NULL,
    pair_name TEXT NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
    lot_size NUMERIC(12, 4) NOT NULL CHECK (lot_size > 0),
    margin NUMERIC(14, 2) NOT NULL CHECK (margin > 0),
    leverage INT NOT NULL CHECK (leverage BETWEEN 1 AND 500),

    entry_price NUMERIC(18, 6) NOT NULL CHECK (entry_price > 0),
    exit_price NUMERIC(18, 6) CHECK (exit_price IS NULL OR exit_price > 0),
    stop_loss NUMERIC(18, 6),
    take_profit NUMERIC(18, 6),

    -- Broker confirmation for the opening and closing fills.
    execution_ref TEXT NOT NULL CHECK (length(trim(execution_ref)) BETWEEN 3 AND 64),
    exit_execution_ref TEXT CHECK (exit_execution_ref IS NULL OR length(trim(exit_execution_ref)) BETWEEN 3 AND 64),

    -- Who recorded it. ON DELETE RESTRICT so an operator cannot be deleted out
    -- of the record of trades they placed on someone else's money.
    recorded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    closed_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,

    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
    opened_at TIMESTAMPTZ NOT NULL,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- A closed trade must carry the evidence of how it was closed.
    CONSTRAINT live_trades_closed_complete CHECK (
        status = 'OPEN'
        OR (exit_price IS NOT NULL AND closed_at IS NOT NULL AND exit_execution_ref IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS live_trades_user_idx ON public.live_trades (user_id, opened_at DESC);
CREATE INDEX IF NOT EXISTS live_trades_open_idx ON public.live_trades (user_id) WHERE status = 'OPEN';

-- One broker confirmation, one recorded fill. Without this, re-submitting the
-- same form twice silently doubles a client's position.
CREATE UNIQUE INDEX IF NOT EXISTS live_trades_execution_ref_key
    ON public.live_trades (upper(trim(execution_ref)));

-- ---------------------------------------------------------------------------
-- Only the closing fields may ever change.
--
-- A recorded trade describes something that already happened in the market.
-- Entry price, size, side and owner are history and must not be rewritten —
-- otherwise an operator could quietly restate a losing fill after the fact.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.live_trades_immutable_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.user_id       IS DISTINCT FROM OLD.user_id
    OR NEW.symbol        IS DISTINCT FROM OLD.symbol
    OR NEW.side          IS DISTINCT FROM OLD.side
    OR NEW.lot_size      IS DISTINCT FROM OLD.lot_size
    OR NEW.margin        IS DISTINCT FROM OLD.margin
    OR NEW.leverage      IS DISTINCT FROM OLD.leverage
    OR NEW.entry_price   IS DISTINCT FROM OLD.entry_price
    OR NEW.execution_ref IS DISTINCT FROM OLD.execution_ref
    OR NEW.recorded_by   IS DISTINCT FROM OLD.recorded_by
    OR NEW.opened_at     IS DISTINCT FROM OLD.opened_at THEN
        RAISE EXCEPTION 'live_trades: entry details are immutable once recorded';
    END IF;

    IF OLD.status = 'CLOSED' THEN
        RAISE EXCEPTION 'live_trades: a closed trade cannot be reopened or amended';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS live_trades_no_rewrite ON public.live_trades;
CREATE TRIGGER live_trades_no_rewrite
    BEFORE UPDATE ON public.live_trades
    FOR EACH ROW EXECUTE FUNCTION public.live_trades_immutable_entry();

-- Deleting a real-money trade would erase a client's record of what was done
-- with their funds. Close it instead.
CREATE OR REPLACE FUNCTION public.live_trades_no_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'live_trades is append-only; close the trade rather than deleting it';
END;
$$;

DROP TRIGGER IF EXISTS live_trades_block_delete ON public.live_trades;
CREATE TRIGGER live_trades_block_delete
    BEFORE DELETE ON public.live_trades
    FOR EACH ROW EXECUTE FUNCTION public.live_trades_no_delete();

-- ---------------------------------------------------------------------------
-- RLS: a client reads their own trades and writes none of them.
-- ---------------------------------------------------------------------------
ALTER TABLE public.live_trades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS live_trades_select_own ON public.live_trades;
CREATE POLICY live_trades_select_own ON public.live_trades
    FOR SELECT USING (user_id = auth.uid());

-- No INSERT/UPDATE/DELETE policy exists for clients, by design. All writes go
-- through the service role in /api/admin/trades, which enforces the operator
-- capability check and writes the audit entry.

GRANT SELECT ON public.live_trades TO authenticated;
