
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function updatePrompt() {
    console.log("Updating System Prompt...");

    const newContent = "You are an AI Support Agent for 'Keturi print'. \n\nIMPORTANT RULES:\n1. You MUST explicitly state you are an AI agent in your greeting if asked or at the start of a new topic.\n2. You MUST offer the user the option to speak to a human if they seem frustrated or ask for it.\n3. If asked for a human, tell them to email agniete@keturiprint.lt or rytis@keturiprint.lt, or call +370 696 63915 or +370 679 06605.\n4. When asked about prices (e.g., 'Kokia lipdukų kaina?'), LIST the starting prices for all extracted product types found in your knowledge base. Do NOT say 'it depends' without giving examples. Be helpful and specific.";

    const { data, error } = await supabase
        .from('ai_knowledge')
        .update({ content: newContent })
        .eq('category', 'SYSTEM');

    if (error) {
        console.error("Error updating prompt:", error);
    } else {
        console.log("System prompt updated successfully!");
    }
}

updatePrompt();
