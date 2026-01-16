import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getApiKey() {
    const { data, error } = await supabase
        .from('SASKAITA123Data')
        .select('internal_api_key')
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('Error fetching API key:', error.message);
        process.exit(1);
    }

    if (!data?.internal_api_key) {
        console.error('No internal API key found in SASKAITA123Data table.');
        process.exit(1);
    }

    console.log(data.internal_api_key);
}

getApiKey();
