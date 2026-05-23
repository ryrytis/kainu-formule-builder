const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function addImageUrlColumn() {
  console.log('Attempting to add image_url column via RPC...');
  // Note: This requires a custom RPC function 'exec_sql' to be present.
  // If it's not, we'll have to ask the user to do it in the dashboard.
  const { error } = await supabase.rpc('exec_sql', {
    query: 'ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;'
  });

  if (error) {
    console.log('RPC execution failed (expected if exec_sql is missing).');
    console.log('Please run this in your Supabase SQL Editor:');
    console.log('ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;');
  } else {
    console.log('Successfully added image_url column!');
  }
}

addImageUrlColumn();
