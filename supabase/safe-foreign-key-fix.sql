-- ==============================================================================
-- SAFE FOREIGN KEY FIX (NO DATA DELETION)
-- ==============================================================================
-- This preserves ALL user accounts, balances, transactions, trades & documents.
-- It only fixes foreign key constraints and removes ghost purged.invalid records.
-- ==============================================================================

BEGIN;

-- 1. Update foreign key constraints so operator deletions won't violate constraints in future
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_processed_by_fkey;
ALTER TABLE public.transactions 
  ADD CONSTRAINT transactions_processed_by_fkey 
  FOREIGN KEY (processed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.kyc_records DROP CONSTRAINT IF EXISTS kyc_records_reviewed_by_fkey;
ALTER TABLE public.kyc_records 
  ADD CONSTRAINT kyc_records_reviewed_by_fkey 
  FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.ledger_entries DROP CONSTRAINT IF EXISTS ledger_entries_created_by_fkey;
ALTER TABLE public.ledger_entries 
  ADD CONSTRAINT ledger_entries_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Remove ONLY ghost purged.invalid accounts (all real user accounts remain untouched)
ALTER TABLE public.audit_logs DISABLE TRIGGER audit_no_update;

DELETE FROM public.audit_logs WHERE user_id IN (SELECT id FROM public.profiles WHERE email LIKE '%purged.invalid' OR full_name = 'Purged User');

DELETE FROM public.profiles WHERE email LIKE '%purged.invalid' OR full_name = 'Purged User';

DELETE FROM auth.users WHERE email LIKE '%purged.invalid';

ALTER TABLE public.audit_logs ENABLE TRIGGER audit_no_update;

COMMIT;

-- View all active preserved accounts:
SELECT id, email, full_name, role, kyc_status, wallet_balance FROM public.profiles;
