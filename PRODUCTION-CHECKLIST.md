# Production Readiness Checklist

One application, one deployment. Work top to bottom — later items assume earlier ones.

```
Global Forex/
├── packages/core/     shared: auth, session, ledger, pricing, storage, types
└── apps/client/       the app — client pages + operator console  (port 3000)
```

`/admin` and `/developer` are guarded by role in middleware and again in every
route handler. The operator bundle does ship to all visitors — route-gated
rather than absent — so authorisation rests on the server-side checks, not on
the code being missing. `requireUser` / `requireAdmin` / `requireCapability`
re-read the role from the database on every privileged route.

---

## Status now

| | |
|---|---|
| `npm run build` | ✅ 39 pages |
| Typecheck, both apps | ✅ clean |
| Builds with **zero** env vars | ✅ (this is what broke the earlier Vercel deploy) |
| `/admin` unauthenticated | ✅ redirects to login |
| `/api/admin/*` unauthenticated | ✅ 401 |

---

## 1. Blocking — the app cannot work without these

- [ ] **Supabase project created.** The keys currently in `.env.local` return
      `401 Invalid API key`. Nothing persists until this is real.
- [ ] **`supabase/schema.sql` run in full.** Safe to re-run; every
      `CREATE POLICY`, `TRIGGER` and `CONSTRAINT` has a `DROP` guard.
- [ ] **Storage buckets exist** and the first three are **private**:
      `kyc-documents`, `payment-proofs`, `support-screenshots`, `public-assets`.
- [x] **`SESSION_SECRET` generated** — 32 bytes, in `.env.local`. Copy it into
      Vercel. Rotating it signs everybody out.
- [x] **`KYC_ENCRYPTION_KEY` generated** — 32 bytes, in `.env.local`.
- [ ] **Back that key up somewhere separate from the database.** Lose it and
      every stored document number becomes permanently unreadable.
- [ ] **First operator promoted by SQL** — admin cannot be self-assigned anywhere:
      ```sql
      UPDATE public.profiles SET role = 'admin'     WHERE email = 'admin@globalforex.online';
      UPDATE public.profiles SET role = 'developer' WHERE email = 'dev@globalforex.online';
      ```

## 2. Deployment

- [ ] One Vercel project. Root `vercel.json` builds the workspace and points
      `outputDirectory` at `apps/client/.next`, so no dashboard change is needed.
- [ ] Env vars set on the project
- [ ] Custom domain `globalforex.online` attached; HTTPS (HSTS sent in production)
- [ ] `APP_ROLE=client` (the default — only set to `admin` if you later split
      the operator console onto its own deployment again)

Env vars needed:
```
NEXT_PUBLIC_SUPABASE_URL          NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY     SESSION_SECRET
SUPABASE_SERVICE_ROLE_KEY         KYC_ENCRYPTION_KEY
RESEND_API_KEY                    RESEND_FROM_EMAIL
```
```bash
openssl rand -base64 32
```

## 3. Email

- [ ] Resend domain verified; SPF and DKIM published
- [ ] `RESEND_FROM_EMAIL` set to `noreply@globalforex.online` (already the
      default — but the domain must be verified in Resend before it will send)
- [ ] End-to-end test: OTP, welcome, login alert, deposit approved, KYC decision
- [ ] Confirm delivery appears in the developer console's email log

## 4. Money settings

- [ ] Bank account, UPI ID and QR configured in admin settings
- [ ] USD/INR mid rate set; deposit and withdrawal spreads reviewed (capped ±₹5)
- [ ] A real deposit tested end to end: UPI link → UTR → approve → ledger credited
- [ ] Ledger drift tile in the developer console reads **0**

## 5. Compliance

- [ ] All `missingComplianceFields` filled: legal entity name, registered
      address, support email, Grievance Officer name and email
- [ ] Legal templates reviewed by Indian counsel — they ship with `[bracketed]`
      placeholders and are **not** lawyer-settled
- [ ] Grievance Officer appointed and that inbox monitored
- [ ] Client funds in a **separate** bank account from operating money
- [ ] Retention cron scheduled:
      ```sql
      SELECT cron.schedule('globalforex-retention','0 3 * * *','SELECT public.apply_retention_policy()');
      ```

## 6. Known gaps — decide before launch

| Gap | Impact | Fix |
|---|---|---|
| Rate limiting is in-memory, per-instance | Effective limit is higher than configured on serverless | Back with Redis/Upstash; call sites unchanged |
| `x-forwarded-for` is trusted | Spoofable without a proxy that overwrites it | Deploy behind Vercel/Cloudflare/nginx `real_ip` |
| Next.js DoS advisories | Moderate/high, no known exploit path here | Major upgrade to Next 16 (breaking) |
| Live trading disabled | Order entry unavailable | Needs a licensed market-data feed + server-side execution |
| Trading signals disabled | No buy/sell recommendations | SEBI Investment Adviser / Research Analyst registration |

## 7. Licensing — not fixable in code

- [ ] **SEBI registration** for investment advice
- [ ] **FEMA / RBI**: retail forex for Indian residents is restricted; RBI
      publishes an Alert List of unauthorised platforms

Neither is a code change. Take these to an Indian lawyer or CA before accepting
real client money. Demo-only operation avoids both.

---

## Commands

```bash
npm install       # workspaces
npm run dev       # http://localhost:3000
npm run build
npm run start
```

## Operating notes

**Payments have no gateway.** UPI intent links have no callback — the payer's
app talks to their bank, not to you. The `tr=` reference helps match a bank
statement line to a deposit; it is **not** proof of payment. Credit only after
confirming receipt in the bank account.

**Watch ledger drift.** A non-zero value in the developer console means a cached
balance disagrees with its ledger. Investigate before processing withdrawals.

**Demo money is not real money.** Separate table, separate column, no code path
between them.
