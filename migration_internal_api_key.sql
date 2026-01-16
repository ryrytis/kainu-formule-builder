-- Add internal_api_key to SASKAITA123Data
ALTER TABLE "SASKAITA123Data"
ADD COLUMN IF NOT EXISTS "internal_api_key" text;
