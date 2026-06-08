import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // ─── GET: Fetch Portal Data ───────────────────────────────────────────
        if (req.method === 'GET') {
            if (req.query.action === 'ai_usage') {
                const { data, error } = await supabase
                    .from('ai_usage_logs')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(1000);
                if (error) throw error;
                return res.status(200).json(data);
            }

            const { clientId } = req.query;
            if (!clientId) return res.status(400).json({ error: 'Missing clientId' });

            const { data: client, error: clientError } = await supabase
                .from('clients')
                .select('id, name, company, price_list_id')
                .eq('id', clientId)
                .maybeSingle();
            
            if (clientError) throw clientError;
            if (!client) return res.status(404).json({ error: 'Client not found' });

            const { data: orders, error: ordersError } = await supabase
                .from('orders')
                .select('id, order_number, status, total_price, created_at, order_items (*)')
                .eq('client_id', clientId)
                .order('created_at', { ascending: false });

            if (ordersError) throw ordersError;

            let priceListItems = [];
            if (client.price_list_id) {
                const { data: items } = await supabase
                    .from('price_list_items')
                    .select('id, product_id, custom_base_price, products (name)')
                    .eq('price_list_id', client.price_list_id);
                priceListItems = items || [];
            }

            return res.status(200).json({ client, orders, price_list_items: priceListItems });
        }

        // ─── POST: Submit Order ───────────────────────────────────────────────
        if (req.method === 'POST') {
            const { clientId, items, notes } = req.body;
            if (!clientId || !items || !Array.isArray(items)) {
                return res.status(400).json({ error: 'Missing clientId or items' });
            }

            const { data: client, error: clientErr } = await supabase
                .from('clients')
                .select('id, name, email')
                .eq('id', clientId)
                .maybeSingle();

            if (clientErr || !client) return res.status(404).json({ error: 'Client not found' });

            const { data: orderNumber } = await supabase.rpc('generate_order_number');
            const finalOrderNumber = orderNumber || `WEB-${Date.now().toString().slice(-6)}`;

            const totalPrice = items.reduce((sum, item) => sum + (item.total_price || 0), 0);
            const { data: order, error: orderErr } = await supabase
                .from('orders')
                .insert([{
                    client_id: clientId,
                    order_number: finalOrderNumber,
                    status: 'New',
                    total_price: totalPrice,
                    notes: `[Portal Order] ${notes || ''}`
                }])
                .select('id')
                .single();

            if (orderErr) throw orderErr;

            const orderItems = items.map(item => ({
                order_id: order.id,
                product_type: item.product_name || 'Portal Item',
                quantity: item.quantity,
                unit_price: item.unit_price,
                total_price: item.total_price,
                material_id: item.material_id || null,
                width: item.width || null,
                height: item.height || null,
                depth: item.length || null,
                print_type: item.print_type || null,
                lamination: item.lamination || null,
                specifications: {
                    width: item.width,
                    height: item.height,
                    length: item.length,
                    lamination: item.lamination,
                    source: 'client_portal'
                }
            }));

            const { error: itemsErr } = await supabase.from('order_items').insert(orderItems);
            if (itemsErr) throw itemsErr;

            return res.status(200).json({ success: true, order_number: finalOrderNumber });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (error) {
        console.error('Portal Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
