-- Function to search orders by order number, client name, OR product name (order item)
CREATE OR REPLACE FUNCTION search_orders(search_term text) RETURNS SETOF orders AS $$ BEGIN RETURN QUERY
SELECT o.*
FROM orders o
    JOIN clients c ON o.client_id = c.id
WHERE o.order_number ILIKE '%' || search_term || '%'
    OR c.name ILIKE '%' || search_term || '%' -- Check if any order item matches the search term
    OR EXISTS (
        SELECT 1
        FROM order_items oi
        WHERE oi.order_id = o.id
            AND oi.product_type ILIKE '%' || search_term || '%'
    )
ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql;