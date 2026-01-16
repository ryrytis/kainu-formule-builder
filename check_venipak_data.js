import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkData() {
    const { data, error } = await supabase
        .from('venipak_pickup_points')
        .select('*')
        .ilike('pastomat_city', '%Gargždai%');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Results for Gargždai:');
        console.log(JSON.stringify(data, null, 2));
    }
}

checkData();
