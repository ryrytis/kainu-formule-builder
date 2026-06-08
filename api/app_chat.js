
import { processAiMessage } from './_lib/ai_logic.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const { message, sessionId, userName } = req.body;

    if (!message || !sessionId) {
        return res.status(400).json({ error: 'Missing message or sessionId' });
    }

    try {
        // Optional: Verify user session here if needed (via Authorization header)
        const response = await processAiMessage(sessionId, message, true, userName);
        return res.status(200).json({ response });
    } catch (error) {
        console.error("App Chat Error:", error);
        return res.status(500).json({ error: 'Failed to process message' });
    }
}
