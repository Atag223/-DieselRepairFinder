-- AlterTable: add suspend and soft-delete fields to ServiceProvider
ALTER TABLE "DieselMechanic"
  ADD COLUMN "suspendedAt"     TIMESTAMP(3),
  ADD COLUMN "suspendedReason" TEXT,
  ADD COLUMN "deletedAt"       TIMESTAMP(3);
