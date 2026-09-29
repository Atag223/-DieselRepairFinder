-- CreateTable: ProviderLocation
CREATE TABLE IF NOT EXISTS "ProviderLocation" (
    "id"            TEXT NOT NULL,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,
    "providerId"    TEXT NOT NULL,
    "locationName"  TEXT,
    "address"       TEXT,
    "city"          TEXT NOT NULL,
    "state"         TEXT NOT NULL,
    "zip"           TEXT,
    "latitude"      DOUBLE PRECISION,
    "longitude"     DOUBLE PRECISION,
    "serviceRadius" INTEGER NOT NULL DEFAULT 50,
    "phone"         TEXT,
    "email"         TEXT,
    "contactName"   TEXT,
    "isPrimary"     BOOLEAN NOT NULL DEFAULT false,
    "active"        BOOLEAN NOT NULL DEFAULT true,
    "notes"         TEXT,

    CONSTRAINT "ProviderLocation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey: ProviderLocation -> DieselMechanic (guarded, idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ProviderLocation_providerId_fkey'
      AND conrelid = 'public."ProviderLocation"'::regclass
  ) THEN
    ALTER TABLE "ProviderLocation"
      ADD CONSTRAINT "ProviderLocation_providerId_fkey"
      FOREIGN KEY ("providerId") REFERENCES "DieselMechanic"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AlterTable: add geocoding fields to DieselRepairRequest
ALTER TABLE "DieselRepairRequest"
    ADD COLUMN IF NOT EXISTS "latitude"  DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;

-- AlterTable: add routing metadata to DieselLead
ALTER TABLE "DieselLead"
    ADD COLUMN IF NOT EXISTS "providerLocationId" TEXT,
    ADD COLUMN IF NOT EXISTS "distanceMiles"      DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "routingRank"        INTEGER,
    ADD COLUMN IF NOT EXISTS "routingRadiusUsed"  INTEGER;

-- AddForeignKey: DieselLead.providerLocationId -> ProviderLocation (guarded)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'DieselLead_providerLocationId_fkey'
      AND conrelid = 'public."DieselLead"'::regclass
  ) THEN
    ALTER TABLE "DieselLead"
      ADD CONSTRAINT "DieselLead_providerLocationId_fkey"
      FOREIGN KEY ("providerLocationId") REFERENCES "ProviderLocation"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
