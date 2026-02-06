
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectData() {
    console.log("Fetching sample data...");

    // Fetch Order Items
    const { data: items, error: err1 } = await supabase
        .from('order_items')
        .select('*')
        .limit(10);

    if (err1) console.error("Error fetching items:", err1);

    // Fetch Orders
    const { data: orders, error: err2 } = await supabase
        .from('orders')
        .select('*')
        .limit(5);

    if (err2) console.error("Error fetching orders:", err2);

    const output = {
        items: items || [],
        orders: orders || []
    };

    fs.writeFileSync('orders_dump.json', JSON.stringify(output, null, 2));
    console.log("Data dumped to orders_dump.json");
}

inspectData();
