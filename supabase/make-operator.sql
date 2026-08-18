-- ==============================================================================
-- PROMOTE OPERATORS
-- ==============================================================================
-- Roles are never self-assigned. verify-otp always creates a profile with
-- role = 'client' and ignores anything role-shaped in the request, so the only
-- way to become an operator is this file, run by someone with database access.
--
-- ORDER MATTERS. Each address below must sign in through the app ONCE first.
-- A profile row cannot be created here: profiles.id references auth.users(id),
-- so the account has to exist before it can be promoted. An UPDATE that matches
-- zero rows succeeds silently — that is exactly how the previous attempt left
-- the platform with no operators at all.
-- ==============================================================================


-- ------------------------------------------------------------------------------
-- STEP 1 — who exists right now?
-- ------------------------------------------------------------------------------
-- Any address below that does NOT appear here has not signed in yet. Go sign in
-- with it first, then come back to step 2.
SELECT email, role, is_active, email_verified, created_at
  FROM public.profiles
 WHERE email IN (
        'admin@mail.globalforex.online',
        'mpbhopal2026@gmail.com',
        'dev@mail.globalforex.online',
        'support@mail.globalforex.online',
        'grievance@mail.globalforex.online'
       )
 ORDER BY email;


-- ------------------------------------------------------------------------------
-- STEP 2 — promote
-- ------------------------------------------------------------------------------
-- admin  — full operational control: KYC, deposits, withdrawals, balances.
-- developer — tooling only: flags, logs, mail tracking. NO money capability.
--
-- These two are deliberately not nested. If one account could both adjust a
-- balance and read the logs that record the adjustment, the audit trail proves
-- nothing. Keep them separate even though the same person holds both.

UPDATE public.profiles
   SET role = 'admin', is_active = true, email_verified = true, updated_at = NOW()
 WHERE email IN ('admin@mail.globalforex.online', 'mpbhopal2026@gmail.com');

UPDATE public.profiles
   SET role = 'developer', is_active = true, email_verified = true, updated_at = NOW()
 WHERE email = 'dev@mail.globalforex.online';

-- support and grievance are shared desks, so they get 'staff': they can work
-- the KYC and deposit queues and see clients, but cannot move money, adjust a
-- balance, change settings or suspend an account. A mailbox several people read
-- should never hold a capability that spends someone's funds.
UPDATE public.profiles
   SET role = 'staff', is_active = true, email_verified = true, updated_at = NOW()
 WHERE email IN ('support@mail.globalforex.online', 'grievance@mail.globalforex.online');


-- ------------------------------------------------------------------------------
-- STEP 3 — verify
-- ------------------------------------------------------------------------------
-- Expect five rows: two admin, one developer, two staff. Fewer means those accounts have
-- not signed in yet — re-read step 1.
SELECT email, role, is_active FROM public.profiles WHERE role <> 'client' ORDER BY role, email;


-- ==============================================================================
-- Mailbox check: done — mail.globalforex.online has MX records pointing at
-- Cloudflare Email Routing, so all three addresses receive mail.
--
-- Worth knowing: Resend verification governs the FROM address only. Sending TO
-- an address needs no configuration at all, so codes reach these mailboxes
-- already, sent from the verified noreply@globalforex.online.
--
-- Cloudflare Email Routing forwards rather than hosting a mailbox, so each code
-- lands in whatever inbox the routing rule points at.


-- ==============================================================================
-- Undo
-- ==============================================================================
-- UPDATE public.profiles SET role = 'client' WHERE email = 'address@example.com';
