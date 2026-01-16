-- Drop table first to ensure we can recreate it with correct Foreign Keys
DROP TABLE IF EXISTS public.calculation_rules;

-- Re-create Calculation Rules Table with correct Foreign Key to Products
CREATE TABLE public.calculation_rules (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    rule_type text NOT NULL, -- 'Base Price per unit', 'Qty Multiplier', etc.
    name text NOT NULL,
    description text,
    priority integer DEFAULT 10,
    is_active boolean DEFAULT true,
    value numeric DEFAULT 0,
    product_id uuid REFERENCES public.products(id) ON DELETE SET NULL, -- Critical for 'products(name)' query
    lamination text,
    min_quantity integer,
    max_quantity integer,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.calculation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for authenticated users" ON public.calculation_rules
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
