const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Testing as ANON user (what the E-Shop uses)
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testAnonAccess() {
  console.log('Testing access as ANON user...');
  
  const { data: p, error: pError } = await supabase.from('products').select('id, name').limit(1);
  if (pError) console.error('Products error (Anon):', pError);
  else console.log('Products found (Anon):', p.length);

  const { data: m, error: mError } = await supabase.from('materials').select('id, name').limit(1);
  if (mError) console.error('Materials error (Anon):', mError);
  else console.log('Materials found (Anon):', m.length);
}

testAnonAccess();
