
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wnogzzwrsxlyowxwdciw.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function processAiMessage(sender_id, message_text, isInternal = false) {
    console.log("=== AI LOGIC START ===");
    console.log("Sender ID:", sender_id, "| Internal:", isInternal);
    console.log("Message:", message_text);
    const lowerMsg = message_text.toLowerCase();

    try {
        // 1. Save User Message
        await supabase.from('chat_messages').insert({
            session_id: sender_id,
            role: 'user',
            content: message_text
        });

        // 2. Fetch Knowledge Base & History
        const [{ data: rawRules, error: kError }, { data: history }] = await Promise.all([
            supabase
                .from('ai_knowledge')
                .select('*')
                .eq('is_active', true)
                .order('priority', { ascending: false }),
            supabase
                .from('chat_messages')
                .select('role, content')
                .eq('session_id', sender_id)
                .order('created_at', { ascending: false })
                .limit(20)
        ]);

        if (kError) {
            console.error("Knowledge Fetch Error:", kError);
        }

        // Filter by is_internal in JS for resilience (in case column is missing)
        const allRules = rawRules?.filter(r => {
            if (isInternal) return true; // Internal users see everything
            return r.is_internal !== true; // External users skip if explicitly marked internal
        }) || [];

        // Construct System Prompt
        const systemPromptRule = allRules?.find(r => r.category === 'SYSTEM');
        const knowledgeRules = allRules?.filter(r => r.category !== 'SYSTEM') || [];

        let systemContext = "";
        if (isInternal) {
            systemContext = "You are an INTERNAL Staff Assistant for 'Keturi print'. You are helping company employees with sensitive data. " +
                            "You SHOULD provide client contact details, order statuses, and pricing rules when asked, as you are in a secure internal environment.\n\n" +
                            (systemPromptRule ? systemPromptRule.content : "");
        } else {
            systemContext = systemPromptRule ? systemPromptRule.content : "You are an AI Support Agent for 'Keturi print'.";
        }

        if (knowledgeRules.length > 0) {
            systemContext += "\n\nBUSINESS KNOWLEDGE:";
            knowledgeRules.forEach(rule => {
                systemContext += `\n- [${rule.topic}]: ${rule.content}`;
            });
        }

        // 3. Dynamic Data Retrieval (Internal Only)
        if (isInternal) {
            
            // Client Search & Recent Orders
            if (lowerMsg.includes('klient') || lowerMsg.includes('client') || lowerMsg.includes('kontak') || lowerMsg.includes('info') || lowerMsg.includes('užsakym')) {
                // Use word stems to handle Lithuanian grammer (e.g., "Giedrės" -> "Giedr")
                const searchTerms = message_text.replace(/[?!.,]/g, '').split(/\s+/).filter(w => w.length > 3 && !['apie', 'kokie', 'yra', 'koks', 'kokia', 'rasti', 'kontaktai', 'kliento', 'užsakymai', 'paskutiniai', 'paskutinius'].includes(w.toLowerCase()));
                
                if (searchTerms.length > 0) {
                    const orQuery = searchTerms.map(w => {
                        const stem = w.length > 4 ? w.substring(0, w.length - 2) : w;
                        return `name.ilike.%${stem}%,email.ilike.%${stem}%,company.ilike.%${stem}%`;
                    }).join(',');
                    
                    const { data: clientData } = await supabase
                        .from('clients')
                        .select('id, name, email, phone, company, notes, city, address')
                        .or(orQuery)
                        .limit(5);
                    
                    if (clientData?.length > 0) {
                        systemContext += "\n\nMATCHING CLIENTS:";
                        clientData.forEach(c => {
                            systemContext += `\n- ${c.name} (${c.company || 'Private'}): ${c.email || 'No email'}, ${c.phone || 'No phone'}. Notes: ${c.notes || 'None'}`;
                        });

                        // If asking for orders, fetch them for the all matched clients (limit 3)
                        if (lowerMsg.includes('užsakym') || lowerMsg.includes('order')) {
                            const clientIds = clientData.map(c => c.id).slice(0, 3);
                            const { data: recentOrders } = await supabase
                                .from('orders')
                                .select('order_number, status, total_price, created_at, finish_date, client_id')
                                .in('client_id', clientIds)
                                .order('created_at', { ascending: false })
                                .limit(10);
                            
                            if (recentOrders?.length > 0) {
                                systemContext += `\n\nRECENT ORDERS:`;
                                recentOrders.forEach(o => {
                                    const c = clientData.find(cd => cd.id === o.client_id);
                                    systemContext += `\n- [${o.order_number}] for ${c?.name}: ${o.status}, ${o.total_price} EUR (Created: ${o.created_at}, Finish: ${o.finish_date})`;
                                });
                            }
                        }
                    }
                }
            }

            // Order Search
            const orderMatch = message_text.match(/\d{4}-\d{4}/); // Match 2026-1186 format
            if (orderMatch) {
                const { data: orderData } = await supabase
                    .from('orders')
                    .select('order_number, status, total_price, notes, finish_date, clients(name)')
                    .eq('order_number', orderMatch[0])
                    .single();
                
                if (orderData) {
                    systemContext += `\n\nORDER INFO [${orderData.order_number}]:`;
                    systemContext += `\n- Client: ${orderData.clients?.name}`;
                    systemContext += `\n- Status: ${orderData.status}`;
                    systemContext += `\n- Total: ${orderData.total_price} EUR`;
                    systemContext += `\n- Finish Date: ${orderData.finish_date}`;
                    systemContext += `\n- Staff Notes: ${orderData.notes || 'None'}`;
                }
            }

            // Calculation Rules Search
            if (lowerMsg.includes('taisykl') || lowerMsg.includes('rule') || lowerMsg.includes('skaiciavim')) {
                const { data: rulesData } = await supabase
                    .from('calculation_rules')
                    .select('*')
                    .eq('is_active', true)
                    .order('priority', { ascending: false });
                
                if (rulesData?.length > 0) {
                    systemContext += "\n\nACTIVE CALCULATION RULES:";
                    rulesData.forEach(r => {
                        systemContext += `\n- ${r.name || r.rule_type}: ${r.value} (Priority: ${r.priority})`;
                    });
                }
            }
        }

        // 4. Fallback Pricing Search (Simplified - works for both)
        if (lowerMsg.includes('kaina') || lowerMsg.includes('price')) {
            const searchTerm = lowerMsg.replace(/kaina|kainuoja|price|cost|kokia|kiek/g, '').trim();
            if (searchTerm.length > 3) {
                const { data: priceData } = await supabase
                    .from('order_items')
                    .select('unit_price, quantity')
                    .ilike('product_type', `%${searchTerm}%`)
                    .limit(30);

                if (priceData && priceData.length > 0) {
                    systemContext += "\n\nESTIMATED PRICING (Averages):";
                    // Just add a few samples for brevity
                    priceData.slice(0, 3).forEach(p => {
                       systemContext += `\n- ${searchTerm} (Qty: ${p.quantity}): ~${p.unit_price} EUR/unit`;
                    });
                }
            }
        }

        // 4. OpenAI Request
        const messages = [{ role: "system", content: systemContext }];
        if (history) {
            [...history].reverse().forEach(msg => {
                messages.push({ role: msg.role, content: msg.content });
            });
        }

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const completion = await openai.chat.completions.create({
            messages: messages,
            model: "gpt-4o",
        });

        const aiResponse = completion.choices[0].message.content;

        // 5. Save AI Response
        await supabase.from('chat_messages').insert({
            session_id: sender_id,
            role: 'assistant',
            content: aiResponse
        });

        return aiResponse;

    } catch (error) {
        console.error("AI Logic Error:", error);
        throw error;
    }
}
