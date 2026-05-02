-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('UNCLAIMED', 'PENDING', 'CLAIMED');

-- CreateEnum
CREATE TYPE "ClaimRequestStatus" AS ENUM ('NEW', 'CONTACTED', 'APPROVED', 'DECLINED');

-- AlterTable: add quality/review and claim fields to ServiceProvider
ALTER TABLE "DieselMechanic"
  ADD COLUMN "rating"         DOUBLE PRECISION,
  ADD COLUMN "reviewCount"    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "isVerified"     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "lastVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "claimedAt"      TIMESTAMP(3),
  ADD COLUMN "claimStatus"    "ClaimStatus" NOT NULL DEFAULT 'UNCLAIMED';

-- CreateTable
CREATE TABLE "ProviderClaimRequest" (
  "id"           TEXT NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "providerId"   TEXT NOT NULL,
  "businessName" TEXT NOT NULL,
  "contactName"  TEXT NOT NULL,
  "phone"        TEXT NOT NULL,
  "email"        TEXT NOT NULL,
  "notes"        TEXT,
  "status"       "ClaimRequestStatus" NOT NULL DEFAULT 'NEW',
  CONSTRAINT "ProviderClaimRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ProviderClaimRequest"
  ADD CONSTRAINT "ProviderClaimRequest_providerId_fkey"
  FOREIGN KEY ("providerId") REFERENCES "DieselMechanic"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
