const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkTables() {
    const { data, error } = await supabase.from('products').select('*').limit(5);
    if (error) {
        console.error('Products error:', error);
    } else {
        console.log('Products sample:', data);
    }
    
    // Check schemas or other tables
    const { data: cat, error: cErr } = await supabase.from('categories').select('*').limit(5);
    if (cErr) console.error('Categories error:', cErr);
    else console.log('Categories sample:', cat);
}

checkTables();
