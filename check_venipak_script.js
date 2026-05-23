import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
   console.error("Missing env vars");
   process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('--- Searching lockers with "Plieno" or "AIBE" ---');
    const { data: terms } = await supabase
        .from('VenipackPickupPoints')
        .select('*')
        .ilike('pastomat_city', '%Klaip%')
        .ilike('name', '%Plieno%');
    console.log(terms);

    const { data: terms2 } = await supabase
        .from('VenipackPickupPoints')
        .select('*')
        .ilike('pastomat_city', '%Klaip%')
        .ilike('name', '%AIB%');
    console.log(terms2);
    
    console.log('\n--- Recent Orders with lockers ---');
    const { data: orders } = await supabase
        .from('orders')
        .select('order_number, clients(name, city, parcel_locker)')
        .not('clients', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);
        
    console.log(JSON.stringify(orders.filter(o => o.clients?.parcel_locker), null, 2));

}

check();
