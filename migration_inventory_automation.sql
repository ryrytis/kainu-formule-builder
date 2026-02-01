-- 1. Create table to log material usage
CREATE TABLE IF NOT EXISTS material_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID REFERENCES materials(id),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    quantity_used NUMERIC NOT NULL,
    unit TEXT,
    -- 'm2' or 'units'
    used_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);
-- 2. Function to handle stock deduction
CREATE OR REPLACE FUNCTION handle_inventory_deduction() RETURNS TRIGGER AS $$
DECLARE item RECORD;
mat RECORD;
usage_amount NUMERIC;
item_unit TEXT;
BEGIN -- Only run when status changes TO 'Completed' or 'Shipped'
-- AND wasn't already in one of those states (to prevent double deduction on minor updates)
IF (NEW.status IN ('Completed', 'Shipped'))
AND (OLD.status NOT IN ('Completed', 'Shipped')) THEN -- Loop through order items for this order
FOR item IN
SELECT *
FROM order_items
WHERE order_id = NEW.id LOOP IF item.material_id IS NOT NULL THEN -- Get material details
SELECT * INTO mat
FROM materials
WHERE id = (item.material_id)::uuid;
IF mat IS NOT NULL THEN usage_amount := 0;
item_unit := mat.unit;
-- Logic: If material unit is 'm2', calculate area. Else assume simple quantity.
-- Note: Database doesn't strictly enforce 'm2' string, checking common variations or default behavior
IF mat.unit = 'm2'
OR mat.unit = 'sqm' THEN -- Calculate area in square meters. 
-- item.width and item.height are usually in mm.
-- Area = (width/1000) * (height/1000) * quantity
usage_amount := (COALESCE(item.width::numeric, 0) / 1000.0) * (COALESCE(item.height::numeric, 0) / 1000.0) * item.quantity;
ELSE -- Default to simple quantity deduction (e.g. 'vnt', 'pcs')
usage_amount := item.quantity;
END IF;
-- 1. Deduct from current_stock
UPDATE materials
SET current_stock = COALESCE(current_stock, 0) - usage_amount,
    updated_at = NOW()
WHERE id = mat.id;
-- 2. Log usage
INSERT INTO material_usage_logs (
        material_id,
        order_id,
        quantity_used,
        unit,
        notes
    )
VALUES (
        mat.id,
        NEW.id,
        usage_amount,
        item_unit,
        'Auto-deduction trigger'
    );
END IF;
END IF;
END LOOP;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- 3. Create Trigger
DROP TRIGGER IF EXISTS tr_inventory_deduction ON orders;
CREATE TRIGGER tr_inventory_deduction
AFTER
UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION handle_inventory_deduction();
-- 4. Reporting Function for Accountant
CREATE OR REPLACE FUNCTION get_monthly_material_usage(
        start_date TIMESTAMPTZ DEFAULT (date_trunc('month', now())),
        end_date TIMESTAMPTZ DEFAULT (date_trunc('month', now()) + interval '1 month')
    ) RETURNS TABLE (
        material_name TEXT,
        total_used NUMERIC,
        unit TEXT,
        usage_count BIGINT
    ) AS $$ BEGIN RETURN QUERY
SELECT m.name as material_name,
    SUM(l.quantity_used) as total_used,
    MAX(l.unit) as unit,
    -- Just take one of the units (they should be consistent per material)
    COUNT(l.id) as usage_count
FROM material_usage_logs l
    JOIN materials m ON l.material_id = m.id
WHERE l.used_at >= start_date
    AND l.used_at < end_date
GROUP BY m.id,
    m.name
ORDER BY total_used DESC;
END;
$$ LANGUAGE plpgsql;