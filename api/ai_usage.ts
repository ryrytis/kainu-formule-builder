import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return res.status(500).json({ error: 'Missing Supabase admin credentials' });
        }

        const supabase = createClient(supabaseUrl.trim(), supabaseKey.trim());

        const { data, error } = await supabase
            .from('ai_usage_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1000);

        if (error) {
            throw error;
        }

        return res.status(200).json(data);
    } catch (globalError: any) {
        console.error('API /ai_usage Error:', globalError);
        return res.status(500).json({ error: globalError.message });
    }
}
