-- AlterTable: add payment method fields to DieselRepairRequest
ALTER TABLE "DieselRepairRequest"
    ADD COLUMN "paymentMethod"       TEXT NOT NULL DEFAULT 'Unknown',
    ADD COLUMN "paymentNotes"        TEXT,
    ADD COLUMN "poNumber"            TEXT,
    ADD COLUMN "nationalAccountName" TEXT;
