-- Enable RLS for order_items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- order_items Policies
CREATE POLICY "Enable all for authenticated users" ON public.order_items
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
