import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkSettings() {
    const { data, error } = await supabase
        .from('SASKAITA123Data')
        .select('*')
        .single();

    if (error) {
        console.error('Error fetching settings:', error);
        return;
    }

    console.log('Current Saskaita123 Settings:');
    console.log(JSON.stringify(data, null, 2));
}

checkSettings();
