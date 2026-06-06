import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data: g, error: ge } = await supabase.from('graph_settings').select('*');
    console.log('Graph Settings:', g, ge);
    const { data: e, error: ee } = await supabase.from('email_monitors').select('*');
    console.log('Email Monitors:', e, ee);
}

check();
