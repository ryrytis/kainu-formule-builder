const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Use SERVICE ROLE KEY to bypass RLS for discovery
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function listProductsAndMaterials() {
  const { data: products, error: pError } = await supabase
    .from('products')
    .select('id, name, category, base_price');
  
  if (pError) console.error('Products Error:', pError);
  else {
    console.log('--- PRODUCTS ---');
    console.table(products);
  }

  const { data: materials, error: mError } = await supabase
    .from('materials')
    .select('id, name, category, unit_price');
  
  if (mError) console.error('Materials Error:', mError);
  else {
    console.log('\n--- MATERIALS ---');
    console.table(materials);
  }
}

listProductsAndMaterials();
