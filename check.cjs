const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    const { data, error } = await supabase.from('invoice_sequence').select('*');
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Sequence Data:', data);
    }
}
check();
