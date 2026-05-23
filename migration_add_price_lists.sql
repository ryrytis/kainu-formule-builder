-- Create price_lists table
CREATE TABLE IF NOT EXISTS public.price_lists (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create price_list_items table
CREATE TABLE IF NOT EXISTS public.price_list_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    price_list_id UUID REFERENCES public.price_lists(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    custom_base_price NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(price_list_id, product_id)
);

-- Add price_list_id to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS price_list_id UUID REFERENCES public.price_lists(id) ON DELETE SET NULL;

-- Set up RLS for price_lists
ALTER TABLE public.price_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to authenticated users on price_lists"
    ON public.price_lists
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Set up RLS for price_list_items
ALTER TABLE public.price_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to authenticated users on price_list_items"
    ON public.price_list_items
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_price_lists') THEN
        CREATE TRIGGER set_updated_at_price_lists
            BEFORE UPDATE ON public.price_lists
            FOR EACH ROW
            EXECUTE FUNCTION public.handle_updated_at();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_price_list_items') THEN
        CREATE TRIGGER set_updated_at_price_list_items
            BEFORE UPDATE ON public.price_list_items
            FOR EACH ROW
            EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END $$;
