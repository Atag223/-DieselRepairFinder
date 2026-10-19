CREATE TABLE "ProviderLoginToken" (
  "id" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProviderLoginToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProviderLoginToken_tokenHash_key" ON "ProviderLoginToken"("tokenHash");
CREATE INDEX "ProviderLoginToken_providerId_createdAt_idx" ON "ProviderLoginToken"("providerId", "createdAt");
ALTER TABLE "ProviderLoginToken" ADD CONSTRAINT "ProviderLoginToken_providerId_fkey"
  FOREIGN KEY ("providerId") REFERENCES "DieselMechanic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ProviderSession" (
  "id" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProviderSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProviderSession_tokenHash_key" ON "ProviderSession"("tokenHash");
CREATE INDEX "ProviderSession_providerId_expiresAt_idx" ON "ProviderSession"("providerId", "expiresAt");
ALTER TABLE "ProviderSession" ADD CONSTRAINT "ProviderSession_providerId_fkey"
  FOREIGN KEY ("providerId") REFERENCES "DieselMechanic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ListingPlacement" (
  "id" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "tier" "ProviderTier" NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'REQUESTED',
  "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "startsAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  CONSTRAINT "ListingPlacement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ListingPlacement_providerId_status_idx" ON "ListingPlacement"("providerId", "status");
CREATE INDEX "ListingPlacement_state_tier_status_idx" ON "ListingPlacement"("state", "tier", "status");
CREATE UNIQUE INDEX "ListingPlacement_state_tier_reserved_key"
  ON "ListingPlacement"("state", "tier")
  WHERE "status" IN ('REQUESTED', 'APPROVED', 'ACTIVE');
ALTER TABLE "ListingPlacement" ADD CONSTRAINT "ListingPlacement_providerId_fkey"
  FOREIGN KEY ("providerId") REFERENCES "DieselMechanic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "DieselMechanic"
SET "approvedAt" = "createdAt"
WHERE "active" = true
  AND "verificationStatus" = 'VERIFIED'
  AND "approvedAt" IS NULL;
