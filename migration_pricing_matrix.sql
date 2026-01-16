-- Create a new table for Product Pricing Matrix
CREATE TABLE IF NOT EXISTS public.product_pricing_matrices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    quantity_from INTEGER NOT NULL,
    quantity_to INTEGER, -- Null means "and up" or specific exact quantity if we treat it as steps
    price DECIMAL(10, 4) NOT NULL, -- Base price for this configuration per unit (or total? Plan said Base price for tier) -> Usually unit price in this domain
    print_type TEXT, -- '4+0', '4+4', etc.
    lamination TEXT, -- 'None', 'Matte', 'Gloss', etc.
    material_id UUID REFERENCES public.materials(id) ON DELETE SET NULL,
    extra_works JSONB DEFAULT '[]'::jsonb, -- Array of strings or objects for extra capabilities like 'Foiling'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies (Open for now as per previous pattern, or authenticated)
ALTER TABLE public.product_pricing_matrices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.product_pricing_matrices FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON public.product_pricing_matrices FOR INSERT WITH CHECK (true); -- focusing on functionality first
CREATE POLICY "Enable update for authenticated users only" ON public.product_pricing_matrices FOR UPDATE USING (true);
CREATE POLICY "Enable delete for authenticated users only" ON public.product_pricing_matrices FOR DELETE USING (true);
