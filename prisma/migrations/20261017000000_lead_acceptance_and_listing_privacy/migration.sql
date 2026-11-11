ALTER TABLE "DieselMechanic"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "promotionalBonusUsed" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "DieselLead"
  ADD COLUMN "acceptanceTokenHash" TEXT,
  ADD COLUMN "acceptanceTokenExpiresAt" TIMESTAMP(3),
  ADD COLUMN "acceptedAt" TIMESTAMP(3),
  ADD COLUMN "acceptedServiceRequestProviderId" TEXT;

CREATE UNIQUE INDEX "DieselLead_acceptanceTokenHash_key"
  ON "DieselLead"("acceptanceTokenHash");

WITH accepted_leads AS (
  SELECT "id", "serviceRequestId", "providerId",
    ROW_NUMBER() OVER (
      PARTITION BY "serviceRequestId", "providerId"
      ORDER BY "createdAt", "id"
    ) AS accepted_rank
  FROM "DieselLead"
  WHERE "status" = 'ACCEPTED'
)
UPDATE "DieselLead" AS lead
SET "acceptedAt" = COALESCE(lead."acceptedAt", lead."createdAt"),
    "acceptedServiceRequestProviderId" =
      accepted_leads."serviceRequestId" || ':' || accepted_leads."providerId"
FROM accepted_leads
WHERE lead."id" = accepted_leads."id"
  AND accepted_leads.accepted_rank = 1;

CREATE UNIQUE INDEX "DieselLead_acceptedServiceRequestProviderId_key"
  ON "DieselLead"("acceptedServiceRequestProviderId");

ALTER TABLE "ProviderPayment"
  ADD COLUMN "stripeCheckoutSessionId" TEXT;

CREATE UNIQUE INDEX "ProviderPayment_stripeCheckoutSessionId_key"
  ON "ProviderPayment"("stripeCheckoutSessionId");

UPDATE "DieselMechanic" AS provider
SET "promotionalBonusUsed" = true
WHERE EXISTS (
  SELECT 1
  FROM "ProviderPayment" AS payment
  WHERE payment."providerId" = provider."id"
    AND payment."status" = 'COMPLETED'
);
