ALTER TABLE "ListingPlacement"
  ADD COLUMN "amountCents" INTEGER,
  ADD COLUMN "stripeCheckoutSessionId" TEXT,
  ADD COLUMN "checkoutExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "ListingPlacement_stripeCheckoutSessionId_key"
  ON "ListingPlacement"("stripeCheckoutSessionId");
