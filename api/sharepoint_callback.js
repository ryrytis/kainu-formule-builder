import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // CORS wrappers if needed (Vercel usually handles this, but good to be safe for cross-origin callbacks)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl) {
            return res.status(500).json({ error: 'supabaseUrl is required. Check environment variables.' });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Security Check (Fetch from DB)
        const { data: config } = await supabase
            .from('SASKAITA123Data')
            .select('internal_api_key')
            .limit(1)
            .maybeSingle();

        const providedKey = req.headers['x-api-key'];
        if (!config?.internal_api_key || providedKey !== config.internal_api_key) {
            return res.status(401).json({ error: 'Unauthorized: Invalid or missing X-API-Key' });
        }

        const { order_number, sharepoint_link } = req.body;

        if (!order_number || !sharepoint_link) {
            return res.status(400).json({ error: 'Missing order_number or sharepoint_link' });
        }

        // Update the order
        const { data, error } = await supabase
            .from('orders')
            .update({ workflow_link: sharepoint_link })
            .eq('order_number', order_number)
            .select();

        if (error) throw error;

        return res.status(200).json({ success: true, message: 'Link updated', data });

    } catch (error) {
        console.error('Error updating order:', error);
        return res.status(500).json({ error: error.message });
    }
}
