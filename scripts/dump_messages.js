// Dump chat messages to file for analysis
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function dumpMessages() {
    const { data: messages } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

    fs.writeFileSync('chat_messages_dump.json', JSON.stringify(messages, null, 2));
    console.log(`Dumped ${messages?.length || 0} messages to chat_messages_dump.json`);

    // Also get system prompt
    const { data: systemRules } = await supabase
        .from('ai_knowledge')
        .select('*')
        .eq('category', 'SYSTEM')
        .eq('is_active', true);

    fs.writeFileSync('system_rules_dump.json', JSON.stringify(systemRules, null, 2));
    console.log(`Dumped ${systemRules?.length || 0} SYSTEM rules to system_rules_dump.json`);
}

dumpMessages();
