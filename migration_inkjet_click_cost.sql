-- ============================================================
-- Migration: Inkjet Click Cost + Material Condition on Rules
-- Canon GP-4600s Skaitiklis A-E pricing support
-- ============================================================

-- 1. Add material condition columns to calculation_rules
ALTER TABLE public.calculation_rules ADD COLUMN IF NOT EXISTS material_id uuid REFERENCES public.materials(id);
ALTER TABLE public.calculation_rules ADD COLUMN IF NOT EXISTS material_ids uuid[];

-- 2. Add inkjet counter level (A/B/C/D/E) to calculation_rules
ALTER TABLE public.calculation_rules ADD COLUMN IF NOT EXISTS inkjet_counter text;

-- 3. Add click_cost_per_m2 reference field to materials (informational)
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS click_cost_per_m2 numeric;

-- 4. Add allowed_material_ids to products (for restricting material dropdown per product)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS allowed_material_ids uuid[];
