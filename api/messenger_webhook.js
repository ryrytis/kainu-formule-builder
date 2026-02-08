
import OpenAI from 'openai';

export default async function handler(req, res) {
    // 1. Verification (GET)
    if (req.method === 'GET') {
        // Parse the query params
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        // Checks if a token and mode is in the query string of the request
        if (mode && token) {
            // Checks the mode and token sent is correct
            if (mode === 'subscribe' && token === process.env.FACEBOOK_VERIFY_TOKEN) {
                // Responds with the challenge token from the request
                console.log('WEBHOOK_VERIFIED');
                return res.status(200).send(challenge);
            } else {
                // Responds with '403 Forbidden' if verify tokens do not match
                return res.status(403).json({ error: 'Verification failed' });
            }
        }
    }

    // 2. Message Handling (POST)
    if (req.method === 'POST') {
        const body = req.body;

        // Checks this is an event from a page subscription
        if (body.object === 'page') {
            // Iterates over each entry - there may be multiple if batched
            for (const entry of body.entry) {
                // Gets the body of the webhook event.
                // entry.messaging is an array, but may be empty if it's a standpoint update or other non-message event
                if (entry.messaging && entry.messaging.length > 0) {
                    const webhook_event = entry.messaging[0];
                    console.log("Received event:", webhook_event);

                    // Get the sender PSID
                    const sender_psid = webhook_event.sender.id;

                    // Check if the event is a message or postback and
                    // pass the event to the appropriate handler function
                    if (webhook_event.message) {
                        await handleMessage(sender_psid, webhook_event.message);
                    }
                }
            }

            // Returns a '200 OK' response to all requests
            return res.status(200).send('EVENT_RECEIVED');
        } else {
            // Returns a '404 Not Found' if event is not from a page subscription
            return res.status(404).json({ error: 'Not a page event' });
        }
    }

    return res.status(405).json({ error: "Method not allowed" });
}


import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wnogzzwrsxlyowxwdciw.supabase.co'; // Fallback for Vercel
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("CRITICAL: Missing Supabase Credentials", { url: !!supabaseUrl, key: !!supabaseKey });
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function handleMessage(sender_psid, received_message) {
    let response;

    // Checks if the message contains text
    if (received_message.text) {

        // Generate response using OpenAI
        try {
            console.log("=== MESSAGE HANDLER START ===");
            console.log("Session ID (PSID):", sender_psid);
            console.log("Message text:", received_message.text);
            console.log("Supabase URL configured:", !!supabaseUrl);
            console.log("Supabase Key configured:", !!supabaseKey);

            // 0. Save User Message
            console.log("Attempting to save user message to chat_messages...");
            const { data: insertData, error: saveError } = await supabase.from('chat_messages').insert({
                session_id: sender_psid,
                role: 'user',
                content: received_message.text
            }).select();

            if (saveError) {
                console.error("CRITICAL: Failed to save user message!", JSON.stringify(saveError));
                // We continue, but context will be lost.
            } else {
                console.log("✅ User message saved successfully:", insertData);
            }

            // 1. Fetch Knowledge Base & System Prompt & History
            const [{ data: allRules }, { data: history }] = await Promise.all([
                supabase
                    .from('ai_knowledge')
                    .select('topic, content, priority, category')
                    .eq('is_active', true)
                    .order('priority', { ascending: false }),
                supabase
                    .from('chat_messages')
                    .select('role, content')
                    .eq('session_id', sender_psid)
                    .order('created_at', { ascending: true }) // OpenAI needs chronological order
                    .limit(10) // Get last 10 messages (including what we just saved hopefully, or we might double dip. Actually we just inserted, so it might return it, duplicate issue? )
                // BETTER: Exclude the very last one we just inserted or just use history from BEFORE insert?
                // To be safe and simple: Let's fetch history BEFORE insert? Or just filter duplicates?
                // actually, fetching AFTER insert is fine, it will include the user's latest message as the last item.
                // But we want to construct the prompt: System, History... (User's msg is in history).
            ]);

            // Find System Prompt
            const systemPromptRule = allRules?.find(r => r.category === 'SYSTEM');
            const knowledgeRules = allRules?.filter(r => r.category !== 'SYSTEM') || [];

            // Use DB system prompt or fallback
            let systemContext = systemPromptRule ? systemPromptRule.content : "You are an AI Support Agent for 'Keturi print'. \n\nIMPORTANT: No system instructions found. Please contact admin.";

            if (knowledgeRules.length > 0) {
                systemContext += "\n\nCRITICAL BUSINESS KNOWLEDGE (Use this to answer):";
                knowledgeRules.forEach(rule => {
                    systemContext += `\n- [${rule.topic}]: ${rule.content}`;
                });
            }

            // 1.5 Dynamic Pricing Search
            // If user asks about price, search historical orders
            const lowerMsg = received_message.text.toLowerCase();
            if (lowerMsg.includes('kaina') || lowerMsg.includes('kainuoja') || lowerMsg.includes('price') || lowerMsg.includes('cost')) {
                // Extract potential product keywords (simple approach: use the whole message or key terms)
                // For now, let's try to find matchable terms or just pass relevant words. 
                // A better way is to search for known product types if found in message? 
                // Or just search using the user's filtered input.
                // Let's search using the message content but remove common words if possible, or just search.
                // Simple: Search for "lipduk" if "lipdukai" int text. 

                // Let's implement the search function directly here or import it if extracted.
                // For simplicity, inline logic for now.

                const searchTerm = lowerMsg.replace(/kaina|kainuoja|price|cost|kokia|kiek/g, '').trim();
                if (searchTerm.length > 3) {
                    console.log(`Dynamic Search for: ${searchTerm}`);
                    const { data: priceData } = await supabase
                        .from('order_items')
                        .select('unit_price, quantity')
                        .ilike('product_type', `%${searchTerm}%`)
                        .limit(50);

                    if (priceData && priceData.length > 0) {
                        const ranges = {
                            small: { min: 0, max: 100, prices: [] },
                            medium: { min: 101, max: 500, prices: [] },
                            large: { min: 501, max: 10000, prices: [] }
                        };

                        priceData.forEach(item => {
                            if (item.quantity <= 100) ranges.small.prices.push(item.unit_price);
                            else if (item.quantity <= 500) ranges.medium.prices.push(item.unit_price);
                            else ranges.large.prices.push(item.unit_price);
                        });

                        const getAvg = (arr) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(4) : null;

                        let priceContext = "\n\nSTANDARD PRICING (Historical Averages - Use as estimates only):";
                        if (ranges.small.prices.length) priceContext += `\n- Small Qty (<100): ~${getAvg(ranges.small.prices)} EUR`;
                        if (ranges.medium.prices.length) priceContext += `\n- Medium Qty (100-500): ~${getAvg(ranges.medium.prices)} EUR`;
                        if (ranges.large.prices.length) priceContext += `\n- Large Qty (>500): ~${getAvg(ranges.large.prices)} EUR`;

                        if (priceContext.includes('~')) {
                            systemContext += priceContext;
                            systemContext += "\nINSTRUCTION: Use these standard prices to answer. Do NOT mention 'past orders' or specific clients.";
                        }
                    }
                }
            }

            // Construct Messages Array
            const messages = [
                { role: "system", content: systemContext }
            ];

            // Add history (which includes correct 'user' and 'assistant' roles)
            if (history && history.length > 0) {
                // Already fetched recentHistory below, so this block is redundant/placeholder in original code
            }

            // Re-fetch properly to get latest 5
            const { data: recentHistory } = await supabase
                .from('chat_messages')
                .select('role, content')
                .eq('session_id', sender_psid)
                .order('created_at', { ascending: false })
                .limit(20); // Increased history limit to maintain context

            if (recentHistory) {
                // Reverse to put in chronological order
                const chronologicalHistory = [...recentHistory].reverse();
                chronologicalHistory.forEach(msg => {
                    messages.push({ role: msg.role, content: msg.content });
                });
            }

            const openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
            });

            const completion = await openai.chat.completions.create({
                messages: messages,
                model: "gpt-4o",
            });

            console.log("--- OPENAI REQUEST DEBUG ---");
            console.log("System Prompt:", systemContext);
            console.log("Full Messages:", JSON.stringify(messages, null, 2));

            const aiResponse = completion.choices[0].message.content;
            response = {
                "text": aiResponse
            }

            // Save AI Response
            await supabase.from('chat_messages').insert({
                session_id: sender_psid,
                role: 'assistant',
                content: aiResponse
            });

            console.log("--- OPENAI RESPONSE DEBUG ---");
            console.log("Raw Response:", aiResponse);

        } catch (error) {
            console.error("OpenAI/Supabase Error:", error);
            response = { "text": "Sorry, I am unable to process your request at the moment." };
        }
    } else if (received_message.attachments) {
        // Handles attachments (optional future scope)
        response = {
            "text": "Received attachment, but I can only process text for now."
        }
    }

    // Send the response message
    await callSendAPI(sender_psid, response);
}

async function callSendAPI(sender_psid, response) {
    const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

    if (process.env.MOCK_FB_RESPONSE) {
        console.log(`\n🤖 AGENT: ${response.text}\n`);
        return;
    }

    const requestBody = {
        "recipient": {
            "id": sender_psid
        },
        "message": response
    };

    // Send the HTTP request to the Messenger Platform
    try {
        const res = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        if (!res.ok) {
            const errorData = await res.json();
            console.error("Facebook API Error:", errorData);
        } else {
            console.log('Message sent!');
        }
    } catch (error) {
        console.error("Unable to send message:" + error);
    }
}
