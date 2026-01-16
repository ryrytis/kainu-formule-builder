
import { createClient } from '@supabase/supabase-client';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    try {
        const { data, error } = await supabase.from('venipak_settings').select('*').limit(1).maybeSingle();
        if (error) {
            console.error('Error fetching settings:', error);
            return;
        }
        if (!data) {
            console.log('No settings found in venipak_settings table.');
            return;
        }

        console.log('--- Venipak Settings Diagnostic ---');
        console.log('api_id:', data.api_id, '| Length:', data.api_id?.length);
        console.log('username:', data.username, '| Length:', data.username?.length);
        console.log('password prefix:', data.password?.substring(0, 3), '| Length:', data.password?.length);
        console.log('------------------------------------');
    } catch (err) {
        console.error('Try/Catch Error:', err);
    }
}

check();
