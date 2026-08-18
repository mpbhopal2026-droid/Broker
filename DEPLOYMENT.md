# Deployment

Two deployments from one repo, plus Supabase. Work through this in order.

---

## 1. Supabase

1. Create a project. Note the URL, `anon` key and `service_role` key.
2. Open the SQL editor and run **all** of `supabase/schema.sql`. It is idempotent —
   safe to re-run after edits.
3. Confirm the buckets were created under Storage:

   | Bucket | Public | Holds |
   |---|---|---|
   | `kyc-documents` | **No** | Identity documents |
   | `payment-proofs` | **No** | Deposit screenshots |
   | `support-screenshots` | **No** | Bug report images |
   | `public-assets` | Yes | Logo and branding only |

   **Never flip the first three to public.** A Supabase public URL is permanent
   and derivable from the object path — for an Aadhaar card that is a standing
   breach. Reads go through short-lived signed URLs instead.

4. Schedule retention cleanup:
   ```sql
   SELECT cron.schedule('apex-retention', '0 3 * * *', 'SELECT public.apply_retention_policy()');
   ```

---

## 2. Secrets

```bash
openssl rand -base64 32
```

Run it twice — once for `SESSION_SECRET`, once for `KYC_ENCRYPTION_KEY`.

- Rotating `SESSION_SECRET` signs everyone out.
- **Losing `KYC_ENCRYPTION_KEY` makes stored document numbers unrecoverable.** Back it up somewhere separate from the database.

Both deployments must share the same values.

---

## 3. Two deployments

Same repo, same build, different `APP_ROLE`.

| | Client | Admin / Ops |
|---|---|---|
| Domain | `app.yourdomain.com` | `admin.yourdomain.com` |
| `APP_ROLE` | `client` | `admin` |
| Serves | client app | `/admin`, `/developer` |
| Returns 404 for | `/admin`, `/api/admin/*` | `/dashboard`, `/api/wallet/*` |

On Vercel: two projects from the same Git repo, differing only in `APP_ROLE`.

Locally:
```bash
APP_ROLE=admin PORT=3001 npm run start
```

**Why bother:** cookies are host-only (`apex_session` vs `apex_admin_session`,
no `Domain` attribute), so an XSS on the client app cannot reach or replay an
admin session. Serving 404 rather than 403 means the client origin never
confirms an admin console exists.

Optionally lock the admin console to your IPs:
```
ADMIN_IP_ALLOWLIST=203.0.113.7,198.51.100.0/24
```
This only works behind a proxy that overwrites `x-forwarded-for` (Vercel,
Cloudflare, nginx `real_ip`). It is an extra lock, not a replacement for auth.

---

## 4. First accounts

There is no way to become an admin from the browser. Sign in once through the
normal flow to create the account, then promote it:

```sql
UPDATE public.profiles SET role = 'admin'     WHERE email = 'owner@yourdomain.com';
UPDATE public.profiles SET role = 'developer' WHERE email = 'dev@yourdomain.com';
UPDATE public.profiles SET role = 'staff'     WHERE email = 'ops@yourdomain.com';
```

| Role | Can | Cannot |
|---|---|---|
| `client` | Trade demo, deposit, withdraw, submit KYC | — |
| `staff` | Review KYC and deposits, view clients | Move money, change settings, suspend |
| `admin` | All operations, adjust balances, settings | See developer tooling |
| `developer` | Flags, logs, email log, bug reports | **Touch client money at all** |

`developer` is deliberately not a superset of `admin`. If the same person can
change the code *and* adjust balances, the audit trail proves nothing. Use two
accounts even if it is one human.

---

## 5. Fill in app settings

Sign in to the admin console → settings. Nothing user-visible is hardcoded.

Required before launch — the API reports these as `missingComplianceFields`:

- Legal entity name and registered address
- Support email
- Grievance Officer name and email

These are **published legal details**. They default to blank rather than to a
plausible placeholder on purpose: an empty address is obviously unfinished, an
invented one reads as real and is a misrepresentation.

---

## 6. Pricing

The mid rate is never what clients transact at:

```
mid                ₹84.50 / USD
deposit  (buy)     ₹85.00   client pays more INR per USD
withdrawal (sell)  ₹84.00   client gets less INR per USD
```

Both spreads are capped at ₹5 by a database constraint and an API check.
Instrument spreads are in basis points, per symbol, in `instrument_spreads`.

The client sees the applied rate before committing. That disclosure is the
difference between a spread and a hidden markup — keep it.

---

## 7. Feature flags

Set in the developer console. Enforced **server-side**, not just hidden in the UI.

| Flag | Ship as |
|---|---|
| `demo_trading` | on |
| `live_trading` | **off** — needs a real market-data feed |
| `deposits`, `withdrawals`, `kyc_submission`, `registration` | on |
| `maintenance_mode` | off — turning it on blocks all money movement |

Unknown flag names resolve to `false`, so a typo disables a feature rather than
silently enabling one.

---

## 8. Pre-launch checklist

**Secrets**
- [ ] `SESSION_SECRET` and `KYC_ENCRYPTION_KEY` generated and backed up
- [ ] All keys rotated from anything that appeared in `.env.local.example`
- [ ] `.env.local` is gitignored (it is — verify anyway)

**Database**
- [ ] `schema.sql` run; buckets exist; the three private ones are private
- [ ] Retention cron scheduled
- [ ] First admin/developer/staff promoted by SQL

**Deployments**
- [ ] Both live, correct `APP_ROLE` on each
- [ ] `admin.` returns 404 for `/dashboard`; `app.` returns 404 for `/admin`
- [ ] HTTPS on both (HSTS is sent in production)

**Email**
- [ ] Resend domain verified, SPF/DKIM published
- [ ] `RESEND_FROM_EMAIL` on your domain, not `onboarding@resend.dev`
- [ ] Test OTP, welcome, login alert, deposit and KYC emails end to end

**Compliance**
- [ ] All `missingComplianceFields` filled
- [ ] Legal templates reviewed by an Indian lawyer (they ship with placeholders)
- [ ] Grievance Officer appointed, inbox monitored
- [ ] Client funds in a **separate** bank account from operating money

**Still open** — see `SECURITY.md`:
- Rate limiting is in-memory and per-instance. Move to Redis before real traffic.
- SEBI registration for advice; FEMA/RBI limits on retail forex.
- Next.js DoS advisories need a major upgrade to Next 16.

---

## 9. Operating notes

**Payments have no gateway.** UPI intent links have no callback — the payer's
app talks to their bank, not to you. The `tr=` reference helps match a bank
statement line to a deposit; it is **not proof of payment**. Only ever credit
after confirming receipt in the bank account.

**Watch ledger drift.** The developer console shows accounts whose cached
balance disagrees with the sum of their ledger entries. Non-zero means
something is wrong with the money. Investigate before processing withdrawals.

**Demo money is not real money.** Separate table, separate column, no code path
between them. Keep it that way.

---

## Vercel: the monorepo split needs two projects

**Symptom:** the build log shows a successful Next.js route table, then:

```
Error: The file "/vercel/path0/.next/routes-manifest.json" couldn't be found.
```

**Cause:** the build worked. Vercel then looked for output at the repo root,
but after the split it lives in `apps/client/.next`. The project is still
pointed at the root of a repo that no longer has an app there.

**Fix — set Root Directory.** One Vercel project cannot serve both apps.

### Existing project → make it the client app

Project → **Settings → General → Root Directory** → `apps/client` → Save → Redeploy.

Leave Framework as **Next.js**. Leave Build Command and Output Directory on
their defaults; `apps/client/vercel.json` handles the workspace install.

### Second project → the admin console

**Add New → Project →** same GitHub repo, then:

| Setting | Value |
|---|---|
| Root Directory | `apps/admin` |
| Framework | Next.js |
| Environment variable | `APP_ROLE=admin` |

Everything else matches the client project.

### Environment variables — both projects

Both need the same values; they share a database and must share
`SESSION_SECRET` or sessions issued by one will not verify in the other.

```
NEXT_PUBLIC_SUPABASE_URL          SESSION_SECRET
NEXT_PUBLIC_SUPABASE_ANON_KEY     KYC_ENCRYPTION_KEY
SUPABASE_SERVICE_ROLE_KEY         RESEND_API_KEY
NEXT_PUBLIC_APP_URL               RESEND_FROM_EMAIL
NEXT_PUBLIC_ADMIN_URL
```

Client project only: `APP_ROLE=client` (or omit — it is the default).
Admin project only: `APP_ROLE=admin`, plus `ADMIN_IP_ALLOWLIST` if you want one.

### Domains

| Project | Domain |
|---|---|
| client | `app.globalforex.online` (and `globalforex.online`) |
| admin | `admin.globalforex.online` |

Separate hostnames are what keeps the session cookies isolated. Do not serve
both apps from one hostname under different paths — that undoes the split.
