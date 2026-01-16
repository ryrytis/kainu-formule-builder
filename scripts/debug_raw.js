import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function debugRaw() {
    const { data: dbSettings } = await supabase.from('SASKAITA123Data').select('*').limit(1).single();
    if (!dbSettings) {
        console.error('Settings not found');
        return;
    }
    const apiKey = dbSettings.apiKey;
    const SASK_BASE = 'https://app.invoice123.com/api/v1.0';

    const url = `${SASK_BASE}/clients?page=1&limit=5`;
    console.log(`Testing URL: ${url}`);

    try {
        const resp = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json'
            }
        });

        const data = await resp.json();
        const output = JSON.stringify(data, null, 2);
        console.log('Raw Response:', output);
        fs.writeFileSync('scripts/raw_response.json', output);
    } catch (err) {
        console.error('Fetch error:', err.message);
    }
}

debugRaw();
