-- Candidate forward-only reconciliation for the audited Production drift.
-- This file is intentionally outside prisma/migrations until a complete
-- Production baseline has been captured and the migration history reviewed.
-- Rehearse on an isolated restored clone before moving this into the active
-- Prisma migration chain.

BEGIN;

DO $preflight$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'DieselMechanic'
      AND column_name = 'services' AND udt_name = '_text' AND is_nullable = 'YES'
  ) THEN
    RAISE EXCEPTION 'Expected public.DieselMechanic.services to be nullable TEXT[]';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'DieselMechanic'
      AND column_name = 'isVerified' AND data_type = 'boolean' AND is_nullable = 'YES'
  ) THEN
    RAISE EXCEPTION 'Expected public.DieselMechanic.isVerified to be nullable BOOLEAN';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'DieselMechanic'
      AND column_name = 'reviewCount' AND data_type = 'integer' AND is_nullable = 'YES'
  ) THEN
    RAISE EXCEPTION 'Expected public.DieselMechanic.reviewCount to be nullable INTEGER';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'DieselMechanic'
      AND column_name = 'claimStatus' AND data_type = 'text' AND is_nullable = 'YES'
  ) THEN
    RAISE EXCEPTION 'Expected public.DieselMechanic.claimStatus to be nullable TEXT';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ProviderClaimRequest'
      AND column_name = 'status' AND data_type = 'text' AND is_nullable = 'NO'
  ) THEN
    RAISE EXCEPTION 'Expected public.ProviderClaimRequest.status to be NOT NULL TEXT';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type AS enum_type
    JOIN pg_namespace AS enum_schema ON enum_schema.oid = enum_type.typnamespace
    WHERE enum_schema.nspname = 'public' AND enum_type.typname = 'ClaimStatus' AND enum_type.typtype = 'e'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_type AS enum_type
    JOIN pg_namespace AS enum_schema ON enum_schema.oid = enum_type.typnamespace
    WHERE enum_schema.nspname = 'public' AND enum_type.typname = 'ClaimRequestStatus' AND enum_type.typtype = 'e'
  ) THEN
    RAISE EXCEPTION 'Expected ClaimStatus and ClaimRequestStatus enum types';
  END IF;

  IF (
    SELECT array_agg(enum_value.enumlabel ORDER BY enum_value.enumsortorder)
    FROM pg_enum AS enum_value
    JOIN pg_type AS enum_type ON enum_type.oid = enum_value.enumtypid
    JOIN pg_namespace AS enum_schema ON enum_schema.oid = enum_type.typnamespace
    WHERE enum_schema.nspname = 'public' AND enum_type.typname = 'ClaimStatus'
  ) IS DISTINCT FROM ARRAY['UNCLAIMED', 'PENDING', 'CLAIMED']::TEXT[] THEN
    RAISE EXCEPTION 'ClaimStatus enum labels differ from the Prisma schema';
  END IF;

  IF (
    SELECT array_agg(enum_value.enumlabel ORDER BY enum_value.enumsortorder)
    FROM pg_enum AS enum_value
    JOIN pg_type AS enum_type ON enum_type.oid = enum_value.enumtypid
    JOIN pg_namespace AS enum_schema ON enum_schema.oid = enum_type.typnamespace
    WHERE enum_schema.nspname = 'public' AND enum_type.typname = 'ClaimRequestStatus'
  ) IS DISTINCT FROM ARRAY['NEW', 'CONTACTED', 'APPROVED', 'DECLINED']::TEXT[] THEN
    RAISE EXCEPTION 'ClaimRequestStatus enum labels differ from the Prisma schema';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public."DieselMechanic"
    WHERE "isVerified" IS NULL OR "reviewCount" IS NULL
       OR "claimStatus" IS NULL
       OR "claimStatus" NOT IN ('UNCLAIMED', 'PENDING', 'CLAIMED')
  ) THEN
    RAISE EXCEPTION 'Provider audit assumptions changed: nullable or invalid verification/review/claim values exist';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public."ProviderClaimRequest"
    WHERE "status" NOT IN ('NEW', 'CONTACTED', 'APPROVED', 'DECLINED')
  ) THEN
    RAISE EXCEPTION 'ProviderClaimRequest.status contains a value outside ClaimRequestStatus';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public."ProviderClaimRequest" AS claim
    LEFT JOIN public."DieselMechanic" AS provider ON provider."id" = claim."providerId"
    WHERE provider."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'ProviderClaimRequest contains orphan provider references';
  END IF;

  IF (SELECT count(*) FROM public."DieselMechanic" WHERE "services" IS NULL) <> 34 THEN
    RAISE EXCEPTION 'Expected 34 NULL services rows from the audit; re-review the clone before continuing';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public."ProviderClaimRequest"'::regclass
      AND conname = 'ProviderClaimRequest_providerId_fkey'
  ) THEN
    RAISE EXCEPTION 'ProviderClaimRequest provider FK already exists; review its definition before continuing';
  END IF;
END
$preflight$;

DO $normalize_services$
DECLARE
  normalized_count INTEGER;
BEGIN
  UPDATE public."DieselMechanic"
  SET "services" = ARRAY[]::TEXT[]
  WHERE "services" IS NULL;

  GET DIAGNOSTICS normalized_count = ROW_COUNT;
  IF normalized_count <> 34 THEN
    RAISE EXCEPTION 'Expected to normalize 34 NULL services values, updated %', normalized_count;
  END IF;
END
$normalize_services$;

ALTER TABLE public."DieselMechanic"
  ALTER COLUMN "services" SET NOT NULL,
  ALTER COLUMN "isVerified" SET DEFAULT false,
  ALTER COLUMN "isVerified" SET NOT NULL,
  ALTER COLUMN "reviewCount" SET DEFAULT 0,
  ALTER COLUMN "reviewCount" SET NOT NULL;

ALTER TABLE public."DieselMechanic"
  ALTER COLUMN "claimStatus" DROP DEFAULT;

ALTER TABLE public."DieselMechanic"
  ALTER COLUMN "claimStatus" TYPE public."ClaimStatus"
  USING "claimStatus"::TEXT::public."ClaimStatus",
  ALTER COLUMN "claimStatus" SET DEFAULT 'UNCLAIMED',
  ALTER COLUMN "claimStatus" SET NOT NULL;

ALTER TABLE public."ProviderClaimRequest"
  ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE public."ProviderClaimRequest"
  ALTER COLUMN "status" TYPE public."ClaimRequestStatus"
  USING "status"::TEXT::public."ClaimRequestStatus",
  ALTER COLUMN "status" SET DEFAULT 'NEW';

ALTER TABLE public."ProviderClaimRequest"
  ADD CONSTRAINT "ProviderClaimRequest_providerId_fkey"
  FOREIGN KEY ("providerId") REFERENCES public."DieselMechanic"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE
  NOT VALID;

ALTER TABLE public."ProviderClaimRequest"
  VALIDATE CONSTRAINT "ProviderClaimRequest_providerId_fkey";

COMMIT;
