
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wnogzzwrsxlyowxwdciw.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("CRITICAL: Missing Supabase Credentials", { url: !!supabaseUrl, key: !!supabaseKey });
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    // 1. Webhook Verification (GET)
    if (req.method === 'GET') {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        if (mode && token) {
            if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
                console.log('WHATSAPP_WEBHOOK_VERIFIED');
                return res.status(200).send(challenge);
            } else {
                return res.status(403).json({ error: 'Verification failed' });
            }
        }
        return res.status(400).json({ error: 'Missing verification parameters' });
    }

    // 2. Message Handling (POST)
    if (req.method === 'POST') {
        const body = req.body;

        // WhatsApp sends events with object = 'whatsapp_business_account'
        if (body.object === 'whatsapp_business_account') {
            for (const entry of body.entry || []) {
                for (const change of entry.changes || []) {
                    const value = change.value;

                    // Check if this is a message event
                    if (value.messages && value.messages.length > 0) {
                        const message = value.messages[0];
                        const senderPhone = message.from;

                        // Handle text messages
                        if (message.type === 'text' && message.text) {
                            await handleMessage(senderPhone, message.text.body);
                        }
                    }
                }
            }

            return res.status(200).send('EVENT_RECEIVED');
        } else {
            return res.status(404).json({ error: 'Not a WhatsApp event' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}

async function handleMessage(senderPhone, messageText) {
    try {
        console.log("=== WHATSAPP MESSAGE HANDLER START ===");
        console.log("Sender Phone:", senderPhone);
        console.log("Message text:", messageText);

        // Use phone number with 'wa_' prefix as session ID to differentiate from Messenger
        const sessionId = `wa_${senderPhone}`;

        // Save User Message
        const { error: saveError } = await supabase.from('chat_messages').insert({
            session_id: sessionId,
            role: 'user',
            content: messageText
        });

        if (saveError) {
            console.error("Failed to save user message:", saveError);
        }

        // Fetch Knowledge Base & System Prompt
        const { data: allRules } = await supabase
            .from('ai_knowledge')
            .select('topic, content, priority, category')
            .eq('is_active', true)
            .order('priority', { ascending: false });

        // Find System Prompt
        const systemPromptRule = allRules?.find(r => r.category === 'SYSTEM');
        const knowledgeRules = allRules?.filter(r => r.category !== 'SYSTEM') || [];

        let systemContext = systemPromptRule
            ? systemPromptRule.content
            : "You are an AI Support Agent for 'Keturi print'. \n\nIMPORTANT: No system instructions found. Please contact admin.";

        if (knowledgeRules.length > 0) {
            systemContext += "\n\nCRITICAL BUSINESS KNOWLEDGE (Use this to answer):";
            knowledgeRules.forEach(rule => {
                systemContext += `\n- [${rule.topic}]: ${rule.content}`;
            });
        }

        // Dynamic Pricing Search
        const lowerMsg = messageText.toLowerCase();
        if (lowerMsg.includes('kaina') || lowerMsg.includes('kainuoja') || lowerMsg.includes('price') || lowerMsg.includes('cost')) {
            const searchTerm = lowerMsg.replace(/kaina|kainuoja|price|cost|kokia|kiek/g, '').trim();
            if (searchTerm.length > 3) {
                const { data: priceData } = await supabase
                    .from('order_items')
                    .select('unit_price, quantity')
                    .ilike('product_type', `%${searchTerm}%`)
                    .limit(50);

                if (priceData && priceData.length > 0) {
                    const ranges = {
                        small: { prices: [] },
                        medium: { prices: [] },
                        large: { prices: [] }
                    };

                    priceData.forEach(item => {
                        if (item.quantity <= 100) ranges.small.prices.push(item.unit_price);
                        else if (item.quantity <= 500) ranges.medium.prices.push(item.unit_price);
                        else ranges.large.prices.push(item.unit_price);
                    });

                    const getAvg = (arr) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(4) : null;

                    let priceContext = "\n\nSTANDARD PRICING (Historical Averages):";
                    if (ranges.small.prices.length) priceContext += `\n- Small Qty (<100): ~${getAvg(ranges.small.prices)} EUR`;
                    if (ranges.medium.prices.length) priceContext += `\n- Medium Qty (100-500): ~${getAvg(ranges.medium.prices)} EUR`;
                    if (ranges.large.prices.length) priceContext += `\n- Large Qty (>500): ~${getAvg(ranges.large.prices)} EUR`;

                    if (priceContext.includes('~')) {
                        systemContext += priceContext;
                        systemContext += "\nINSTRUCTION: Use these standard prices to answer.";
                    }
                }
            }
        }

        // Fetch conversation history
        const { data: recentHistory } = await supabase
            .from('chat_messages')
            .select('role, content')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: false })
            .limit(20);

        // Build messages array
        const messages = [{ role: "system", content: systemContext }];

        if (recentHistory) {
            const chronologicalHistory = [...recentHistory].reverse();
            chronologicalHistory.forEach(msg => {
                messages.push({ role: msg.role, content: msg.content });
            });
        }

        // Call OpenAI
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const completion = await openai.chat.completions.create({
            messages: messages,
            model: "gpt-4o",
        });

        const aiResponse = completion.choices[0].message.content;

        // Save AI Response
        await supabase.from('chat_messages').insert({
            session_id: sessionId,
            role: 'assistant',
            content: aiResponse
        });

        // Send response via WhatsApp API
        await sendWhatsAppMessage(senderPhone, aiResponse);

        console.log("=== WHATSAPP MESSAGE HANDLER END ===");

    } catch (error) {
        console.error("WhatsApp Handler Error:", error);
        await sendWhatsAppMessage(senderPhone, "Sorry, I am unable to process your request at the moment.");
    }
}

async function sendWhatsAppMessage(recipientPhone, message) {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
        console.error("Missing WhatsApp credentials");
        return;
    }

    const requestBody = {
        messaging_product: "whatsapp",
        to: recipientPhone,
        type: "text",
        text: { body: message }
    };

    try {
        const res = await fetch(
            `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            }
        );

        if (!res.ok) {
            const errorData = await res.json();
            console.error("WhatsApp API Error:", errorData);
        } else {
            console.log('WhatsApp message sent!');
        }
    } catch (error) {
        console.error("Unable to send WhatsApp message:", error);
    }
}
