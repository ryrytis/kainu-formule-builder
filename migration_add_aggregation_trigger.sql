-- Function to recalculate Order totals (Price, Cost, Margin)
CREATE OR REPLACE FUNCTION update_order_totals() RETURNS TRIGGER AS $$
DECLARE _order_id UUID;
_total_price NUMERIC(10, 2);
_total_cost NUMERIC(10, 2);
BEGIN -- Determine relevant order_id
IF (TG_OP = 'DELETE') THEN _order_id := OLD.order_id;
ELSE _order_id := NEW.order_id;
END IF;
-- Calculate sums
SELECT COALESCE(SUM(total_price), 0),
    COALESCE(SUM(cost_price), 0) -- Note: using cost_price column from items. Wait, item total cost is needed?
    -- schema says order_items has cost_price (numeric 10,4). Is that unit cost or total cost? 
    -- Naming convention usually: unit_price = 1 item, total_price = Qty * Unit.
    -- We added 'cost_price' to order_items. It should likely be the TOTAL cost for the line item to keep things simple, 
    -- OR we need to know if it's unit cost. 
    -- In PricingService, we returned total_cost. 
    -- Let's assume order_items.cost_price IS the total cost for that line (like total_price).
    -- Re-checking schema: "ADD COLUMN cost_price numeric(10, 4)"
    -- In CreateOrderItemModal, we saved `cost_price: totalCost`. 
    -- So Yes, cost_price column holds the total cost Amount for the line item.
    INTO _total_price,
    _total_cost
FROM order_items
WHERE order_id = _order_id;
-- Update Order
UPDATE orders
SET total_price = _total_price,
    total_cost = _total_cost,
    profit_margin = CASE
        WHEN _total_price > 0 THEN ((_total_price - _total_cost) / _total_price) * 100
        ELSE 0
    END,
    updated_at = now()
WHERE id = _order_id;
RETURN NULL;
END;
$$ LANGUAGE plpgsql;
-- Create Trigger (Run after Insert/Update/Delete on order_items)
DROP TRIGGER IF EXISTS update_order_totals_trigger ON order_items;
CREATE TRIGGER update_order_totals_trigger
AFTER
INSERT
    OR
UPDATE
    OR DELETE ON order_items FOR EACH ROW EXECUTE FUNCTION update_order_totals();
-- Backfill: Force update all orders to ensure consistent totals immediately
UPDATE order_items
SET id = id;
-- This dummy update fires the trigger for all items? 
-- Better: run the logic for all orders directly once.
DO $$
DECLARE r RECORD;
BEGIN FOR r IN
SELECT id
FROM orders LOOP -- Just touching the order isn't enough, we need to sum items.
    -- Let's run a manual update queries for backfill
UPDATE orders o
SET total_price = (
        SELECT COALESCE(SUM(total_price), 0)
        FROM order_items
        WHERE order_id = o.id
    ),
    total_cost = (
        SELECT COALESCE(SUM(cost_price), 0)
        FROM order_items
        WHERE order_id = o.id
    )
WHERE id = r.id;
-- Update margin
UPDATE orders
SET profit_margin = CASE
        WHEN total_price > 0 THEN ((total_price - total_cost) / total_price) * 100
        ELSE 0
    END
WHERE id = r.id;
END LOOP;
END;
$$;