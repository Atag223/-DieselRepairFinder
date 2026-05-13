-- Migration: add lead credits, billing fields, LeadCreditTransaction, and ProviderPayment

-- Add new enum type for lead credit transactions
CREATE TYPE "LeadCreditTransactionType" AS ENUM (
  'FREE_CREDIT',
  'ADMIN_GRANT',
  'STRIPE_PURCHASE',
  'LEAD_DEBIT',
  'REFUND'
);

-- AlterTable: add credit-based billing fields to ServiceProvider
ALTER TABLE "DieselMechanic"
  ADD COLUMN "leadCredits"              INTEGER   NOT NULL DEFAULT 0,
  ADD COLUMN "freeLeadCreditsIssued"    BOOLEAN   NOT NULL DEFAULT false,
  ADD COLUMN "stripeCustomerId"         TEXT,
  ADD COLUMN "stripeAccountBalanceCents" INTEGER  NOT NULL DEFAULT 0,
  ADD COLUMN "billingStatus"            TEXT,
  ADD COLUMN "claimedByEmail"           TEXT,
  ADD COLUMN "approvedAt"               TIMESTAMP(3),
  ADD COLUMN "lastCreditGrantAt"        TIMESTAMP(3);

-- CreateTable: LeadCreditTransaction
CREATE TABLE "LeadCreditTransaction" (
  "id"                    TEXT        NOT NULL,
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "providerId"            TEXT        NOT NULL,
  "amount"                INTEGER     NOT NULL,
  "type"                  "LeadCreditTransactionType" NOT NULL,
  "note"                  TEXT,
  "stripePaymentIntentId" TEXT,

  CONSTRAINT "LeadCreditTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ProviderPayment
CREATE TABLE "ProviderPayment" (
  "id"                    TEXT        NOT NULL,
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "providerId"            TEXT        NOT NULL,
  "stripePaymentIntentId" TEXT,
  "amountCents"           INTEGER     NOT NULL,
  "creditsPurchased"      INTEGER     NOT NULL,
  "status"                TEXT        NOT NULL,

  CONSTRAINT "ProviderPayment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey: LeadCreditTransaction → DieselMechanic
ALTER TABLE "LeadCreditTransaction"
  ADD CONSTRAINT "LeadCreditTransaction_providerId_fkey"
  FOREIGN KEY ("providerId") REFERENCES "DieselMechanic"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: ProviderPayment → DieselMechanic
ALTER TABLE "ProviderPayment"
  ADD CONSTRAINT "ProviderPayment_providerId_fkey"
  FOREIGN KEY ("providerId") REFERENCES "DieselMechanic"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
