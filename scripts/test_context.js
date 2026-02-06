
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Mock session ID for testing
const session_id = 'test_session_' + Date.now();

async function simulateTurn(role, content) {
    console.log(`\n\n--- TURN: ${role.toUpperCase()} says: "${content}" ---`);

    // 1. Save Message
    await supabase.from('chat_messages').insert({
        session_id,
        role,
        content
    });

    if (role === 'user') {
        // 2. Simulate Agent Logic (Fetch History & Respond)
        const [{ data: allRules }, { data: history }] = await Promise.all([
            supabase.from('ai_knowledge').select('*').eq('is_active', true),
            supabase.from('chat_messages')
                .select('role, content')
                .eq('session_id', session_id)
                .order('created_at', { ascending: false }) // Get latest first
                .limit(20) // INCREASED LIMIT FOR TEST
        ]);

        const systemPromptRule = allRules?.find(r => r.category === 'SYSTEM');
        let systemContext = systemPromptRule ? systemPromptRule.content : "You are an AI.";

        // Append knowledge (simplified)
        const knowledgeRules = allRules?.filter(r => r.category !== 'SYSTEM') || [];
        if (knowledgeRules.length > 0) {
            systemContext += "\n\nKNOWLEDGE:";
            knowledgeRules.forEach(r => systemContext += `\n- [${r.topic}]: ${r.content}`);
        }

        // Construct Messages
        const messages = [{ role: 'system', content: systemContext }];

        // Reverse history to chronological
        const chronologicalHistory = [...(history || [])].reverse();
        chronologicalHistory.forEach(msg => messages.push({ role: msg.role, content: msg.content }));

        console.log("SENDING MESSAGES TO OPENAI (Preview last 3):");
        console.log(messages.slice(-3));

        // Call OpenAI
        const completion = await openai.chat.completions.create({
            messages,
            model: "gpt-4o",
        });

        const aiResponse = completion.choices[0].message.content;
        console.log(`AI RESPONDED: "${aiResponse}"`);

        // Save AI Response
        await supabase.from('chat_messages').insert({
            session_id,
            role: 'assistant',
            content: aiResponse
        });
    }
}

async function runTest() {
    await simulateTurn('user', 'Labas');
    // AI should greet
    await simulateTurn('user', 'Kokia kaina lipdukų?');
    // AI should ask: Sheets or Rolls?
    await simulateTurn('user', 'Rulonais');
    // AI should ask details
    // NOW THE TEST: User switches back to sheets
    await simulateTurn('user', 'O jei lapais?');
    // AI should quote sheet price WITHOUT saying "Sveiki" again.
}

runTest();
