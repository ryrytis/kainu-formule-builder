import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
   console.error("Missing env vars");
   process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLookup(terminal_id) {
    console.log(`\n--- Testing lookup for: "${terminal_id}" ---`);
    
    // Exact logic from VenipakService.ts
    let terminal = null;
    let { data: terms, error: termError } = await supabase
        .from('VenipackPickupPoints') // using actual table name
        .select('*')
        .eq('name', terminal_id)
        .limit(1)
        .maybeSingle();

    if (termError) console.error('Terminal lookup error:', termError);

    if (terms) {
        console.log('✅ Success! Terminal found:', terms.name);
        return { success: true, terminal: terms };
    } else {
        console.warn('❌ Failure! No terminal found for ID:', terminal_id);
        const errorMsg = `Exact Venipak terminal not found for: "${terminal_id}". Please check the terminal name.`;
        console.log("Returned Error:", errorMsg);
        return { success: false, error: errorMsg };
    }
}

async function runTests() {
    // Test 1: An exact match that works
    // We'll query one valid locker first to use it
    const { data: validLocker } = await supabase.from('VenipackPickupPoints').select('name').limit(1).single();
    if (validLocker) {
        await testLookup(validLocker.name);
    }

    // Test 2: A misspelled/fuzzy match that used to work but should now FAIL
    // For example, "Plieno g." was fuzzy matched before. Let's try partial name.
    await testLookup("Klaipėdos Udrop AIBĖ Plieno g.");
}

runTests();
