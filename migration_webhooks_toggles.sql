-- Add enable/disable flags for webhooks to SASKAITA123Data
ALTER TABLE "SASKAITA123Data"
ADD COLUMN IF NOT EXISTS "enable_client_form" boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS "enable_invoice" boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS "enable_sharepoint" boolean DEFAULT true;
