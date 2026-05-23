const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testClone() {
    // Grab a real order with items
    const { data: order, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .not('order_items', 'is', null)
        .limit(1)
        .single();

    if (error || !order) { console.error('No order found:', error); return; }

    console.log('Found order:', order.order_number);
    console.log('Items:', order.order_items?.length);
    if (order.order_items?.[0]) {
        console.log('Sample item keys:', Object.keys(order.order_items[0]));
    }

    // Try inserting a clone
    const { data: newOrder, error: orderErr } = await supabase
        .from('orders')
        .insert([{
            client_id: order.client_id,
            order_number: 'TEST-CLONE-' + Date.now(),
            status: 'New',
            total_price: order.total_price,
            notes: `Copy of ${order.order_number}`
        }])
        .select()
        .single();

    if (orderErr) { console.error('Order insert error:', orderErr); return; }
    console.log('New order created:', newOrder.id);

    if (order.order_items?.length > 0) {
        const items = order.order_items.map(item => ({
            order_id: newOrder.id,
            product_type: item.product_type,
            material_id: item.material_id,
            quantity: item.quantity,
            width: item.width,
            height: item.height,
            print_type: item.print_type,
            unit_price: item.unit_price,
            total_price: item.total_price,
            notes: item.notes,
            cost_price: item.cost_price,
        }));
        const { error: itemsErr } = await supabase.from('order_items').insert(items);
        if (itemsErr) { console.error('Items insert error:', itemsErr); }
        else console.log('Items cloned OK!');
    }

    // Cleanup
    await supabase.from('orders').delete().eq('id', newOrder.id);
    console.log('Test order cleaned up.');
}

testClone();
