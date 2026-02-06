
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    const sbUrl = process.env.VITE_SUPABASE_URL;
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const openAi = process.env.OPENAI_API_KEY;

    const results = {
        env_vars: {
            VITE_SUPABASE_URL: sbUrl ? 'PRESENT' : 'MISSING',
            SUPABASE_SERVICE_ROLE_KEY: sbKey ? 'PRESENT' : 'MISSING',
            OPENAI_API_KEY: openAi ? 'PRESENT' : 'MISSING',
        },
        connection_test: 'PENDING'
    };

    try {
        if (!sbUrl || !sbKey) {
            results.connection_test = 'SKIPPED (Missing Creds)';
        } else {
            const supabase = createClient(sbUrl, sbKey);
            const { data, error } = await supabase.from('ai_knowledge').select('id').limit(1);

            if (error) {
                results.connection_test = 'FAILED: ' + error.message;
                results.error_details = error;
            } else {
                results.connection_test = 'SUCCESS';
                results.rows_found = data.length;
            }
        }
    } catch (e) {
        results.connection_test = 'CRASH: ' + e.message;
    }

    res.status(200).json(results);
}
