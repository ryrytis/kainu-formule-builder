// Diagnostic API endpoint to test database connectivity
// Access at: https://your-vercel-app.vercel.app/api/diagnose

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    const results = {
        timestamp: new Date().toISOString(),
        env_check: {},
        db_check: {},
        insert_test: {},
        fetch_test: {}
    };

    // 1. Check environment variables
    results.env_check = {
        VITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
        FACEBOOK_PAGE_ACCESS_TOKEN: !!process.env.FACEBOOK_PAGE_ACCESS_TOKEN
    };

    // 2. Test Supabase connection
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        results.db_check = { error: "Missing Supabase credentials" };
        return res.status(200).json(results);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 3. Test insert into chat_messages
    const testMessage = {
        session_id: "diagnose_test_" + Date.now(),
        role: "user",
        content: "DIAGNOSTIC TEST - Delete me"
    };

    try {
        const { data: insertData, error: insertError } = await supabase
            .from('chat_messages')
            .insert(testMessage)
            .select();

        if (insertError) {
            results.insert_test = { error: insertError };
        } else {
            results.insert_test = { success: true, data: insertData };

            // Cleanup: delete the test message
            await supabase
                .from('chat_messages')
                .delete()
                .eq('session_id', testMessage.session_id);
        }
    } catch (e) {
        results.insert_test = { exception: e.message };
    }

    // 4. Fetch recent messages
    try {
        const { data: messages, error: fetchError } = await supabase
            .from('chat_messages')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

        if (fetchError) {
            results.fetch_test = { error: fetchError };
        } else {
            results.fetch_test = {
                success: true,
                count: messages?.length || 0,
                latest: messages?.[0]?.created_at || null
            };
        }
    } catch (e) {
        results.fetch_test = { exception: e.message };
    }

    return res.status(200).json(results);
}
