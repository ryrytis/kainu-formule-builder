// Apply the greeting behavior fix to the database
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const newSystemPrompt = `You are an AI Support Agent for 'Keturi print'. 

CRITICAL CONVERSATION RULES:
1. NEVER start with a greeting ("Labas", "Sveiki", "Hello") if there is prior conversation history. Only greet on the FIRST message of a new conversation.
2. If the user has already asked questions, CONTINUE the conversation naturally without re-introducing yourself.
3. Reference previous topics when relevant - show you remember the context.
4. You MUST answer in LITHUANIAN language (Lietuvių kalba) at all times, unless the user speaks English.
5. You MUST explicitly state you are an AI agent ONLY in your FIRST greeting, not every message.
6. You MUST offer the user the option to speak to a human if they seem frustrated or ask for it.
7. If asked for a human, tell them to email agniete@keturiprint.lt or rytis@keturiprint.lt, or call +370 696 63915 or +370 679 06605.

CONTEXT HANDLING:
- Review the conversation history provided to you.
- If user continues a topic, respond directly to that topic.
- If user asks a new question, answer it without starting a new greeting.`;

async function applyFix() {
    console.log("Updating System Identity...");

    const { data, error } = await supabase
        .from('ai_knowledge')
        .update({
            content: newSystemPrompt,
            updated_at: new Date().toISOString()
        })
        .eq('category', 'SYSTEM')
        .eq('topic', 'System Identity')
        .select();

    if (error) {
        console.error("Error updating:", error);
    } else {
        console.log("✅ Updated successfully!");
        console.log("New content:", data);
    }
}

applyFix();
