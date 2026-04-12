-- Add manual_unit_paint_price column to order_items
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS manual_unit_paint_price numeric(10, 4);

-- Comment for clarity
COMMENT ON COLUMN public.order_items.manual_unit_paint_price IS 'Manual override for paint price per individual sticker unit (for roll stickers)';
