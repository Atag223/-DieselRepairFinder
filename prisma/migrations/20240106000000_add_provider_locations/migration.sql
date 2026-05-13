-- CreateTable: ProviderLocation
CREATE TABLE "ProviderLocation" (
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

-- AddForeignKey: ProviderLocation -> DieselMechanic
ALTER TABLE "ProviderLocation"
    ADD CONSTRAINT "ProviderLocation_providerId_fkey"
    FOREIGN KEY ("providerId") REFERENCES "DieselMechanic"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: add geocoding fields to DieselRepairRequest
ALTER TABLE "DieselRepairRequest"
    ADD COLUMN "latitude"  DOUBLE PRECISION,
    ADD COLUMN "longitude" DOUBLE PRECISION;

-- AlterTable: add routing metadata to DieselLead
ALTER TABLE "DieselLead"
    ADD COLUMN "providerLocationId" TEXT,
    ADD COLUMN "distanceMiles"      DOUBLE PRECISION,
    ADD COLUMN "routingRank"        INTEGER,
    ADD COLUMN "routingRadiusUsed"  INTEGER;

-- AddForeignKey: DieselLead.providerLocationId -> ProviderLocation
ALTER TABLE "DieselLead"
    ADD CONSTRAINT "DieselLead_providerLocationId_fkey"
    FOREIGN KEY ("providerLocationId") REFERENCES "ProviderLocation"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
