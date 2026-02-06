
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
    console.log("Applying Migration: migration_design_logic.sql");

    // We already have sticker logic applied. 
    // We will do direct inserts/updates via Supabase Client for simplicity where possible, 
    // OR just parse the SQL. parsing SQL is risky if complex.
    // Let's manually map the SQL intent to JS calls to be safe and consistent with previous steps.

    // 1. Insert Logic Rule
    console.log("Inserting Design Inquiry Logic...");
    await supabase.from('ai_knowledge').insert({
        topic: 'Design Inquiry Logic',
        content: `When a user asks for a quote for ANY printing product (flyers, business cards, etc.), you MUST ask: "Do you have a print-ready design file (maketas)?". 
- IF YES: Ask them to send it for checking.
- IF NO: Explain design options:
  * Small Adjustments (Smulkūs pataisymai): ~10-25 EUR (depends on complexity).
  * New Design (Naujas maketas): Price depends on the product (e.g., ~15-25 EUR for business cards, ~40+ EUR for brochures/flyers).`,
        category: 'Sales Logic',
        priority: 10,
        is_active: true
    });

    // 2. Update Maketavimas
    console.log("Updating Maketavimas...");
    await supabase.from('ai_knowledge').update({
        content: 'We offer Layout/Adjustment Services (Maketavimas). Price differs:\n- Small Adjustments: 10-25 EUR.\n- Full Layout: Starts at 25 EUR.',
        priority: 5
    }).eq('topic', 'Maketavimas');

    // 3. Update Dizainas
    console.log("Updating Dizainas...");
    await supabase.from('ai_knowledge').update({
        content: 'We offer Design Services (Dizainas). Price differs by product:\n- Business Cards: ~15-25 EUR\n- Flyers/Posters: ~40-60 EUR\n- Multi-page: Custom quote.',
        priority: 5
    }).eq('topic', 'Dizainas');

    console.log("Migration Complete.");
}

applyMigration();
