
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wnogzzwrsxlyowxwdciw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indub2d6endyc3hseW93eHdkY2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxOTEzMTcsImV4cCI6MjA4MTc2NzMxN30.PfPdffutsXOIwJSYAaVA7EPwA6YPU4OJFHJTVJsNz3E';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifySearch() {
    console.log("Verifying search RPC...");

    // Baseline: Check if we can see any orders at all
    const { data: baseData, error: baseError } = await supabase.from('orders').select('id, order_number').limit(5);
    if (baseError) console.error("Base Select Failed:", baseError);
    else console.log(`Base Select: Found ${baseData?.length} orders.`);

    // Test 1: Search by Client Name partial
    console.log("\nTest 1: Search for 'Iceco'");
    const { data: data1, error: error1 } = await supabase.rpc('search_orders', { search_term: 'Iceco' });

    if (error1) {
        console.error("RPC Failed:", error1);
    } else {
        console.log(`Found ${data1?.length} orders for 'Iceco'.`);
        if (data1 && data1.length > 0) {
            console.log("Sample Order:", data1[0].order_number);
        }
    }

    // Test 2: Search by Order Number
    console.log("\nTest 2: Search for '2026'");
    const { data: data2, error: error2 } = await supabase.rpc('search_orders', { search_term: '2026' });

    if (error2) {
        console.error("RPC Failed:", error2);
    } else {
        console.log(`Found ${data2?.length} orders for '2026'.`);
    }
}

verifySearch();
