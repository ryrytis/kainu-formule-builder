
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
    console.log("Inspecting chat_messages schema...");

    // There isn't a direct "describe table" in supabase-js, but we can try to insert a dummy non-uuid and see error, 
    // OR we can try to fetch one row and see the types?
    // Better: use a query on information_schema if possible (might be blocked).
    // Let's try to insert a test record with a string ID and see if it fails.

    const testId = "1234567890_test_string";
    console.log(`Attempting to insert session_id: "${testId}"`);

    const { error } = await supabase.from('chat_messages').insert({
        session_id: testId,
        role: 'user',
        content: 'SCHEMA_TEST'
    });

    if (error) {
        console.error("Insert Error:", error);
    } else {
        console.log("Insert Success! (session_id accepts strings)");
        // Cleanup
        await supabase.from('chat_messages').delete().eq('content', 'SCHEMA_TEST');
    }
}

inspectSchema();
