import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const res = await supabase.from('materials').select('name').ilike('name', '%inkjet%');
console.log('INKJET MATERIALS:');
console.log(res.data?.map(d => d.name));
