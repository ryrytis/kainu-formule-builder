import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const res = await supabase.from('materials').select('category');
const cats = [...new Set(res.data?.map(d=>d.category))].filter(Boolean);
console.log('CATEGORIES:', cats);
