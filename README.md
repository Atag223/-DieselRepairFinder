# DieselRepairFinder.com

> **Mobile Diesel Mechanics. Anytime. Anywhere.**

A production-ready MVP marketplace connecting users with mobile diesel mechanics for roadside repair and service. Built with Next.js 14 (App Router), TypeScript, Tailwind CSS, and Prisma.

---

## Features

- **Homepage** — Hero section, repair request form, how-it-works, service categories, launch cities grid, mechanic CTA
- **Repair Request System** — Submit requests with full details, stored in DB, confirmation email sent
- **Mechanic Signup** — `/join` page with full application form
- **API Routes** — `POST /api/repair-requests` and `POST /api/mechanics/apply`
- **Email Notifications** — Via [Resend](https://resend.com) on new requests and signups
- **Provider Accounts** — Approved providers use emailed one-time sign-in links to fund credits and view account history
- **Lead Credits** — Stripe prepaid packages; verified webhooks grant credits and first-purchase bonuses
- **State Placements** — Eligible Featured/Premium placements are paid through one-time Stripe Checkout and activate after verified payment
- **Dark Theme** — Black background with blue accents, mobile responsive

---

## Tech Stack

| Layer      | Technology              |
|------------|-------------------------|
| Framework  | Next.js 15 (App Router) |
| Language   | TypeScript              |
| Styling    | Tailwind CSS v3         |
| Database   | PostgreSQL + Prisma ORM |
| Email      | Resend                  |

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (local or hosted)
- [Resend](https://resend.com) account for email

### 1. Clone & Install

```bash
git clone https://github.com/your-org/diesel-repair-finder.git
cd diesel-repair-finder
npm install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/diesel_repair_finder"
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
NOTIFY_EMAIL="admin@dieselrepairfinder.com"
FROM_EMAIL="noreply@dieselrepairfinder.com"
```

### 3. Set Up a Local Development Database

Use a new, disposable **local** PostgreSQL database. Set both `DATABASE_URL` and
`DIRECT_URL` in `.env` to that local database before running any Prisma command.
The checked-in migration history is not a fresh-database bootstrap: its earliest
migrations assume foundation tables already exist. For local development, create
the schema from `schema.prisma` with:

```bash
npx prisma db push
```

This is for the isolated local database only; it does not create migration
history. Do not point it, `migrate dev`, or `migrate deploy` at Production or the
existing Preview database. See [Production schema reconciliation](prisma/reconciliation/README.md)
for the required audit and isolated-clone rehearsal before any future rollout.

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Provider funding and placement operations

Configure `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `NEXT_PUBLIC_APP_URL`. The Stripe webhook
endpoint is `/api/stripe/webhook`; subscribe it to `checkout.session.completed` and
`checkout.session.expired`. Credit purchases and one-time annual Featured/Premium placements use
provider-bound Stripe Checkout Sessions. Credits and placements are fulfilled only by the verified
webhook. Placement checkout reserves an eligible state/tier and activates for 12 months after payment;
it does not create a recurring subscription. Providers must sign in to their approved account with
an emailed one-time link before checkout.

In Vercel, set Stripe test-mode `STRIPE_SECRET_KEY` and the signing secret for a Stripe test webhook
in Preview scope. Configure a test-mode endpoint for each stable Preview URL that needs checkout.
Use Stripe live-mode credentials and the production webhook signing secret in Production scope only
when production is ready. Set `NEXT_PUBLIC_APP_URL` to the matching Preview or Production origin;
do not reuse webhook signing secrets across endpoints or modes. The webhook's secret must correspond
to the endpoint and mode sending events. Do not enable these features against Production or the
existing Preview database until a complete baseline and isolated rehearsal are reviewed and a
separate rollout is approved.

### Private HydroVacFinder provider discovery

`GET /api/internal/hvf/emergency-providers` is a private server-to-server API. HydroVacFinder must
send `x-hvf-api-key` with the value of DieselRepairFinder's `HVF_INTERNAL_API_KEY`; keep that key in
server-only environment settings on both applications and never call this route directly from a
browser. Missing or invalid credentials receive `401`; a missing server key receives `500`.

The API returns matching active providers that are not suspended or deleted, including FREE,
unverified, and Google Places-imported listings, subject to the requested result limit (50 by default,
100 maximum). Lead-credit balance, listing approval, and public
contact-display rules do not control this private discovery endpoint. Authenticated results include
provider and active-branch contact details, category/services, and geographic data. Existing response
fields (`id`, `name`, `category`, `city`, `state`, `address`, `primaryCity`, `primaryState`,
`locationMismatch`, `services`, `is24_7`, `tier`, `verificationStatus`, `rating`, `distanceMiles`,
`distanceFromMainAddress`, `nearestLocation`, `source`, `serviceRequestUrl`, and `meta`) remain
available; contact fields and full active `locations` are additive. The response is still provider
discovery only: public customers must submit repair requests through DieselRepairFinder.

Optional query parameters are `city`, `state`, `category`, `latitude`, `longitude`, `radiusMiles`,
and `limit` (50 by default, 100 maximum). Category matches the `ProviderCategory` enum. City and
state search both the primary provider address and active branch locations. Supplying both
coordinates ranks by the nearest primary or active-branch coordinate, filters to the requested radius
(100 miles by default), and only then applies the result limit. Omitting location filters allows
nationwide search.

The `tests/hvf-emergency-providers.test.ts` suite protects provider eligibility, private response
fields, branch matching, and distance ranking. For HydroVacFinder-side compatibility, verify its
server sends the `x-hvf-api-key` header and reads the existing `providers` array and established
fields without assuming the new contact/location fields are absent. Also run an authenticated end-to-
end search for each supported provider category with no geographic filters, a city/state filter, and
an origin/radius around a provider that has multiple active locations. This repository cannot verify
the HydroVacFinder consumer behavior without its source/configuration and test credentials.

---

## Project Structure

```
├── prisma/
│   └── schema.prisma          # Database models
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── repair-requests/route.ts   # POST /api/repair-requests
│   │   │   └── mechanics/apply/route.ts   # POST /api/mechanics/apply
│   │   ├── join/
│   │   │   └── page.tsx       # Mechanic signup page
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx           # Homepage
│   └── lib/
│       ├── prisma.ts           # Prisma client singleton
│       └── email.ts            # Resend email utilities
├── .env.example
├── next.config.mjs
├── tailwind.config.ts
└── package.json
```

---

## API Reference

### `POST /api/repair-requests`

Submit a new diesel repair request.

**Required fields:** `requesterName`, `requesterEmail`, `requesterPhone`, `serviceAddress`, `issueType`, `issueDetails`

**Optional fields:** `requesterCompany`, `city`, `state`, `breakdownNow`, `truckType`, `unitNumber`, `roadsideLocation`, `specialNotes`

**Response:**
```json
{
  "success": true,
  "referenceId": "clxxxxxxxxxxxxx",
  "message": "Your repair request has been submitted."
}
```

---

### `POST /api/mechanics/apply`

Submit a mechanic application.

**Required fields:** `businessName`, `contactName`, `phone`, `email`, `city`, `state`, `serviceRadius`

**Optional fields:** `website`, `is24_7`, `services`, `notes`

**Response:**
```json
{
  "success": true,
  "id": "clxxxxxxxxxxxxx",
  "message": "Your application has been submitted."
}
```

---

## Build

```bash
npm run build
npm start
```

---

## Manual Production database migrations

`.github/workflows/prisma-production-migrate.yml` is **manual-only**. It never
deploys the app and is currently **status-only**: it runs `prisma migrate status`
and has no migration-apply step. A status result checks the migration ledger, not
live-schema drift, and does not authorize a rollout.

### One-time setup (repository administrator)

1. In Supabase, independently identify the **Production** project (not Preview)
   and its project reference in **Project Settings → General**. Confirm that a
   recent backup and a recovery plan are available before approving any writes.
2. In GitHub, open **Settings → Environments → New environment**, name it
   `production`, and click **Configure environment**. Add required reviewers
   (and prevent self-review where available). Restrict deployment branches to
   reviewed migration branches; do not allow untrusted PR code access to secrets.
3. Under that environment's **Environment secrets → Add environment secret**, add:
   - `PRODUCTION_DATABASE_URL`: Production Supabase PostgreSQL connection string.
   - `PRODUCTION_DIRECT_URL`: Production direct connection string, or the
     **session** pooler on port `5432` if the runner cannot reach the IPv6-only
     direct host. Never use transaction pooling for this secret.
4. Under **Environment variables → Add environment variable**, add
   `PRODUCTION_SUPABASE_PROJECT_REF` with the Production project reference.
   This is an independent allowlist, not a value inferred from either URL.
   Repository-level Actions secrets/variables with these names also work, but
   environment-scoped credentials with required reviewers are recommended.

Both URLs must use the `postgres` database and `public` schema, include
`sslmode=require` (or `verify-full`), and have an explicit port. Direct hosts must
be `db.<Production-project-reference>.supabase.co:5432` with user `postgres`.
Pooler hosts must be `aws-<number>-<region>.pooler.supabase.com` with user
`postgres.<Production-project-reference>`; `DATABASE_URL` may use port `6543`,
but `DIRECT_URL` must use `5432`. URL-encode password special characters.
Only documented Prisma pooling/timeout parameters are allowed; host/database
overrides, custom domains, local hosts and other Supabase projects are rejected.
No hostname heuristic can distinguish a Production project from a Preview project
on Supabase: the independently checked project reference is the safety boundary.
Never paste credentials into workflow inputs, source files, screenshots or logs.

### Run using GitHub only

Do not run a migration workflow or change a database as part of this PR. The
checked-in workflow cannot apply migrations. Production has no verified Prisma
baseline, and the historical migration chain does not create its foundation
tables. `migrate status` cannot detect live-schema drift.

Before any future Production rollout, follow
[Production schema reconciliation](prisma/reconciliation/README.md): obtain an
isolated restore or new rehearsal project, capture and review its complete
baseline, archive the incomplete historical migration root, and create a
baseline that exactly matches the restored schema. Record that baseline as
applied on the clone only; then rehearse the three PR migrations in timestamp
order and the reviewed reconciliation SQL as an active migration. Compare schema,
row counts, and IDs to the snapshot and test with non-live Stripe/email
credentials. Only after successful rehearsal should a separately reviewed and
approved Production migration plan be prepared. Do not use the existing Preview
project as a rehearsal database. Nothing in this PR authorizes or performs a
Production or Preview database change.

Prisma output is captured rather than printed, including on failure, because
database connection errors may expose sensitive URL details in this public repo.
If a future status check fails, stop and have a database maintainer inspect the
database privately. Do not blindly retry, baseline, reset or mark migrations
resolved.

### Migration-history risks checked before implementation

- PR #33 currently changes only package pricing; it adds no migration files.
  PR #34 includes the eight earlier migrations and adds, in order:
  `20261017000000_lead_acceptance_and_listing_privacy`,
  `20261017010000_provider_accounts_and_placements`, and
  `20261017020000_stripe_placement_checkout`. The status-only workflow requires
  these three files and uses the selected checkout's entire `prisma/migrations`
  history.
- There is **no `prisma/migrations/migration_lock.toml`**. Existing migration
  files are left untouched; a maintainer should confirm the intended PostgreSQL
  migration lineage before execution.
- Production currently has no verified Prisma migration ledger or complete
  baseline. The candidate SQL in `prisma/reconciliation/` is an audit-dependent
  artifact for isolated rehearsal, not an executable migration or a substitute
  for that baseline.
- The earliest migration alters existing `DieselMechanic` and
  `DieselRepairRequest` tables instead of creating a complete initial schema.
  This is **not an empty-database bootstrap**. Confirm Production has the expected
  baseline and matching `_prisma_migrations` records. Prior manual changes
  (including the repository's provider-location SQL scripts) may conflict with
  pending migrations even if their columns already exist.
- `prisma migrate status` checks migration history, **not live-schema drift**.
  It cannot prove that tables/columns match the migration files or that old
  migrations were never edited. Have a maintainer reconcile any drift privately
  before approving writes; this workflow does not repair it.
- PR #34's first migration intentionally backfills accepted-lead fields and
  promotional eligibility, and its second backfills provider approval dates.
  They also create indexes/tables, and the third depends on the second's
  `ListingPlacement` table. These intended writes may acquire locks; inspect
  the exact SQL, backups and maintenance timing before execution.

---

## Seeding Providers from Google Places

The repository ships with a one-time seeding script that imports mobile diesel
mechanics, mobile tire services, and heavy-duty wreckers from the Google Places
API across 5 major cities in every US state.

### 1. Get a Google Places API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com).
2. Create (or select) a project.
3. Enable the **Places API (New)** for that project.
4. Create an API key under **APIs & Services → Credentials**.

### 2. Add the Key to Your Environment

```bash
# .env
GOOGLE_PLACES_API_KEY="your_google_places_api_key_here"
```

### 3. Prepare a Local Development Database

Use only the disposable local database configured in Getting Started. The local
`prisma db push` step above creates the schema from the Prisma model before you
run the seed. Do not use this script or the following commands with Production
or the existing Preview database.

### 4. Run the Seed Script

The script supports three modes to control API costs and allow testing in small batches:

```bash
# Full nationwide run (all 50 states × 5 cities × 4 queries)
npm run seed:providers

# Single state only
npm run seed:providers -- --state TX

# Single city within a state
npm run seed:providers -- --state TX --city Dallas
```

**Optional flags:**

| Flag | Default | Description |
|------|---------|-------------|
| `--state <code>` | *(all states)* | Limit to a single state (two-letter code, e.g. `TX`) |
| `--city <name>` | *(all cities)* | Limit to a single city within `--state` |
| `--max-results <n>` | `20` | Max results per query (1–20; Google Places API limit is 20) |
| `--delay <ms>` | `200` | Milliseconds between API requests (increase if you hit 429s) |

**Example — test with a small batch before a full run:**

```bash
# Start small: one city, 10 results per query
npm run seed:providers -- --state TX --city Houston --max-results 10

# Then expand to a full state
npm run seed:providers -- --state TX

# Then run nationwide
npm run seed:providers
```

The script will:
- Search cities × states × 4 query terms via the Google Places API.
- Cap results at `--max-results` per query (default 20, max 20).
- Import each unique result as an **UNVERIFIED / FREE** provider.
- Skip providers that already exist (deduplicates by Google Place ID, or by
  business name + city + state + phone).
- Never overwrite existing provider records.
- Print a summary including **total API calls made**, imported, skipped, and errors.

### ⚠️ Important Warning

All providers imported by this script are set to `verificationStatus = UNVERIFIED`.
**Do not treat these listings as confirmed businesses.** Review and verify each
provider by phone before marking them as VERIFIED.
