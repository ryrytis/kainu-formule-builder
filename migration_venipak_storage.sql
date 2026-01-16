-- Create venipak_labels bucket (Idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('venipak_labels', 'venipak_labels', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for venipak_labels bucket

-- 1. Insert (Authenticated) - Drop first to ensure latest definition
DROP POLICY IF EXISTS "VENIPAK_UPLOAD_AUTH" ON storage.objects;
CREATE POLICY "VENIPAK_UPLOAD_AUTH" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'venipak_labels');

-- 2. Select (Public, for Webhook/Email access) - Drop first to ensure latest definition
DROP POLICY IF EXISTS "VENIPAK_READ_PUBLIC" ON storage.objects;
CREATE POLICY "VENIPAK_READ_PUBLIC" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'venipak_labels');
