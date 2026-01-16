
const { createClient } = require('@supabase/supabase-client');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    const { data, error } = await supabase.from('venipak_settings').select('*').limit(1).maybeSingle();
    if (error) {
        console.error('Error:', error);
        return;
    }
    if (!data) {
        console.log('No settings found');
        return;
    }

    console.log('api_id:', data.api_id, '| Length:', data.api_id?.length);
    console.log('username:', data.username, '| Length:', data.username?.length);
    console.log('password partially:', data.password?.substring(0, 2) + '...', '| Length:', data.password?.length);
}

check();
