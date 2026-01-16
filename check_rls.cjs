const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wnogzzwrsxlyowxwdciw.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indub2d6endyc3hseW93eHdkY2l3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjE5MTMxNywiZXhwIjoyMDgxNzY3MzE3fQ.2-R2Gbj4HryRCV_i78Li3-DHU8lGDCE8E-DhFthqZPg';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPolicies() {
    try {
        console.log('1. Listing latest 5 clients (Service Key)...');
        const { data: list, error: listError } = await supabase
            .from('clients')
            .select('id, name, created_at')
            .order('created_at', { ascending: false })
            .limit(5);

        if (listError) {
            console.error('List Error:', listError);
        } else {
            console.log('Latest Clients:', list);
        }

        const testId = '33226a2f-2645-4948-bc0a-e7bacc1d6a43';
        console.log(`2. Checking ID ${testId}...`);

        const { data: exact, error: exactError } = await supabase
            .from('clients')
            .select('*')
            .eq('id', testId)
            .maybeSingle();

        if (exactError) {
            console.error('Error checking ID:', exactError);
        } else if (!exact) {
            console.log(`❌ ID ${testId} definitely NOT found.`);
        } else {
            console.log(`✅ ID ${testId} FOUND! Name: ${exact.name}`);
        }

    } catch (e) {
        console.error('Script Error:', e);
    }
}

checkPolicies();
