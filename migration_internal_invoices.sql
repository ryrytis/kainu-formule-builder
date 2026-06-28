-- Create Internal Invoices Table
CREATE TABLE IF NOT EXISTS public.internal_invoices (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
    invoice_number text NOT NULL UNIQUE,
    issue_date timestamp with time zone DEFAULT now(),
    due_date timestamp with time zone,
    status text NOT NULL DEFAULT 'Issued',
    subtotal numeric(10,2) DEFAULT 0,
    vat_amount numeric(10,2) DEFAULT 0,
    total numeric(10,2) DEFAULT 0,
    client_snapshot jsonb NOT NULL,
    items_snapshot jsonb NOT NULL,
    pdf_url text,
    created_at timestamp with time zone DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.internal_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all authenticated users" 
ON public.internal_invoices FOR SELECT 
TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" 
ON public.internal_invoices FOR INSERT 
TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" 
ON public.internal_invoices FOR UPDATE 
TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete access for authenticated users" 
ON public.internal_invoices FOR DELETE 
TO authenticated USING (true);

-- Create a small table for the sequence to make it robust, or we can just use a postgres sequence.
-- Using a dedicated sequence table is often safer if we might want to change prefixes easily in the UI later.
CREATE TABLE IF NOT EXISTS public.invoice_settings (
    id integer PRIMARY KEY DEFAULT 1,
    prefix text NOT NULL DEFAULT '4P',
    current_number integer NOT NULL DEFAULT 935
);

-- Insert default row if not exists
INSERT INTO public.invoice_settings (id, prefix, current_number)
VALUES (1, '4P', 935)
ON CONFLICT (id) DO NOTHING;

-- RLS for settings
ALTER TABLE public.invoice_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for authenticated users" 
ON public.invoice_settings FOR SELECT 
TO authenticated USING (true);

CREATE POLICY "Enable update for authenticated users" 
ON public.invoice_settings FOR UPDATE 
TO authenticated USING (true) WITH CHECK (true);

-- Function to safely generate the next invoice number
CREATE OR REPLACE FUNCTION generate_next_invoice_number()
RETURNS text AS $$
DECLARE
    next_num integer;
    pref text;
    result_text text;
BEGIN
    -- Lock the row to prevent race conditions
    SELECT current_number + 1, prefix INTO next_num, pref
    FROM public.invoice_settings
    WHERE id = 1
    FOR UPDATE;

    -- Update the table
    UPDATE public.invoice_settings
    SET current_number = next_num
    WHERE id = 1;

    -- Format with leading zeros (e.g., 4P00936)
    result_text := pref || LPAD(next_num::text, 5, '0');
    
    RETURN result_text;
END;
$$ LANGUAGE plpgsql;
