const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
// Since dotent is used in Vite, we might need a custom path or just skip it if we can get env vars from process.env
// But I'll assume .env is in the root and readable by dotenv
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkImaute() {
    try {
        const { data: products, error: pError } = await supabase
            .from('products')
            .select('id, name')
            .or('name.ilike.%įmautė%,name.ilike.%imaut%');
        
        if (pError) {
            console.error('Error fetching products:', pError);
            return;
        }
        
        console.log('Products found:', products);
        
        if (products && products.length > 0) {
            const productIds = products.map(p => p.id);
            const { data: rules, error: rError } = await supabase
                .from('calculation_rules')
                .select('*')
                .in('product_id', productIds);
            
            if (rError) {
                console.error('Error fetching rules:', rError);
            } else {
                console.log('Rules found:', rules);
            }
        } else {
            console.log('No Įmautė products found.');
        }
    } catch (e) {
        console.error('Unexpected error:', e);
    }
}

checkImaute();
