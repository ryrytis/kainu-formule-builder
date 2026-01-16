-- Option 1: Non-destructive update for venipak_global_sequence

-- Add columns if they don't exist
ALTER TABLE "public"."venipak_global_sequence" ADD COLUMN IF NOT EXISTS "current_value" bigint DEFAULT 0;
ALTER TABLE "public"."venipak_global_sequence" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();

-- ensure RLS is enabled
ALTER TABLE "public"."venipak_global_sequence" ENABLE ROW LEVEL SECURITY;

-- Policy (Create if not exists block is verbose in SQL, so we'll just try/catch or assume user handles duplicates if re-running. 
-- For safety, we drop and recreate the policy to ensure it's correct)
DROP POLICY IF EXISTS "Enable all for authenticated users" ON "public"."venipak_global_sequence";
CREATE POLICY "Enable all for authenticated users" ON "public"."venipak_global_sequence"
AS PERMISSIVE FOR ALL TO authenticated
USING (true) WITH CHECK (true);


-- Create venipak_label_sequences table if not exists
CREATE TABLE IF NOT EXISTS "public"."venipak_label_sequences" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "sequence_name" text NOT NULL UNIQUE,
    "current_value" bigint DEFAULT 0,
    "updated_at" timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE "public"."venipak_label_sequences" ENABLE ROW LEVEL SECURITY;

-- Policy for label sequences
DROP POLICY IF EXISTS "Enable all for authenticated users" ON "public"."venipak_label_sequences";
CREATE POLICY "Enable all for authenticated users" ON "public"."venipak_label_sequences"
AS PERMISSIVE FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- Grant access
GRANT ALL ON TABLE "public"."venipak_global_sequence" TO authenticated;
GRANT ALL ON TABLE "public"."venipak_global_sequence" TO service_role;
GRANT ALL ON TABLE "public"."venipak_label_sequences" TO authenticated;
GRANT ALL ON TABLE "public"."venipak_label_sequences" TO service_role;

-- Initialize default values for label sequences
INSERT INTO "public"."venipak_label_sequences" ("sequence_name", "current_value") 
VALUES ('manifest', 0), ('label', 0) 
ON CONFLICT ("sequence_name") DO NOTHING;

-- Note: We do NOT insert into venipak_global_sequence here to avoid conflicts if rows exist. 
-- The Service layer will handle initialization if the table is empty.
