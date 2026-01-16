import { createClient } from '@supabase/supabase-js';

export default async function handler(request, response) {
    // 1. CORS Headers
    response.setHeader('Access-Control-Allow-Credentials', true);
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    response.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );

    // Handle preflight
    if (request.method === 'OPTIONS') {
        response.status(200).end();
        return;
    }

    // 2. Initialize Supabase Admin Client
    // Note: VITE_ variables are usually for frontend, but we reuse the URL here.
    // SUPABASE_SERVICE_ROLE_KEY must be a backend secret.
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wnogzzwrsxlyowxwdciw.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseKey) {
        return response.status(500).json({ error: 'Server misconfiguration: Missing Service Role Key' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // 3. Handle GET (Fetch Client)
        if (request.method === 'GET') {
            const { clientId } = request.query;

            if (!clientId) {
                return response.status(400).json({ error: 'Missing clientId parameter' });
            }

            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .eq('id', clientId)
                .single();

            if (error) {
                console.error('Fetch Error:', error);
                // Return 404 if not found specifically
                if (error.code === 'PGRST116') {
                    return response.status(404).json({ error: 'Client not found' });
                }
                throw error;
            }

            return response.status(200).json(data);
        }

        // 4. Handle POST/PUT (Update Client)
        if (request.method === 'POST' || request.method === 'PUT') {
            const { clientId, ...updates } = request.body;

            if (!clientId) {
                return response.status(400).json({ error: 'Missing clientId in body' });
            }

            const { error } = await supabase
                .from('clients')
                .update(updates)
                .eq('id', clientId);

            if (error) throw error;

            return response.status(200).json({ success: true });
        }

        return response.status(405).json({ error: 'Method Not Allowed' });

    } catch (error) {
        console.error('Proxy Error:', error);
        return response.status(500).json({ error: error.message });
    }
}
