
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function ask(question) {
    return new Promise(resolve => rl.question(question, resolve));
}

async function train() {
    console.log("\n--- Agent Training (Add Knowledge) ---");
    console.log("This script adds a new rule to the 'ai_knowledge' table.\n");

    const topic = await ask("Enter Topic (e.g., 'Return Policy'): ");
    if (!topic) { console.log("Aborted."); process.exit(0); }

    const content = await ask("Enter Knowledge Content: ");
    if (!content) { console.log("Aborted."); process.exit(0); }

    const priorityStr = await ask("Enter Priority (1-10, default 5): ");
    const priority = parseInt(priorityStr) || 5;

    console.log(`\nAdding knowledge:\nTopic: ${topic}\nContent: ${content}\nPriority: ${priority}\n`);

    const confirm = await ask("Confirm? (y/n): ");
    if (confirm.toLowerCase() !== 'y') {
        console.log("Cancelled.");
        process.exit(0);
    }

    const { data, error } = await supabase
        .from('ai_knowledge')
        .insert({
            topic,
            content,
            category: 'general',
            priority,
            is_active: true
        });

    if (error) {
        console.error("Error inserting data:", error);
    } else {
        console.log("✅ Knowledge added successfully!");
    }

    rl.close();
}

train();
