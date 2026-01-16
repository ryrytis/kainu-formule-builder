CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_year_short text;
    last_order_number text;
    last_sequence integer;
    new_sequence integer;
    new_order_number text;
BEGIN
    -- Get current year (YY)
    current_year_short := to_char(now(), 'YY');

    -- Find the last order number matching the pattern ORD-YY-%
    SELECT order_number INTO last_order_number
    FROM orders
    WHERE order_number LIKE 'ORD-' || current_year_short || '-%'
    ORDER BY created_at DESC
    LIMIT 1;

    IF last_order_number IS NULL THEN
        -- No orders for this year, start at 1001
        new_sequence := 1001;
    ELSE
        -- Extract the sequence part (everything after the last dash)
        -- Format: ORD-26-1001
        last_sequence := cast(split_part(last_order_number, '-', 3) as integer);
        new_sequence := last_sequence + 1;
    END IF;

    -- Format the new order number
    new_order_number := 'ORD-' || current_year_short || '-' || new_sequence;

    RETURN new_order_number;
END;
$$;
