require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
    const { data, error } = await supabase.from('SASKAITA123Data').select('*').limit(1).maybeSingle();
    console.log("SASKAITA123Data:", data);
}

run();
