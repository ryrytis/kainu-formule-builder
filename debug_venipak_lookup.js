
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from current directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });


const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing credentials (URL or Service Role Key)');
    process.exit(1);
}

// Use Service Role Key to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function debugLookup() {
    const targetName = "Ukmergės Antakalnio MAXIMA Venipak paštomatas";
    const city = "Ukmergė";

    console.log(`Searching for terminal: "${targetName}" in city "${city}"`);

    // 1. Exact Match
    console.log('--- 1. Exact Match ---');
    const { data: exact, error: exactError } = await supabase
        .from('venipak_pickup_points')
        .select('*')
        .eq('pastomat_name', targetName)
        .limit(1);

    if (exactError) console.error('Exact match error:', exactError);
    if (exact && exact.length > 0) {
        console.log('Exact match SUCCESS:', exact[0]);
    } else {
        console.log('Exact match FAILED');
    }

    // 2. Fuzzy Match (Replicating VenipakService logic)
    console.log('\n--- 2. Fuzzy Match Logic ---');

    // Note: Service uses 'pastomat_city', let's check what column name actually is.
    // 'pastomat_city' per Service code.

    const { data: cityTerms, error: cityError } = await supabase
        .from('venipak_pickup_points')
        .select('*')
        .ilike('pastomat_city', `%${city}%`)
        .limit(50);

    if (cityError) console.error('City lookup error:', cityError);

    if (cityTerms && cityTerms.length > 0) {
        console.log(`Found ${cityTerms.length} terminals in city ${city}.`);
        console.log('Candidates:', cityTerms.map(t => t.pastomat_name));

        const getScore = (target, candidate) => {
            const normalize = (s) => s.toLowerCase().replace(/[^\w\s\u00C0-\u024F]/g, '').replace(/\s+/g, ' ').trim();
            const targetTokens = normalize(target).split(' ').filter(w => w.length > 2);

            const candidateText = normalize(`${candidate.pastomat_name} ${candidate.pastomat_address} ${candidate.pastomat_id}`);

            let matches = 0;
            targetTokens.forEach(token => {
                if (candidateText.includes(token)) matches++;
            });
            return matches;
        };

        let bestMatch = null;
        let maxScore = 0;

        cityTerms.forEach(term => {
            const score = getScore(targetName, term);
            console.log(`Scored "${term.pastomat_name}": ${score}`);
            if (score > maxScore) {
                maxScore = score;
                bestMatch = term;
            }
        });

        if (bestMatch && maxScore > 0) {
            console.log(`\nFuzzy Match WINNER (Score: ${maxScore}):`, bestMatch);
        } else {
            console.log('\nNo sufficient fuzzy match found.');
        }

    } else {
        console.log('No terminals found in city.');
    }



    // 3. Inspect table content generally (and check specific row)
    console.log('\n--- 3. General Table Inspection & Char Comparison ---');
    const { data: sample, error: sampleError } = await supabase
        .from('venipak_pickup_points')
        .select('*')
        .eq('pastomat_id', '3560') // We know this ID corresponds to the target from previous run
        .limit(1);

    if (sampleError) console.error('Sample fetch error:', sampleError);
    else if (sample && sample.length > 0) {
        const row = sample[0];
        console.log('Row found manually by ID 3560:', row);

        const dbName = row.pastomat_name;
        const dbCity = row.pastomat_city;

        console.log(`\nComparison for NAME:`);
        console.log(`Target: "${targetName}" (Len: ${targetName.length})`);
        console.log(`DBVal : "${dbName}" (Len: ${dbName.length})`);

        if (targetName !== dbName) {
            console.log('Strings look different. Checking char codes...');
            for (let i = 0; i < Math.max(targetName.length, dbName.length); i++) {
                const c1 = targetName.charCodeAt(i);
                const c2 = dbName.charCodeAt(i);
                if (c1 !== c2) {
                    console.log(`Diff at index ${i}: Target=${c1} ('${targetName[i]}'), DB=${c2} ('${dbName[i]}')`);
                }
            }
        } else {
            console.log('Strings are identical (JS strict equality). Exact match SHOULD have worked.');
        }

        console.log(`\nComparison for CITY:`);
        console.log(`Target: "${city}" (Len: ${city.length})`);
        console.log(`DBVal : "${dbCity}" (Len: ${dbCity.length})`);

        if (city !== dbCity) {
            console.log('Cities look different. Checking char codes...');
            for (let i = 0; i < Math.max(city.length, dbCity.length); i++) {
                const c1 = city.charCodeAt(i);
                const c2 = dbCity.charCodeAt(i);
                if (c1 !== c2) {
                    console.log(`Diff at index ${i}: Target=${c1} ('${city[i]}'), DB=${c2} ('${dbCity[i]}')`);
                }
            }
        }

    } else {
        console.log('Could not find row with ID 3560 for inspection.');
    }
}

debugLookup();
