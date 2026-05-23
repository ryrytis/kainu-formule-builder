-- ============================================================
-- Migration: Add Material Dimensions (Width and Height in mm)
-- ============================================================

-- 1. Add nullable integer columns for width and height in mm
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS width integer;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS height integer;

-- 2. Seed default dimensions for existing materials

-- Roll Sticker Materials (width 125mm, continuous height)
UPDATE public.materials 
SET width = 125, height = NULL 
WHERE category = 'Rulonai' 
   OR name ILIKE '%125%' 
   OR name ILIKE '%inkjet%';

-- Canon Premium Coated / Large format (width 1067mm, continuous height)
UPDATE public.materials 
SET width = 1067, height = NULL 
WHERE name ILIKE '%Canon Premium Coated%'
   OR name ILIKE '%Plotis 1,067m%';

-- Sticker sheet materials (width 295mm, height 400mm)
UPDATE public.materials 
SET width = 295, height = 400 
WHERE category = 'Sticker' 
   AND width IS NULL;

-- Standard Paper, Cardboard, Decorative, and other sheet materials (SRA3: 320x450mm)
UPDATE public.materials 
SET width = 320, height = 450 
WHERE (category IN ('Paper', 'Cardboard', 'Decorative', 'Plates') OR category IS NULL)
   AND width IS NULL;

-- Default fallback for any remaining materials that are not rolls (pcs unit)
UPDATE public.materials
SET width = 320, height = 450
WHERE width IS NULL 
  AND unit = 'pcs';
