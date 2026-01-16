-- 1. Add columns
ALTER TABLE "SASKAITA123Data" 
ADD COLUMN IF NOT EXISTS "apiKey" text,
ADD COLUMN IF NOT EXISTS "webhookUrl" text;

-- 2. Enable RLS
ALTER TABLE "SASKAITA123Data" ENABLE ROW LEVEL SECURITY;

-- 3. Create Policy: Allow Authenticated Users to View/Update
-- (Adjust to 'admin' ONLY if you want to restrict regular users)
CREATE POLICY "Enable access for authenticated users" 
ON "SASKAITA123Data"
FOR ALL 
USING (auth.role() = 'authenticated');

-- Verify
SELECT * FROM "SASKAITA123Data";
