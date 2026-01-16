-- Enable RLS on clients table (ensure it is on)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Policy to allow anonymous/public users to SELECT client data
-- We rely on the UUID being hard to guess.
CREATE POLICY "Public Read Clients"
ON clients
FOR SELECT
TO anon
USING (true);

-- Policy to allow anonymous/public users to UPDATE client data
CREATE POLICY "Public Update Clients"
ON clients
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);
