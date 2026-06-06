import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
    const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);
    const { data, error } = await supabase.from('products').select('id, name, slug');
    console.log(data);
    if (error) console.error(error);
}
check();
