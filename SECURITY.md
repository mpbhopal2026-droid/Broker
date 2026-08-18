# Security & Compliance

Status of this codebase, what was fixed, and what still blocks a real launch.

---

## 1. Rotate these credentials

`.env.local.example` was committed-ready (it was **not** gitignored) and held live-looking keys.
They were never actually pushed — verified against git history — but treat them as burned.

| Credential | Live? | Action |
|---|---|---|
| Supabase `service_role` key | No — returns `401 Invalid API key` | Project appears deleted. Create a new project. |
| Supabase `anon` key | No — `401` | Comes with the new project. |
| Resend API key | No — `401` | Issue a fresh key. |
| Firebase web API key | **Yes — active** (project `broker-d471e`) | Web API keys are public by design; security depends on Firebase rules, not secrecy. Review your Firebase Security Rules and API key restrictions. |
| VAPID private key | Untested | Regenerate: `npx web-push generate-vapid-keys` |

`.env.local.example` now contains placeholders only. Real values live in `.env.local`, which **is** gitignored.

---

## 2. What was fixed

### Authentication — was absent

Before: `login(email)` returned a user with no credential check. The OTP was generated in the
browser and printed on screen. `1234`, `123456` and `749201` were permanent master codes.

Now: codes are generated server-side, HMAC-hashed with `SESSION_SECRET`, single-use, expire in
10 minutes, lock after 5 wrong attempts, and are delivered only by email. Sessions are signed
HttpOnly cookies backed by a revocable `sessions` row.

### Privilege escalation — was trivial

Before: `email.includes('admin')` granted the admin role, `switchRole('admin')` was callable by
anyone, and the public login page had a one-click "Indore Admin" button.

Now: role comes from the database only. There is no code path that grants admin from the
browser. Bootstrap the first admin manually:

```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'you@yourdomain.com';
```

### Money — was in localStorage

Before: wallet balance, KYC status and transactions lived in `localStorage`. Any user could set
their own balance from devtools.

Now: balances are server-side. All movement goes through `post_ledger_entry()`, which takes a
row lock (preventing double-spend on concurrent withdrawals), writes an append-only
`ledger_entries` row, and updates the cached balance. `balance_reconciliation` view exposes any
drift between the cache and the ledger.

### Open mail relay

Before: `/api/send-email` was unauthenticated, accepted any `recipientEmail`, and injected
`payload.message` into HTML unescaped — a working phishing tool on your own domain.

Now: admin session required, recipient looked up from `profiles` by `userId`, all interpolated
values HTML-escaped, rate-limited.

### Row Level Security

Before: `"Users can update own profile"` had no column restriction — a client could `UPDATE`
their own `role` to `'admin'` and set their own `wallet_balance`. `audit_logs` had RLS enabled
with zero policies, so it could never be written.

Now: column-level `GRANT`s restrict clients to non-privileged fields, a `BEFORE UPDATE` trigger
catches anything that slips past, admin policies exist, and `audit_logs`/`ledger_entries` reject
`UPDATE` and `DELETE` outright.

### Audit trail

Before: written to `localStorage` (editable by the user being audited) with a hardcoded fake IP
string `'103.212.144.18 (Client Gateway)'`.

Now: append-only Postgres table, real request IP, service-role writes only.

### Fabricated trades — removed

`injectTrade`, `adminUpdateTradePnL` and `adminCloseTrade` are gone, along with the "Add Trade /
Profit" admin tab and the P&L edit modal. They let an operator create positions that never
happened and type any profit number onto a client account.

### Other

- Security headers + CSP via middleware; route guards for `/admin` and client routes.
- `next.config.mjs` image `remotePatterns` narrowed from `hostname: "**"` (an open image proxy,
  and the vector in GHSA-9g9p-9gw9-jx7f) to three specific hosts.
- KYC document numbers encrypted with AES-256-GCM; only last-4 stored in clear.
- Unused `OtpModal` deleted — it contained a permanent `1234` bypass.
- Grievance page no longer publishes an invented officer name and address.

---

## 3. Verified working

Tested against a local production build:

```
/admin unauthenticated                    -> 307 redirect to /login
/dashboard unauthenticated                -> 307 redirect to /login
Forged admin session cookie -> /admin     -> 307 redirect (signature rejected)
Forged cookie -> /api/admin/users         -> 401
POST /api/send-email  (no session)        -> 401
All 10 privileged API endpoints (no auth) -> 401
GET /api/settings (public)                -> 200
OTP rate limit: 4th request in 15 min     -> 429 with Retry-After: 893
Security headers (CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy) -> present
```

---

## 4. Setup

1. Create a Supabase project, then run `supabase/schema.sql` in the SQL editor.
2. `cp .env.local.example .env.local` and fill in every value.
3. Generate secrets:
   ```bash
   openssl rand -base64 32
   ```
   One for `SESSION_SECRET`, one for `KYC_ENCRYPTION_KEY`.
4. Promote your first admin with the SQL above.
5. Schedule retention cleanup:
   ```sql
   SELECT cron.schedule('apex-retention', '0 3 * * *', 'SELECT public.apply_retention_policy()');
   ```
6. `npm run build && npm run start`

---

## 5. Still open — read before launching

### Blocking

- **Licensing.** Investment advice in India requires SEBI registration. Retail forex/CFD trading
  is restricted under FEMA; RBI publishes an Alert List of unauthorised forex platforms. No code
  change addresses this.
- **Legal review.** `/legal/terms`, `/legal/client-agreement` and `/legal/risk-disclosure` are
  templates with bracketed placeholders. They need Indian counsel.
- **Grievance Officer.** Currently placeholder env values. DPDP s.13(3) requires real, published
  contact details for an appointed person.
- **Trading is disabled.** Order entry needs a licensed market-data feed, server-side execution,
  and a liquidity provider. The old client-side implementation priced fills from a static table
  and let the browser adjust its own balance, so it was removed rather than left running.

### Should fix before real traffic

- **Rate limiting is per-instance.** `src/lib/rate-limit.ts` uses an in-memory map. On serverless,
  each instance has its own, so the effective limit is higher than configured. Back it with
  Redis/Upstash — the call sites don't change.
- **`x-forwarded-for` is trusted.** Safe behind Vercel/Cloudflare/nginx; spoofable without a
  proxy that overwrites it.
- **Next.js advisories.** Installed 14.2.35 (the middleware-bypass CVE-2025-29927 is patched).
  Remaining advisories are DoS-class and need a major upgrade to Next 16 — a breaking change,
  not done here.
- **Aadhaar.** Storing full Aadhaar numbers carries obligations beyond DPDP. Prefer last-4 or an
  Aadhaar Vault reference. The schema supports masked-only storage.
- **Client funds segregation.** The Client Agreement has a placeholder for whether client money
  is segregated from operating funds. This determines what clients recover on insolvency and must
  be answered truthfully.

### DPDP operational gaps

Code handles consent, access, correction, erasure requests and grievances. Still needed as
process, not code:

- A named person who actually reads `data_requests` and responds within the statutory period
  (the `due_at` column makes overdue ones queryable).
- A breach-notification runbook — DPDP requires notifying the Data Protection Board and affected
  data principals.
- A documented retention schedule per data category.
- A decision on whether the erasure flow should anonymise financial records (the
  `anonymised_at` column exists but nothing populates it yet).
