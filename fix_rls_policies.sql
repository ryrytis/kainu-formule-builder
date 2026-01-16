-- Enable RLS for main tables
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Materials Policies
CREATE POLICY "Enable all for authenticated users" ON public.materials
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Products Policies
CREATE POLICY "Enable all for authenticated users" ON public.products
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Clients Policies
CREATE POLICY "Enable all for authenticated users" ON public.clients
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);