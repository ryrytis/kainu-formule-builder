-- Add product_category column to calculation_rules table
-- This enables rules to be applied to entire categories of products

ALTER TABLE public.calculation_rules 
ADD COLUMN IF NOT EXISTS product_category TEXT;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_calculation_rules_product_category 
ON public.calculation_rules(product_category);
