-- Add distinct webhook columns to SASKAITA123Data
ALTER TABLE "SASKAITA123Data"
ADD COLUMN IF NOT EXISTS "webhook_client_form" text,
ADD COLUMN IF NOT EXISTS "webhook_invoice" text,
ADD COLUMN IF NOT EXISTS "webhook_sharepoint" text;

-- Optional: Copy existing generic webhookUrl to invoice/sharepoint if populated, to smooth migration
-- UPDATE "SASKAITA123Data" SET "webhook_invoice" = "webhookUrl", "webhook_sharepoint" = "webhookUrl" WHERE "webhookUrl" IS NOT NULL AND "webhook_invoice" IS NULL;
