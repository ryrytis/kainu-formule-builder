CREATE TABLE IF NOT EXISTS "public"."venipak_settings" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "api_id" text,
    "username" text,
    "password" text,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE "public"."venipak_settings" ENABLE ROW LEVEL SECURITY;

-- Create Policy (Admin only, similar to Saskaita)
CREATE POLICY "Enable read/write for authenticated users" ON "public"."venipak_settings"
AS PERMISSIVE FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Grant access
GRANT ALL ON TABLE "public"."venipak_settings" TO authenticated;
GRANT ALL ON TABLE "public"."venipak_settings" TO service_role;
