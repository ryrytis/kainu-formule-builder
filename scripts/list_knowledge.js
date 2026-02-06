
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listKnowledge() {
    console.log("\n--- Current AI Knowledge ---");
    const { data, error } = await supabase
        .from('ai_knowledge')
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        console.error("Error fetching knowledge:", error);
    } else {
        fs.writeFileSync('knowledge_dump.json', JSON.stringify(data, null, 2));
        console.log("Knowledge saved to knowledge_dump.json");
    }
}

listKnowledge();
