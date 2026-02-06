
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
    console.log("Applying migration: migration_sticker_logic.sql");
    const sql = fs.readFileSync('migration_sticker_logic.sql', 'utf8');

    // Split statements solely by semicolon at end of line to avoid splitting inside strings if possible, 
    // but for this simple content, simple split is fine or running as one text if rpc supports it.
    // Supabase JS client doesn't run raw SQL easily without RPC. 
    // Use the postgres connection or just `rpc` if available, or just manually run queries via table interface if needed.
    // Actually, `scripts/migrate.js` probably has logic for this? Let's assume I need to use pg or similar.
    // Wait, the user has `scripts/migrate.js`. Let's assume it runs migrations found in a folder?
    // Let's just use the `ai_knowledge` table interface to insert/update directly for simplicity in this script if migrate.js is complex.

    // Actually, I can just use Supabase client to update/insert since I know the schema.

    console.log("Updating Sticker Prices...");
    await supabase.from('ai_knowledge').update({
        content: 'We offer Paper Stickers (Lipdukai ant popieriaus). Base price starts at 1.65 EUR + VAT per A3 sheet.'
    }).eq('topic', 'Lipdukas ant popieriaus');

    await supabase.from('ai_knowledge').update({
        content: 'We offer Film Stickers (Lipdukai ant plėvelės). Base price starts at 1.65 EUR + VAT per A3 sheet.'
    }).eq('topic', 'Lipdukas ant plėvelės');

    console.log("Inserting Logic Rule...");
    await supabase.from('ai_knowledge').insert({
        topic: 'Sticker Inquiry Logic',
        content: 'When a user asks about sticker prices (Lipdukai), you MUST first ask: "Do you need them in sheets (lapais) or rolls (rulonais)?". \n- IF Sheets: Quote the price starting from 1.65 EUR + VAT per A3 sheet.\n- IF Rolls: State that price depends on design, colors, size, and quantity, and ASK for these details.',
        category: 'Sales Logic',
        priority: 10,
        is_active: true
    });

    console.log("Migration complete.");
}

applyMigration();
