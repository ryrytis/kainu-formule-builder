require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Fallback to .env if local is missing
if (!process.env.SUPABASE_URL && !process.env.VITE_SUPABASE_URL) {
    require('dotenv').config({ path: '.env' });
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addMonitors() {
    const emails = ['rytis@keturiprint.lt', 'agniete@keturiprint.lt'];

    for (const email of emails) {
        // Check if exists
        const { data: existing } = await supabase
            .from('email_monitors')
            .select('id')
            .eq('email_address', email)
            .maybeSingle();

        if (existing) {
            console.log(`${email} already exists.`);
        } else {
            const { error } = await supabase
                .from('email_monitors')
                .insert([{ email_address: email, is_active: true }]);
            
            if (error) {
                console.error(`Failed to insert ${email}:`, error.message);
            } else {
                console.log(`Successfully added ${email} to monitors!`);
            }
        }
    }
}

addMonitors();
