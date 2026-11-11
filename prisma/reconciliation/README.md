# Production schema baseline and rehearsal

The SQL beside this file is a **candidate** forward-only reconciliation for the
audited drift. It is deliberately outside `prisma/migrations`: Production has
no Prisma migration ledger, and the checked-in historical chain starts by
altering foundation tables that the chain never creates. Do not run
`prisma migrate deploy` against Production or the existing Preview project.

## Safest clone option

Do not repurpose the existing Preview Supabase project. It is a separate
environment, but its data and current use have not been inspected; restoring
over it or applying migrations there could destroy test data or interrupt
preview development.

If the Production project offers **Restore to a new project** under **Database
→ Backups**, use that instead. Supabase documents this as a way to create a
separate project from a backup; availability depends on the project plan and
backup configuration:

- <https://supabase.com/docs/guides/platform/clone-project>
- <https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore>

For a nontechnical operator:

1. Sign in to Supabase and open the **DieselRepairFinder Production** project.
2. Open **Database → Backups**. Do not choose Restore on the Production project.
3. Look for **Restore to a new project**. Choose the newest suitable backup
   (or a point-in-time restore if available) and give the new project a clear
   name such as `DieselRepairFinder Production Rehearsal`.
4. Confirm the destination is a newly created project, not the existing
   Preview or Production project. Keep it private and limit dashboard access.
5. Wait for the restore to finish. Do not change Production or Preview. The
   restored clone contains real provider/customer data, so treat it as
   production-confidential and do not paste its database password or data into
   chat or source control.
6. Reply with whether Supabase offered and completed the new-project restore,
   plus the clone's project name/ref (not passwords or connection strings).

If that option is unavailable, stop rather than overwrite Preview. The next
safest option is to create a **new, empty Supabase project** for rehearsal and
ask an administrator to use Supabase's documented backup/restore procedure to
restore Production into it. Do not attempt a manual dump/restore unless an
administrator is available to manage credentials, extensions, roles, and
private customer data.

## Baseline and migration sequence

An exact baseline cannot be safely generated from this repository alone: the
foundational-table DDL is absent from the historical migration chain, and the
audits supplied so far do not provide a complete schema dump for every table,
constraint, index, enum, trigger, policy, and extension. Do not infer the
missing definitions from the current Prisma schema and call that an exact
Production baseline.

Once the isolated clone is available, use this sequence:

1. Preserve a fresh clone backup/snapshot. Record counts for providers,
   locations, leads, payments, and claim requests. Keep the clone disconnected
   from live app traffic, email delivery, and live Stripe credentials.
2. Capture the clone's complete schema-only definition and Prisma introspection
   **before** changing it. Compare the seven existing application tables, all
   columns/defaults/nullability, enums, indexes, foreign keys, and any
   triggers, policies, or extensions against the audits and repository.
3. Author and review a baseline migration that represents that exact
   pre-reconciliation, pre-PR clone schema. Preserve the existing tables; do
   not drop or recreate them on the restored clone. Keep the old incomplete
   migration files in an archive outside `prisma/migrations` before making the
   baseline the active root; never let the old foundation-altering migrations
   replay against this clone.
4. Record the baseline as already applied **on the restored clone only** after
   comparing it to the snapshot. Do not execute the baseline's table-creation
   DDL on the restored clone.
5. Apply the pending PR migrations in timestamp order:
   `20261017000000_lead_acceptance_and_listing_privacy`,
   `20261017010000_provider_accounts_and_placements`, then
   `20261017020000_stripe_placement_checkout`.
6. Apply the candidate reconciliation SQL in this directory after the PR
   migrations. Convert it to a numbered active Prisma migration only after the
   baseline and migration ordering are reviewed. It checks the audited column
   definitions, refuses unexpected NULL/enum/orphan data, replaces only NULL
   `services` with empty arrays, restores intended defaults/nullability,
   converts the two TEXT statuses to their existing enums, and adds/validates
   the missing FK.
7. Re-introspect and compare with `prisma/schema.prisma`. Verify row counts and
   IDs are unchanged for all existing provider/location/lead/payment rows;
   verify the 34 services values became empty arrays and all other service
   arrays are unchanged.
8. Run provider-search, lead-acceptance/idempotent-charge, Stripe test-mode
   purchase/webhook, and authenticated private Swamper Clyde API tests against
   the clone. Confirm no email or payment reaches a real customer.
9. Review the full rehearsal log and restore point before separately approving
   any Production plan. This repository does not authorize or execute
   Production changes.

The candidate SQL assumes the supplied audit is still accurate. Its guards are
intended to fail closed if the clone differs. Enum conversion and adding the FK
may take locks; measure timing and confirm the deployment window on the clone
before any separately authorized Production deployment.
