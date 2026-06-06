import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { CoreAgent } from './src/lib/agent/CoreAgent.js';
import { PriceCalculatorTool } from './src/lib/agent/tools/PriceCalculatorTool.js';
import { KnowledgeBaseTool } from './src/lib/agent/tools/KnowledgeBaseTool.js';

dotenv.config();

const SYSTEM_PROMPT = `You are a friendly, polite, and helpful project manager for Keturiprint, a modern print shop. Your tone should be conversational, warm, and approachable, while still remaining professional. Your task is to analyze an incoming email conversation thread and select exactly ONE route from the available routes.

You have access to:
1. 'calculate_price': PROHIBITED to guess price. YOU MUST USE THIS TOOL if the client asks for a quote and provides enough details.
2. 'search_knowledge_base': Use this for questions about files, shipping, policies, or general knowledge.

Rules:
1. If the user asks for a price, check if they provided enough details. If vague (e.g., "I need stickers"), act like a helpful and friendly print shop project manager. Do NOT guess the price. Use the draft_response to warmly ask whether they need roll (ruloniniai) or sheet (lapais) stickers, paper or film (plėvelė), dimensions, quantity, and if they have a design file ready.
2. If they provided enough details for a price, use the calculate_price tool to fetch the exact live price. DO NOT invent prices.
3. When quoting prices in the email, ALWAYS state clearly that the price is WITHOUT VAT (+ PVM).
4. Address all questions raised in the CURRENT MESSAGE using the knowledge base if necessary.

Available routes:
- QuoteRequest (Kainos užklausa)
- OrderPlacement (Užsakymo pateikimas)
- DesignApproval (Maketo derinimas / failų pateikimas)
- StatusInquiry (Būsenos / pristatymo užklausa)
- InvoiceRequest (Sąskaitos / apmokėjimas)
- Unknown

Output format:
Unless calling a tool, return ONLY valid JSON:
{
  "summarization": "Concise summary",
  "draft_response": "Ready to send email response",
  "intent": "QuoteRequest",
  "route": "QuoteRequest",
  "confidence": 0.0,
  "reasoning": "Short explanation"
}`;

async function test() {
    const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: graphSettings } = await supabase.from('graph_settings').select('*').single();
    
    const tokenUrl = `https://login.microsoftonline.com/${graphSettings.tenant_id}/oauth2/v2.0/token`;
    const tokenBody = new URLSearchParams({
        client_id: graphSettings.client_id,
        client_secret: graphSettings.client_secret,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials'
    });
    const tokenResp = await fetch(tokenUrl, { method: 'POST', body: tokenBody });
    const { access_token } = await tokenResp.json();

    const agent = new CoreAgent([PriceCalculatorTool, KnowledgeBaseTool], SYSTEM_PROMPT);

    // Fetch top 3 messages from Agniete's inbox
    const emailResp = await fetch(`https://graph.microsoft.com/v1.0/users/agniete@keturiprint.lt/mailFolders/inbox/messages?$top=3&$select=subject,bodyPreview,body,from,toRecipients,receivedDateTime,conversationId,hasAttachments,categories`, {
        headers: { 'Authorization': `Bearer ${access_token}` }
    });
    
    const data = await emailResp.json();
    for (const msg of data.value) {
        if (msg.from?.emailAddress?.address?.includes('agniety')) {
            console.log('\n========================================');
            console.log(`Processing email ID: ${msg.id} | Subject: ${msg.subject}`);
            
            const htmlToText = (html: string) => html.replace(/<[^>]*>?/gm, '');
            const currentMessageText = htmlToText(msg.body?.content || msg.bodyPreview || '');
            const userMessage = `HISTORY:\n\nCURRENT MESSAGE:\n${currentMessageText}`;

            console.log('Sending to agent...');
            const aiResultData = await agent.processRequest(userMessage);
            console.log('AGENT RAW REPLY:');
            console.log(aiResultData.reply);

            let aiResult: any = null;
            try {
                const cleanJson = aiResultData.reply.replace(/```json/g, '').replace(/```/g, '').trim();
                aiResult = JSON.parse(cleanJson);
            } catch (parseErr) {
                console.error('Failed to parse Agent JSON:', aiResultData.reply);
            }

            if (aiResult && aiResult.draft_response) {
                console.log('Attempting to create draft via Graph API...');
                const draftResp = await fetch(`https://graph.microsoft.com/v1.0/users/agniete@keturiprint.lt/messages/${msg.id}/createReply`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${access_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: {
                            body: {
                                contentType: "html",
                                content: aiResult.draft_response.replace(/\n/g, '<br>')
                            }
                        }
                    })
                });

                if (draftResp.ok) {
                    console.log('Successfully created draft!');
                } else {
                    console.error('Failed to create draft:', await draftResp.text());
                }
            }
        }
    }
}

test();
