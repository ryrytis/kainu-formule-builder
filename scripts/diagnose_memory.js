// Diagnostic script to check chat memory status
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseMemory() {
    console.log("\n=== CHAT MEMORY DIAGNOSTIC ===\n");

    // 1. Check if chat_messages table exists and has data
    console.log("1. Checking chat_messages table...");
    const { data: messages, error: msgError } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

    if (msgError) {
        console.error("❌ ERROR accessing chat_messages:", msgError);
        return;
    }

    console.log(`✅ Found ${messages?.length || 0} messages in chat_messages table`);

    if (messages && messages.length > 0) {
        // Group by session_id
        const sessions = {};
        messages.forEach(msg => {
            if (!sessions[msg.session_id]) {
                sessions[msg.session_id] = [];
            }
            sessions[msg.session_id].push(msg);
        });

        console.log(`\n2. Sessions breakdown:`);
        for (const [sessionId, sessionMessages] of Object.entries(sessions)) {
            console.log(`   Session ${sessionId}: ${sessionMessages.length} messages`);
            sessionMessages.slice(0, 3).forEach(m => {
                console.log(`     - [${m.role}]: ${m.content?.substring(0, 50)}...`);
            });
        }
    } else {
        console.log("⚠️ No messages found - the table might be empty or there's an issue with inserts.");
    }

    // 3. Check System Identity in ai_knowledge
    console.log("\n3. Checking System Identity...");
    const { data: systemRules } = await supabase
        .from('ai_knowledge')
        .select('topic, content, category')
        .eq('category', 'SYSTEM')
        .eq('is_active', true);

    if (systemRules && systemRules.length > 0) {
        console.log(`✅ Found ${systemRules.length} SYSTEM rules:`);
        systemRules.forEach(r => {
            console.log(`   - ${r.topic}: ${r.content?.substring(0, 100)}...`);
        });
    } else {
        console.log("⚠️ No SYSTEM category rules found!");
    }

    // 4. Check if there's a greeting instruction
    console.log("\n4. Checking for greeting behavior rules...");
    const { data: allRules } = await supabase
        .from('ai_knowledge')
        .select('topic, content')
        .or('topic.ilike.%greet%,topic.ilike.%hello%,topic.ilike.%hi%,content.ilike.%sveiki%,content.ilike.%labas%');

    if (allRules && allRules.length > 0) {
        console.log(`Found ${allRules.length} greeting-related rules:`);
        allRules.forEach(r => {
            console.log(`   - ${r.topic}`);
        });
    } else {
        console.log("No specific greeting rules found.");
    }

    console.log("\n=== RECOMMENDATION ===");
    console.log("If messages are NOT being saved, check Vercel logs for 'CRITICAL: Failed to save user message!'");
    console.log("If messages ARE being saved but context is lost, the issue might be in the system prompt.");
    console.log("\n");
}

diagnoseMemory();
