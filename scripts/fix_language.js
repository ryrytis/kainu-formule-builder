
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixLanguage() {
    console.log("Fixing Language Settings...");

    // 1. Update System Prompt to enforce Lithuanian
    console.log("Updating System Prompt...");
    const { data: systemId } = await supabase
        .from('ai_knowledge')
        .select('id')
        .eq('category', 'SYSTEM')
        .single();

    if (systemId) {
        await supabase.from('ai_knowledge').update({
            content: `You are an AI Support Agent for 'Keturi print'. 
IMPORTANT RULES:
1. You MUST answer in LITHUANIAN language (Lietuvių kalba) at all times, unless the user speaks English.
2. You MUST explicitly state you are an AI agent in your greeting if asked or at the start of a new topic.
3. You MUST offer the user the option to speak to a human if they seem frustrated or ask for it.
4. If asked for a human, tell them to email agniete@keturiprint.lt or rytis@keturiprint.lt, or call +370 696 63915 or +370 679 06605.`
        }).eq('id', systemId.id);
    }

    // 2. Update Design Inquiry Rule to be Lithuanian-centric
    console.log("Updating Design Inquiry Rule...");
    await supabase.from('ai_knowledge').update({
        content: `Kai vartotojas klausia apie bet kurio spaudos gaminio kainą (skrajutės, vizitinės ir t.t.), PRIVALAI paklausti: "Ar turite spaudai tinkamą maketą?". 
- JEI TAIP: Paprašyk atsiųsti patikrinimui.
- JEI NE: Paaiškink maketavimo paslaugas:
  * Smulkūs pataisymai: ~10-25 EUR (priklauso nuo sudėtingumo).
  * Naujas maketas: Kaina priklauso nuo gaminio (pvz., vizitinės ~15-25 EUR, skrajutės ~40+ EUR).`
    }).eq('topic', 'Design Inquiry Logic');

    console.log("Language Fix Complete.");
}

fixLanguage();
