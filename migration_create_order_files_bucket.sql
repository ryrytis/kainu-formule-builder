-- Create the order-files bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('order-files', 'order-files', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies if any to avoid errors
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Enable upload for authenticated users" ON storage.objects;

-- Create policy to allow public access to read files in the bucket
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'order-files');

-- Create policy to allow authenticated users to upload files
CREATE POLICY "Enable upload for authenticated users" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'order-files' AND auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON storage.objects
  FOR UPDATE WITH CHECK (bucket_id = 'order-files' AND auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON storage.objects
  FOR DELETE USING (bucket_id = 'order-files' AND auth.role() = 'authenticated');
