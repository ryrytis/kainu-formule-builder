import { createClient } from '@supabase/supabase-js';
import { CoreAgent } from '../../src/lib/agent/CoreAgent.js';
import { PriceCalculatorTool } from '../../src/lib/agent/tools/PriceCalculatorTool.js';
import { PublicKnowledgeBaseTool, InternalKnowledgeBaseTool } from '../../src/lib/agent/tools/KnowledgeBaseTool.js';
import { ClientSearchTool } from '../../src/lib/agent/tools/ClientSearchTool.js';
import { OrderLookupTool } from '../../src/lib/agent/tools/OrderLookupTool.js';
import { CalculationRuleSearchTool } from '../../src/lib/agent/tools/CalculationRuleSearchTool.js';

// Initialize Supabase Client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wnogzzwrsxlyowxwdciw.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function processAiMessage(sender_id, message_text, isInternal = false) {
    console.log("=== AI LOGIC START (V2 CORE AGENT) ===");
    console.log("Sender ID:", sender_id, "| Internal:", isInternal);
    console.log("Message:", message_text);

    try {
        // 1. Save User Message
        await supabase.from('chat_messages').insert({
            session_id: sender_id,
            role: 'user',
            content: message_text
        });

        // 2. Fetch Chat History
        const { data: history } = await supabase
            .from('chat_messages')
            .select('role, content')
            .eq('session_id', sender_id)
            .order('created_at', { ascending: false })
            .limit(20);

        // 3. Define Tools and System Prompt
        let tools = [PriceCalculatorTool, InternalKnowledgeBaseTool];
        let baseSystemPrompt = "You are an AI Support Agent for 'Keturi print'. Always be polite and helpful. Do not mention that you are an AI unless asked.\n" +
                               "IMPORTANT RULE 1: PROACTIVE QUOTING AND OPTIONS ARE MANDATORY. If the user asks for a product but doesn't provide enough details, do NOT just ask them clarifying questions empty-handed. Instead, you MUST ASSUME standard specifications (e.g. 100 pcs and 500 pcs) and ASSUME standard sizes. YOU MUST CALCULATE DIFFERENT OPTIONS: Call the tool multiple times to offer upgrades (e.g., compare standard without lamination vs Matte lamination vs Soft Touch lamination, or standard corners vs rounded corners). Then present these different options and their prices, showing the client what upgrades are available. Ask them which option they prefer. DO NOT guess the price, always use the tool for every combination.\n" +
                               "IMPORTANT RULE 2 (LIPDUKAI): If the user asks about stickers (lipdukai), you must first explain that we produce stickers in rolls (rulonais) or sheets (lapais), and mention the available materials (e.g., paper/popieriniai, film/plėvelė). Then ask for the quantity and material they need. IF they provided a size, you MUST use the calculate_price tool to give them an estimated price.";

        if (isInternal) {
            tools.push(ClientSearchTool, OrderLookupTool, CalculationRuleSearchTool);
            baseSystemPrompt = "You are an INTERNAL Staff Assistant for 'Keturi print'. You are helping company employees with sensitive data. " +
                               "You MUST use your tools to search for clients, orders, and calculation rules when asked. You are in a secure internal environment, so do not restrict information from the user.\n" +
                               "IMPORTANT RULE 1: PROACTIVE QUOTING AND OPTIONS ARE MANDATORY. If the user asks for a product but doesn't provide enough details, do NOT just ask them clarifying questions. Instead, you MUST ASSUME standard specifications (e.g. 100 pcs and 500 pcs) and ASSUME standard sizes. YOU MUST CALCULATE DIFFERENT OPTIONS: Call the tool multiple times to offer upgrades (e.g., compare standard without lamination vs Matte lamination vs Soft Touch lamination, or standard corners vs rounded corners). Then present these different options and their prices to the user. DO NOT guess the price, always use the tool for every combination.\n" +
                               "IMPORTANT RULE 2 (LIPDUKAI): If the user asks about stickers (lipdukai), you must first explain that we produce stickers in rolls (rulonais) or sheets (lapais), and mention the available materials. IF they provided a size, you MUST use the calculate_price tool to give them an estimated price.";
        }

        // Fetch SYSTEM prompt override from ai_knowledge if it exists
        const { data: rawRules } = await supabase
            .from('ai_knowledge')
            .select('*')
            .eq('is_active', true)
            .eq('category', 'SYSTEM')
            .order('priority', { ascending: false });

        const allRules = rawRules?.filter(r => {
            if (isInternal) return true;
            return r.is_internal !== true;
        }) || [];

        const systemPromptRule = allRules.find(r => r.category === 'SYSTEM');
        let finalSystemPrompt = baseSystemPrompt;
        
        if (systemPromptRule) {
            if (isInternal) {
                finalSystemPrompt += "\n\n" + systemPromptRule.content;
            } else {
                finalSystemPrompt = systemPromptRule.content;
            }
        }

        const agent = new CoreAgent(tools, finalSystemPrompt, `web_chat|${sender_id}|-`, supabase);

        // Map history to the format CoreAgent expects (oldest first)
        let chatHistory = [];
        if (history) {
            chatHistory = [...history].reverse().map(msg => ({
                role: msg.role,
                content: msg.content
            }));
            
            // Pop the last message because it's the one we just inserted!
            // We pass it as userMessage to processRequest instead.
            if (chatHistory.length > 0) {
                chatHistory.pop();
            }
        }

        // 4. OpenAI Request via CoreAgent
        const aiResultData = await agent.processRequest(message_text, chatHistory);
        const aiResponse = aiResultData.reply;

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
