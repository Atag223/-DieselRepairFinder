-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProviderSource" AS ENUM ('MANUAL', 'GOOGLE_PLACES');

-- AlterTable: make contactName, phone, email, serviceRadius optional; add Google Places fields
ALTER TABLE "DieselMechanic"
  ALTER COLUMN "contactName"   DROP NOT NULL,
  ALTER COLUMN "phone"         DROP NOT NULL,
  ALTER COLUMN "email"         DROP NOT NULL,
  ALTER COLUMN "serviceRadius" DROP NOT NULL,
  ADD COLUMN "googlePlaceId"      TEXT,
  ADD COLUMN "googleMapsUri"      TEXT,
  ADD COLUMN "formattedAddress"   TEXT,
  ADD COLUMN "latitude"           DOUBLE PRECISION,
  ADD COLUMN "longitude"          DOUBLE PRECISION,
  ADD COLUMN "source"             "ProviderSource"     NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED';

-- CreateIndex
CREATE UNIQUE INDEX "DieselMechanic_googlePlaceId_key" ON "DieselMechanic"("googlePlaceId");
