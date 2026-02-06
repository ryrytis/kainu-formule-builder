
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function testChat(question) {
    console.log(`\nUser: ${question}`);

    const [{ data: allRules }] = await Promise.all([
        supabase
            .from('ai_knowledge')
            .select('topic, content, priority, category')
            .eq('is_active', true)
            .order('priority', { ascending: false })
    ]);

    const systemPromptRule = allRules?.find(r => r.category === 'SYSTEM');
    const knowledgeRules = allRules?.filter(r => r.category !== 'SYSTEM') || [];

    let systemContext = systemPromptRule ? systemPromptRule.content : "You are an AI Support Agent.";

    if (knowledgeRules.length > 0) {
        systemContext += "\n\nCRITICAL BUSINESS KNOWLEDGE (Use this to answer):";
        knowledgeRules.forEach(rule => {
            systemContext += `\n- [${rule.topic}]: ${rule.content}`;
        });
    }

    const messages = [
        { role: "system", content: systemContext },
        { role: "user", content: question }
    ];

    try {
        const completion = await openai.chat.completions.create({
            messages: messages,
            model: "gpt-4o",
        });

        console.log(`AI: ${completion.choices[0].message.content}`);
    } catch (error) {
        console.error("Error:", error);
    }
}

testChat("Noriu užsakyti kalendorių");
