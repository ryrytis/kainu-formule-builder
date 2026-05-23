const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function findIds() {
  const { data: p } = await supabase.from('products').select('id, name').ilike('name', '%Rulon%');
  console.log('--- PRODUCTS MATCHING Rulon ---');
  console.table(p);

  const { data: m } = await supabase.from('materials').select('id, name, category').in('category', ['Rulonai', 'Sticker', 'Lipdukai']);
  console.log('\n--- VALID MATERIALS ---');
  console.table(m);
}

findIds();
