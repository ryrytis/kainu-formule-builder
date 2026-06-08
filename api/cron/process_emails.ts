export const maxDuration = 60; // Allowed up to 60s on Vercel Hobby

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { CoreAgent } from '../../src/lib/agent/CoreAgent.js';
import { PriceCalculatorTool } from '../../src/lib/agent/tools/PriceCalculatorTool.js';
import { InternalKnowledgeBaseTool } from '../../src/lib/agent/tools/KnowledgeBaseTool.js';

const SYSTEM_PROMPT = `You are a friendly, polite, and helpful project manager for Keturiprint, a modern print shop. Your tone should be conversational, warm, and approachable, while still remaining professional. Your task is to analyze an incoming email conversation thread and select exactly ONE route from the available routes.

You have access to:
1. 'calculate_price': PROHIBITED to guess price. YOU MUST USE THIS TOOL if the client asks for a quote and provides enough details.
2. 'search_knowledge_base': Use this for questions about files, shipping, policies, or general knowledge.

Rules:
1. PROACTIVE QUOTING AND OPTIONS ARE MANDATORY: If the user asks for prices (e.g., business cards, gift vouchers) but doesn't provide enough details, YOU MUST CALL the 'calculate_price' tool BEFORE writing your response. Do NOT just ask them clarifying questions empty-handed. 
    - You MUST ASSUME standard specifications (e.g. 100 pcs and 500 pcs).
    - You MUST ASSUME standard sizes (e.g. 90x50 for business cards, DL for gift vouchers).
    - You MUST CALCULATE DIFFERENT OPTIONS: Call the tool multiple times to offer upgrades (e.g., compare standard without lamination vs Matte lamination vs Soft Touch lamination, or standard corners vs rounded corners).
    - Then, in your draft_response, present these different options and their prices, showing the client what upgrades are available and how they affect the price. Ask them which option they prefer. DO NOT guess the price, always use the tool for every combination.
2. STICKERS (Lipdukai) PROTOCOL: If the user asks about stickers, you must first explain that we produce stickers in rolls (rulonais) or sheets (lapais), and mention the available materials (e.g., paper/popieriniai, film/plėvelė). Then ask for the quantity and material they need. IF they provided a size, you MUST use the calculate_price tool to give them an estimated price.
3. If they provided enough details for a price, use the calculate_price tool to fetch the exact live price. DO NOT invent prices.
4. When quoting prices in the email, ALWAYS state clearly that the price is WITHOUT VAT (+ PVM).
5. Address all questions raised in the CURRENT MESSAGE using the knowledge base if necessary.

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && req.headers['x-api-key'] !== process.env.INTERNAL_API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('Cron Job: Starting Email Processing');

    try {
        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return res.status(500).json({ error: 'Missing Supabase credentials' });
        }

        const supabase = createClient(supabaseUrl.trim(), supabaseKey.trim());
        // 1. Fetch MS Graph Credentials
        const { data: graphSettings, error: graphErr } = await supabase
            .from('graph_settings')
            .select('*')
            .limit(1)
            .maybeSingle();

        if (graphErr || !graphSettings || !graphSettings.tenant_id || !graphSettings.client_id || !graphSettings.client_secret) {
            console.error('Graph Credentials missing from DB');
            return res.status(500).json({ error: 'Graph credentials not configured in DB' });
        }

        // 2. Authenticate with Microsoft Graph
        const tokenUrl = `https://login.microsoftonline.com/${graphSettings.tenant_id}/oauth2/v2.0/token`;
        const tokenBody = new URLSearchParams({
            client_id: graphSettings.client_id,
            client_secret: graphSettings.client_secret,
            scope: 'https://graph.microsoft.com/.default',
            grant_type: 'client_credentials'
        });

        const tokenResp = await fetch(tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: tokenBody.toString()
        });

        if (!tokenResp.ok) {
            const err = await tokenResp.text();
            console.error('Failed to get MS Graph token', err);
            return res.status(500).json({ error: 'Failed to authenticate with MS Graph' });
        }

        const tokenData = await tokenResp.json();
        const accessToken = tokenData.access_token;



        // 3. Fetch Monitored Mailboxes
        const { data: monitors, error: monitorErr } = await supabase
            .from('email_monitors')
            .select('*')
            .eq('is_active', true);

        if (monitorErr || !monitors || monitors.length === 0) {
            console.log('No active email monitors found');
            return res.status(200).json({ message: 'No active monitors' });
        }

        let processedCount = 0;

        for (const monitor of monitors) {
            console.log(`Processing mailbox: ${monitor.email_address}`);

            let requestUrl = monitor.delta_link;
            if (!requestUrl) {
                requestUrl = `https://graph.microsoft.com/v1.0/users/${monitor.email_address}/mailFolders/inbox/messages/delta?$select=subject,bodyPreview,body,from,toRecipients,receivedDateTime,conversationId,hasAttachments,categories`;
            }

            const graphResp = await fetch(requestUrl, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Prefer': 'odata.maxpagesize=50'
                }
            });

            if (!graphResp.ok) {
                console.error(`Graph Delta Error for ${monitor.email_address}:`, await graphResp.text());
                continue;
            }

            const graphData = await graphResp.json();
            const messages = graphData.value || [];

            for (const msg of messages) {
                if (msg['@removed'] || msg.isDraft) continue;

                const senderAddress = msg.from?.emailAddress?.address?.toLowerCase() || '';
                if (
                    !senderAddress || 
                    senderAddress.endsWith('@keturiprint.lt') || 
                    senderAddress.endsWith('@microsoft.com')
                ) continue;

                const subject = (msg.subject || '').toLowerCase();
                const bodyPreview = (msg.bodyPreview || '').toLowerCase();
                
                if (subject.includes('insurancebeemailtracking') || bodyPreview.includes('ai iš laiško parinko')) {
                    continue;
                }

                const categories = msg.categories || [];
                if (categories.includes('Green category') || categories.includes('AI_Processed')) continue;

                const { data: alreadyProcessed } = await supabase
                    .from('chat_messages')
                    .select('id')
                    .eq('session_id', 'PROCESSED_EMAIL')
                    .eq('content', msg.id)
                    .maybeSingle();

                if (alreadyProcessed) continue;

                const receivedDate = new Date(msg.receivedDateTime);
                const oneDayAgo = new Date();
                oneDayAgo.setDate(oneDayAgo.getDate() - 1);
                if (receivedDate < oneDayAgo) continue;

                console.log(`Processing email ID: ${msg.id} | Subject: ${msg.subject}`);

                try {
                    const historyResp = await fetch(`https://graph.microsoft.com/v1.0/users/${monitor.email_address}/messages?$filter=conversationId eq '${msg.conversationId}'&$top=5`, {
                        headers: { 'Authorization': `Bearer ${accessToken}` }
                    });
                    const historyData = await historyResp.json();
                    const historyArray = historyData.value || [];
                    
                    const formattedHistory = historyArray.map((h: any) => 
                        `Sender: ${h.from?.emailAddress?.name || h.from?.emailAddress?.address}\nDate: ${h.receivedDateTime}\nSummary: ${h.bodyPreview}`
                    ).join('\n---Next Message---\n');

                    const htmlToText = (html: string) => html.replace(/<[^>]*>?/gm, '');
                    const currentMessageText = htmlToText(msg.body?.content || msg.bodyPreview || '');

                    // Extract a friendly name from the email address if possible (e.g. agniete@... -> Agnietė)
                    const ownerName = monitor.email_address.split('@')[0].replace('.', ' ');
                    const capitalizedOwner = ownerName.charAt(0).toUpperCase() + ownerName.slice(1);

                    const userMessage = `This email was received by your team member: ${capitalizedOwner} (${monitor.email_address}). Please sign the draft response as ${capitalizedOwner} from the Keturiprint team.

HISTORY:
${formattedHistory}

CURRENT MESSAGE:
${currentMessageText}`;

                    const { data: clientData } = await supabase
                        .from('clients')
                        .select('price_list_id, discount_koef')
                        .eq('email', senderAddress)
                        .maybeSingle();

                    const customPriceTool = {
                        ...PriceCalculatorTool,
                        execute: async (args: any) => {
                            if (clientData?.price_list_id) args.client_price_list_id = clientData.price_list_id;
                            if (clientData?.discount_koef !== undefined && clientData?.discount_koef !== null) args.client_discount_koef = clientData.discount_koef;
                            return await PriceCalculatorTool.execute(args);
                        }
                    };

                    const emailAgent = new CoreAgent(
                        [customPriceTool, InternalKnowledgeBaseTool],
                        SYSTEM_PROMPT,
                        'email_draft',
                        supabase
                    );

                    const aiResultData = await emailAgent.processRequest(userMessage);
                    
                    let aiResult: any = null;
                    try {
                        const cleanJson = aiResultData.reply.replace(/```json/g, '').replace(/```/g, '').trim();
                        aiResult = JSON.parse(cleanJson);
                    } catch (parseErr) {
                        console.error('Failed to parse Agent JSON:', aiResultData.reply);
                    }

                    if (aiResult && aiResult.draft_response) {
                        const draftResp = await fetch(`https://graph.microsoft.com/v1.0/users/${monitor.email_address}/messages/${msg.id}/createReply`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${accessToken}`,
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
                            console.log(`Successfully created draft for: ${msg.subject}`);
                            
                            // Mark as processed invisibly in Supabase
                            await supabase.from('chat_messages').insert({
                                session_id: 'PROCESSED_EMAIL',
                                role: 'assistant',
                                content: msg.id
                            });
                            console.log('Marked email as processed in database silently');
                            processedCount++;
                        } else {
                            console.error(`Failed to create draft:`, await draftResp.text());
                        }
                    }

                } catch (e) {
                    console.error(`Error processing msg ${msg.id}:`, e);
                }
            }

            const nextLink = graphData['@odata.nextLink'];
            const deltaLink = graphData['@odata.deltaLink'];
            const linkToSave = nextLink || deltaLink;

            if (linkToSave && linkToSave !== monitor.delta_link) {
                await supabase
                    .from('email_monitors')
                    .update({ delta_link: linkToSave, updated_at: new Date() })
                    .eq('id', monitor.id);
            }
        }

        return res.status(200).json({ success: true, processed: processedCount });

    } catch (globalError: any) {
        console.error('Global Cron Error:', globalError);
        return res.status(500).json({ error: globalError.message });
    }
}
