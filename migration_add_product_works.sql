-- Create Product Works table to link Products with default Works
CREATE TABLE IF NOT EXISTS "product_works" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
    "work_id" uuid NOT NULL REFERENCES "works"("id") ON DELETE CASCADE,
    "default_quantity" numeric NOT NULL DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT now(),
    UNIQUE("product_id", "work_id")
);
-- RLS Policies (Open for now as per other tables, or matched?)
-- Assuming public access or existing RLS logic handles generic tables. 
-- If RLS is enabled globally, we might need policy. 
-- checking schema.sql, most tables don't show explicit POLICY creation in the dump, 
-- but users table has RLS usually. 
-- For now, we'll just create the table.