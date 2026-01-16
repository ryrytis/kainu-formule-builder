import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // 1. Basic Setup & CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    console.log('API Request Received: POST /api/create_order');

    try {
        // 2. Environment Variable Validation
        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return res.status(500).json({
                error: 'Configuration Error',
                details: { url: !!supabaseUrl, key: !!supabaseKey },
                hint: 'Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in Vercel.'
            });
        }

        // 3. Body Validation
        const body = req.body;
        if (!body || typeof body !== 'object') {
            return res.status(400).json({ error: 'Invalid JSON body', received: typeof body });
        }

        const { client, items, status = 'New', notes = '' } = body;
        if (!client?.email || !items || !Array.isArray(items)) {
            return res.status(400).json({ error: 'Missing client email or items array' });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // 4. Security Check (Fetch from DB)
        // We select everything to verify connection
        const { data: config, error: configError } = await supabase
            .from('SASKAITA123Data')
            .select('*')
            .limit(1)
            .maybeSingle();

        if (configError) {
            return res.status(500).json({
                error: 'Database Connection Error',
                details: configError.message,
                hint: 'Can the Service Role key access SASKAITA123Data? Is the table name correct?'
            });
        }

        const providedKey = req.headers['x-api-key'] || req.headers['X-API-Key'];
        if (!config?.internal_api_key || providedKey !== config.internal_api_key) {
            return res.status(401).json({
                error: 'Unauthorized',
                match: !!(config?.internal_api_key && providedKey === config.internal_api_key)
            });
        }

        // 5. Client Resolution
        const { data: clientMatches, error: lookupError } = await supabase
            .from('clients')
            .select('id')
            .eq('email', client.email)
            .order('created_at', { ascending: false })
            .limit(1);

        const existingClient = clientMatches?.[0];

        if (lookupError) throw new Error(`Client lookup failed: ${lookupError.message}`);

        let clientId;
        if (existingClient) {
            clientId = existingClient.id;
        } else {
            const { data: newClient, error: clientError } = await supabase
                .from('clients')
                .insert([{
                    name: client.name || client.email.split('@')[0],
                    email: client.email,
                    form_link_status: 'pending'
                }])
                .select('id')
                .single();

            if (clientError) throw new Error(`Client creation failed: ${clientError.message}`);
            clientId = newClient.id;

            // Trigger Welcome Email (Non-blocking)
            triggerWelcomeEmail(supabase, client.name, client.email).catch(e => console.error('Welcome Email Error:', e));
        }

        // 6. Order Number Generation
        const orderNumber = await generateOrderNumber(supabase);

        // 7. Order Creation
        const totalPrice = items.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);

        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert([{
                client_id: clientId,
                order_number: orderNumber,
                status: status,
                total_price: totalPrice,
                notes: notes
            }])
            .select('id')
            .single();

        if (orderError) throw new Error(`Order creation failed: ${orderError.message}`);

        // 8. Order Items Insertion
        const orderItems = items.map(item => ({
            order_id: order.id,
            material_id: item.material_id || null,
            product_type: item.product_type || 'Custom',
            quantity: item.quantity || 1,
            unit_price: item.unit_price || 0,
            total_price: item.total_price || 0,
            specifications: item.specifications || {}
        }));

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems);

        if (itemsError) throw new Error(`Items creation failed: ${itemsError.message}`);

        // 9. SharePoint Webhook (Non-blocking)
        triggerSharePointWebhook(supabase, client.name || client.email, orderNumber, status).catch(e => console.error('SharePoint Error:', e));

        return res.status(200).json({
            success: true,
            order_id: order.id,
            order_number: orderNumber,
            client_id: clientId
        });

    } catch (error) {
        console.error('API Error:', error.message);
        return res.status(500).json({
            error: 'Server Error during processing',
            message: error.message
        });
    }
}

async function generateOrderNumber(supabase) {
    try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('generate_order_number');
        if (!rpcError && rpcData) return rpcData;

        const date = new Date();
        const yearShort = date.getFullYear().toString().slice(-2);
        const prefix = `ORD-${yearShort}-`;

        const { data: lastOrder } = await supabase
            .from('orders')
            .select('order_number')
            .like('order_number', `${prefix}%`)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (!lastOrder) return `${prefix}1001`;

        const parts = lastOrder.order_number.split('-');
        if (parts.length === 3) {
            const sequence = parseInt(parts[2], 10);
            return `${prefix}${sequence + 1}`;
        }
        return `${prefix}1001`;
    } catch (e) {
        const yearShort = new Date().getFullYear().toString().slice(-2);
        return `ORD-${yearShort}-${Math.floor(1000 + Math.random() * 9000)}`;
    }
}

async function triggerWelcomeEmail(supabase, name, email) {
    const { data: settings } = await supabase
        .from('SASKAITA123Data')
        .select('webhook_client_form, enable_client_form')
        .limit(1)
        .maybeSingle();

    if (settings?.enable_client_form && settings.webhook_client_form) {
        await fetch(settings.webhook_client_form, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'new_client',
                email: email,
                name: name,
                source: 'api_creation'
            })
        });
    }
}

async function triggerSharePointWebhook(supabase, clientName, orderNo, status) {
    const { data: settings } = await supabase
        .from('SASKAITA123Data')
        .select('webhook_sharepoint, enable_sharepoint')
        .limit(1)
        .maybeSingle();

    if (settings?.enable_sharepoint && settings.webhook_sharepoint) {
        await fetch(settings.webhook_sharepoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clientName,
                orderNo,
                status
            })
        });
    }
}
