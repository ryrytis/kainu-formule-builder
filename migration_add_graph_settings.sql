-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table for Microsoft Graph App Credentials
CREATE TABLE IF NOT EXISTS public.graph_settings (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id text,
    client_id text,
    client_secret text,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table for Email Monitored Mailboxes
CREATE TABLE IF NOT EXISTS public.email_monitors (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    email_address text NOT NULL,
    delta_link text,
    is_active boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up RLS
ALTER TABLE public.graph_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_monitors ENABLE ROW LEVEL SECURITY;

-- Allow read/write for authenticated users (the frontend needs this for the settings page)
CREATE POLICY "Enable read access for all users on graph_settings" ON public.graph_settings FOR SELECT USING (true);
CREATE POLICY "Enable update access for all users on graph_settings" ON public.graph_settings FOR UPDATE USING (true);
CREATE POLICY "Enable insert access for all users on graph_settings" ON public.graph_settings FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read access for all users on email_monitors" ON public.email_monitors FOR SELECT USING (true);
CREATE POLICY "Enable update access for all users on email_monitors" ON public.email_monitors FOR UPDATE USING (true);
CREATE POLICY "Enable insert access for all users on email_monitors" ON public.email_monitors FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable delete access for all users on email_monitors" ON public.email_monitors FOR DELETE USING (true);

-- Insert a default empty row for graph_settings if it doesn't exist
INSERT INTO public.graph_settings (tenant_id, client_id, client_secret)
SELECT '', '', ''
WHERE NOT EXISTS (SELECT 1 FROM public.graph_settings LIMIT 1);
