
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wnogzzwrsxlyowxwdciw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indub2d6endyc3hseW93eHdkY2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxOTEzMTcsImV4cCI6MjA4MTc2NzMxN30.PfPdffutsXOIwJSYAaVA7EPwA6YPU4OJFHJTVJsNz3E';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSearch(searchTerm: string) {
    console.log(`Testing search for: "${searchTerm}"`);

    let query = supabase
        .from('orders')
        .select(`
            id,
            order_number,
            clients!inner (name)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

    if (searchTerm) {
        // Reproducing the exact line from Orders.tsx
        query = query.or(`order_number.ilike.%${searchTerm}%,clients.name.ilike.%${searchTerm}%`);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error:', error);
    } else {
        console.log(`Found ${data?.length} orders.`);
        data?.forEach(o => {
            // @ts-ignore
            console.log(`Order: ${o.order_number}, Client: ${o.clients?.name}`);
        });
    }
}

testSearch('Iceco');
