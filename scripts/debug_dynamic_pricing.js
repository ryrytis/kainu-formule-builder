
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function searchPricing(term) {
    console.log(`Searching for: "${term}"`);

    // 1. Search
    const { data, error } = await supabase
        .from('order_items')
        .select('product_type, quantity, unit_price, total_price')
        .ilike('product_type', `%${term}%`)
        .limit(50); // Fetch enough to aggregate

    if (error) {
        console.error("Search Error:", error);
        return;
    }

    console.log(`Found ${data.length} matches.`);

    // 2. Aggregate
    // Ranges: <100, 100-500, >500
    const ranges = {
        small: { min: 0, max: 100, prices: [] },
        medium: { min: 101, max: 500, prices: [] },
        large: { min: 501, max: 10000, prices: [] }
    };

    data.forEach(item => {
        if (item.quantity <= 100) ranges.small.prices.push(item.unit_price);
        else if (item.quantity <= 500) ranges.medium.prices.push(item.unit_price);
        else ranges.large.prices.push(item.unit_price);
    });

    const getAvg = (arr) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(4) : null;

    console.log("\n--- Pricing Analysis ---");
    if (ranges.small.prices.length) console.log(`Small Qty (<100): Avg ${getAvg(ranges.small.prices)} EUR`);
    if (ranges.medium.prices.length) console.log(`Medium Qty (100-500): Avg ${getAvg(ranges.medium.prices)} EUR`);
    if (ranges.large.prices.length) console.log(`Large Qty (>500): Avg ${getAvg(ranges.large.prices)} EUR`);
}

searchPricing("Lipduk");
searchPricing("kalend");
