const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkImaute() {
    const { data: products, error: pError } = await supabase
        .from('products')
        .select('id, name')
        .or('name.ilike.%įmautė%,name.ilike.%imaut%,name.ilike.%box%,name.ilike.%dėžut%');
    
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
    }
}

checkImaute();
