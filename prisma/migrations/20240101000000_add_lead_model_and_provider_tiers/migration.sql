-- CreateEnum
CREATE TYPE "ProviderTier" AS ENUM ('FREE', 'FEATURED', 'PREMIUM');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('SENT', 'ACCEPTED', 'DECLINED', 'NO_RESPONSE');

-- AlterTable: add monetization columns to ServiceProvider (DieselMechanic)
ALTER TABLE "DieselMechanic"
  ADD COLUMN "tier"               "ProviderTier" NOT NULL DEFAULT 'FREE',
  ADD COLUMN "leadsReceived"      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "freeLeadsRemaining" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN "totalLeadsCharged"  INTEGER NOT NULL DEFAULT 0;

-- CreateTable: Lead (DieselLead)
CREATE TABLE "DieselLead" (
  "id"               TEXT NOT NULL,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "serviceRequestId" TEXT NOT NULL,
  "providerId"       TEXT NOT NULL,
  "status"           "LeadStatus" NOT NULL DEFAULT 'SENT',
  "charged"          BOOLEAN NOT NULL DEFAULT false,
  "price"            DOUBLE PRECISION NOT NULL DEFAULT 25,

  CONSTRAINT "DieselLead_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DieselLead" ADD CONSTRAINT "DieselLead_serviceRequestId_fkey"
  FOREIGN KEY ("serviceRequestId") REFERENCES "DieselRepairRequest"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DieselLead" ADD CONSTRAINT "DieselLead_providerId_fkey"
  FOREIGN KEY ("providerId") REFERENCES "DieselMechanic"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
