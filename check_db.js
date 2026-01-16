import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkProducts() {
    console.log('Checking products table...');
    const { data, error } = await supabase.from('products').select('*').limit(1);
    if (error) {
        console.error('Error fetching products:', error);
    } else {
        console.log('Successfully fetched products (or empty):', data);

        // Check columns
        const { data: cols, error: colError } = await supabase.rpc('get_table_columns', { table_name: 'products' });
        if (colError) {
            // If RPC missing, try another way or just try to insert a test record with a potential new column
            console.log('RPC get_table_columns missing or failed. Trying to insert test record...');
            const { error: insError } = await supabase.from('products').insert([{ name: 'Test' }]);
            if (insError) console.error('Insert test failed:', insError);
            else console.log('Insert test succeeded.');
        } else {
            console.log('Columns:', cols);
        }
    }
}

checkProducts();
