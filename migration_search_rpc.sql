-- Create a function to search order items with fuzzy matching
-- This avoids Client Side filtering and allows efficient database search
CREATE OR REPLACE FUNCTION search_order_items(
        search_term TEXT,
        limit_count INTEGER DEFAULT 10
    ) RETURNS TABLE (
        product_type TEXT,
        quantity INTEGER,
        unit_price NUMERIC,
        total_price NUMERIC,
        created_at TIMESTAMPTZ
    ) LANGUAGE plpgsql SECURITY DEFINER -- Use security definer to bypass RLS if needed, OR ensure RLS allows reading order_items (which might contain sensitive data, but we only return price info)
    AS $$ BEGIN RETURN QUERY
SELECT oi.product_type,
    oi.quantity,
    oi.unit_price,
    oi.total_price,
    oi.created_at
FROM order_items oi
WHERE oi.product_type ILIKE '%' || search_term || '%'
    AND oi.unit_price > 0 -- Exclude free items or errors
ORDER BY oi.created_at DESC
LIMIT limit_count;
END;
$$;