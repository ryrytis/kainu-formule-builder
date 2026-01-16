import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function debugSearch() {
    const { data: dbSettings } = await supabase.from('SASKAITA123Data').select('*').limit(1).single();
    if (!dbSettings) {
        console.error('Settings not found');
        return;
    }
    const apiKey = dbSettings.apiKey;
    const SASK_BASE = 'https://app.invoice123.com/api/v1.0';

    const testCases = [
        { name: 'Standard Search by Code (code=555555)', params: 'code=555555&page=1&limit=20' },
        { name: 'Standard Search by Name (name=API+Test+Buyer)', params: 'name=API+Test+Buyer&page=1&limit=20' },
        { name: 'UI-like Search (flt_title=API+Test+Buyer)', params: 'flt_title=API+Test+Buyer&per_page=20' },
        { name: 'UI-like Search (flt_code=555555)', params: 'flt_code=555555&per_page=20' },
        { name: 'Partial Name Search (flt_title=api)', params: 'flt_title=api&per_page=20' }
    ];

    let log = '';
    const addLog = (msg) => {
        console.log(msg);
        log += msg + '\n';
    };

    for (const test of testCases) {
        addLog(`\n--- Testing: ${test.name} ---`);
        const url = `${SASK_BASE}/clients?${test.params}`;
        addLog(`URL: ${url}`);

        try {
            const resp = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Accept': 'application/json'
                }
            });

            const data = await resp.json();
            // The structure is data.result based on debug_raw
            const results = data.data?.result || data.data || [];

            addLog(`Found ${results.length || 0} results.`);
            if (results.length > 0) {
                results.forEach((c, idx) => {
                    addLog(`Match ${idx + 1}: ID=${c.id}, Name="${c.name}", Code="${c.code}"`);
                });
            }
        } catch (err) {
            addLog(`Fetch error: ${err.message}`);
        }
    }

    fs.writeFileSync('scripts/search_debug_v2.txt', log);
}

debugSearch();
