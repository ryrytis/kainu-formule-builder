
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
    console.log("Applying Calendar Logic Migration...");

    // Insert Calendar Inquiry Logic
    await supabase.from('ai_knowledge').insert({
        topic: 'Calendar Inquiry Logic',
        content: `Kai vartotojas klausia apie kalendorius (sieninius, stalinius ar bendrai), PRIVALAI išvardinti turimus tipus ir paklausti, kuris domina:
1. Pakabinamas 3 dalių (su 1 arba 3 reklaminiais plotais)
2. Pakabinamas 1 dalies (vieno lapo)
3. Pastatomas (stalinis)

Kainos priklauso nuo kiekio ir tipo.`,
        category: 'Sales Logic',
        priority: 10,
        is_active: true
    });

    console.log("Calendar Logic Applied.");
}

applyMigration();
