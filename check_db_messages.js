
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wnogzzwrsxlyowxwdciw.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMessages() {
    const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Last 10 Messages:');
        data.forEach(msg => {
            console.log(`[${msg.created_at}] ${msg.role}: ${msg.content} (Session: ${msg.session_id})`);
        });
    }
}

checkMessages();
