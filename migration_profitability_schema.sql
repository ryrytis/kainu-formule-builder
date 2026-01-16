-- Ensure print_options exists (it seems missing in some envs)
CREATE TABLE IF NOT EXISTS "print_options" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "print_option" text NOT NULL,
    "price" numeric NOT NULL,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    "print_option_name" text
);
-- Add Cost Price to Catalog Tables
ALTER TABLE "materials"
ADD COLUMN IF NOT EXISTS "cost_price" numeric(10, 4) DEFAULT 0;
ALTER TABLE "works"
ADD COLUMN IF NOT EXISTS "cost_price" numeric(10, 4) DEFAULT 0;
ALTER TABLE "print_options"
ADD COLUMN IF NOT EXISTS "cost_price" numeric(10, 4) DEFAULT 0;
-- Add Cost Tracking to Order Items
ALTER TABLE "order_items"
ADD COLUMN IF NOT EXISTS "cost_price" numeric(10, 4) DEFAULT 0;
ALTER TABLE "order_items"
ADD COLUMN IF NOT EXISTS "item_works" jsonb DEFAULT '[]'::jsonb;
-- Stores array of { name, duration, cost }
ALTER TABLE "order_items"
ADD COLUMN IF NOT EXISTS "margin_percent" numeric(10, 2) DEFAULT 0;
-- Add Cost Tracking to Orders
ALTER TABLE "orders"
ADD COLUMN IF NOT EXISTS "total_cost" numeric(10, 2) DEFAULT 0;
ALTER TABLE "orders"
ADD COLUMN IF NOT EXISTS "profit_margin" numeric(10, 2) DEFAULT 0;