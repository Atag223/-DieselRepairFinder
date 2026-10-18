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

### 3. Set Up the Database

```bash
npx prisma migrate dev --name init
```

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

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
deploys the app. Verification-only mode is selected by default and does not apply
migrations. Applying uses the locked Prisma 5 CLI and only `prisma migrate deploy`;
it does not reset, seed, push a schema, or automatically resolve migration history.

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

**Prerequisite:** GitHub requires this workflow file to exist on default branch
`main` before its **Run workflow** button is available. This workflow-only PR
does not itself include PR #34's application or migration changes. Once an
administrator approves adding the workflow to `main`, also put the same reviewed
workflow on the branch containing PR #34's complete migration history. This can
be done in GitHub's file editor: select that branch under **Code**, choose
**Add file → Create new file**, enter `.github/workflows/prisma-production-migrate.yml`,
copy the reviewed workflow verbatim, and commit it to that branch (or use a
reviewed follow-up PR if branch rules require one). Do not run it from `main`
while `main` lacks those migrations. Nothing is merged or executed by preparing
this workflow.

1. Open **Actions → Prisma Production migrations → Run workflow**.
2. In **Use workflow from / Branch**, select the **reviewed branch containing both
   the workflow and all pending migrations**. For PR #34, its current head branch
   is `copilot/align-prepaid-lead-credit-packages`, based on PR #33.
   Do not select this workflow-only PR branch; the missing-migrations guard
   deliberately rejects it. The checkout is pinned to the selected run's commit,
   never hardcoded to `main` or a moving application branch.
3. Leave **Only check migration status** checked and confirmation empty.
   Click **Run workflow**. If prompted, open the run → **Review deployments** →
   select `production` → **Approve and deploy** (GitHub's label approves this job,
   not an application deployment).
4. Open the run → `migrate`. Verify the selected ref/commit, the successful target
   guard, and **Read-only migration status**, which reports pending migrations or
   an up-to-date history. Review the SQL files at that exact commit before writes.
5. After reviewing backups, migration risks and the dry verification, repeat
   **Run workflow** on the **same reviewed commit/branch** (check it has not changed).
   Uncheck verification-only, type `APPLY PRODUCTION MIGRATIONS`, click
   **Run workflow**, and approve the environment again if required.
6. Success requires a green run, **Apply pending Production migrations** reporting
   completion, and **Verify Production migration history after deploy** reporting
   **No pending migrations remain**. The run summary confirms this too. A green
   verification-only run is **not** proof that migrations were applied.
   Only then consider merging/deploying PR #33/#34 separately, with approval.

Prisma output is captured rather than printed, including on failure, because
database connection errors may expose sensitive URL details in this public repo.
If verification or deployment fails, stop and have a database maintainer inspect
the database privately. An interrupted/failed migration may have partially applied;
do not blindly retry, baseline, reset or mark migrations resolved.

### Migration-history risks checked before implementation

- PR #33 currently changes only package pricing; it adds no migration files.
  PR #34 includes the eight earlier migrations and adds, in order:
  `20261017000000_lead_acceptance_and_listing_privacy`,
  `20261017010000_provider_accounts_and_placements`, and
  `20261017020000_stripe_placement_checkout`. The workflow requires these three
  files and uses the selected checkout's entire `prisma/migrations` history.
- There is **no `prisma/migrations/migration_lock.toml`**. Existing migration
  files are left untouched; a maintainer should confirm the intended PostgreSQL
  migration lineage before execution.
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

### 3. Apply the Database Migration

The script requires three new columns on `ServiceProvider`. Apply the migration
before running the seed:

```bash
npx prisma migrate deploy
# or, in development:
npx prisma migrate dev
```

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
