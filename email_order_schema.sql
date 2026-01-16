-- Helper function to generate the next order number (YYYY-XXXX)
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_year TEXT;
    v_last_order_number TEXT;
    v_new_sequence INT;
    v_new_order_number TEXT;
BEGIN
    v_year := to_char(NOW(), 'YYYY');
    
    -- Find the last order number for the current year
    -- Assumes format YYYY-XXXX
    SELECT order_number INTO v_last_order_number
    FROM orders
    WHERE order_number LIKE v_year || '-%'
    ORDER BY created_at DESC, id DESC
    LIMIT 1;

    IF v_last_order_number IS NULL THEN
        -- No orders for this year, start with 1001
        v_new_order_number := v_year || '-1001';
    ELSE
        -- Extract sequence part (everything after '-')
        BEGIN
            v_new_sequence := substring(v_last_order_number FROM position('-' in v_last_order_number) + 1)::INT + 1;
            v_new_order_number := v_year || '-' || v_new_sequence;
        EXCEPTION WHEN OTHERS THEN
            -- Fallback if parsing fails
            v_new_order_number := v_year || '-1001';
        END;
    END IF;

    RETURN v_new_order_number;
END;
$$;

-- API Function to create order WITH items (Power Automate)
-- Uses generate_order_number() for consistency
CREATE OR REPLACE FUNCTION create_order_with_items(
    p_client_id UUID,
    p_subject TEXT,
    p_items JSONB DEFAULT '[]'::jsonb
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_order_number TEXT;
    v_order_id UUID;
    v_item JSONB;
    v_total_price NUMERIC := 0;
    v_item_total NUMERIC;
BEGIN
    -- 1. Generate Order Number
    v_new_order_number := generate_order_number();

    -- 2. Create Order Header
    INSERT INTO orders (
        client_id,
        order_number,
        status,
        notes,
        created_at,
        updated_at,
        total_price,
        invoiced,
        shipped
    )
    VALUES (
        p_client_id,
        v_new_order_number,
        'Email Inquiry',
        p_subject,
        NOW(),
        NOW(),
        0,
        false,
        false
    )
    RETURNING id INTO v_order_id;

    -- 3. Process Items
    IF jsonb_array_length(p_items) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
        LOOP
            v_item_total := COALESCE((v_item->>'total_price')::NUMERIC, 0);
            v_total_price := v_total_price + v_item_total;

            INSERT INTO order_items (
                order_id,
                product_type,
                quantity,
                width,
                height,
                unit_price,
                total_price,
                print_type,
                material_id
            )
            VALUES (
                v_order_id,
                v_item->>'product_type',
                (v_item->>'quantity')::INTEGER,
                (v_item->>'width')::INTEGER,
                (v_item->>'height')::INTEGER,
                (v_item->>'unit_price')::NUMERIC,
                v_item_total,
                v_item->>'print_type',
                v_item->>'material_id'
            );
        END LOOP;

        -- 4. Update Order Total
        UPDATE orders 
        SET total_price = v_total_price 
        WHERE id = v_order_id;
    END IF;

    -- 5. Return Result
    RETURN json_build_object(
        'success', true,
        'order_id', v_order_id,
        'order_number', v_new_order_number,
        'total_price', v_total_price,
        'message', 'Order and items created successfully'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;
