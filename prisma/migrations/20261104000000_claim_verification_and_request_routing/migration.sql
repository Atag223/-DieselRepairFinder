CREATE TYPE "RequestRoutingStatus" AS ENUM ('PENDING', 'DISPATCHED', 'NEEDS_ATTENTION');

ALTER TABLE "DieselRepairRequest"
  ADD COLUMN "routingStatus" "RequestRoutingStatus",
  ADD COLUMN "routingError" TEXT,
  ADD COLUMN "adminNotifiedAt" TIMESTAMP(3),
  ADD COLUMN "requesterNotifiedAt" TIMESTAMP(3);

ALTER TABLE "ProviderClaimRequest"
  ADD COLUMN "emailVerificationTokenHash" TEXT,
  ADD COLUMN "emailVerificationExpiresAt" TIMESTAMP(3),
  ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "ProviderClaimRequest_emailVerificationTokenHash_key"
  ON "ProviderClaimRequest"("emailVerificationTokenHash");
