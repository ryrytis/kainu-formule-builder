import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { clientName, orderNo, fileUrl, tracking } = req.body;
        if (!fileUrl) {
            return res.status(400).json({ error: 'Missing fileUrl' });
        }

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
            const errText = await tokenResp.text();
            console.error('Failed to get MS Graph token', errText);
            return res.status(500).json({ error: 'Failed to authenticate with MS Graph' });
        }

        const tokenData = await tokenResp.json();
        const accessToken = tokenData.access_token;

        // 3. Download the PDF file from the public URL
        const fileResp = await fetch(fileUrl);
        if (!fileResp.ok) {
            console.error('Failed to download PDF from URL', fileUrl);
            return res.status(500).json({ error: 'Failed to download PDF attachment' });
        }
        
        const arrayBuffer = await fileResp.arrayBuffer();
        const base64Content = Buffer.from(arrayBuffer).toString('base64');
        const filename = `Invoice_${tracking}.pdf`;

        // 4. Send Email via MS Graph
        const senderEmail = 'rytis@keturiprint.lt'; // Sending from and to Rytis
        const mailEndpoint = `https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`;

        const mailPayload = {
            message: {
                subject: `New Invoice ${tracking} for ${clientName}`,
                body: {
                    contentType: "HTML",
                    content: `<p>A new internal invoice has been generated for order <b>${orderNo}</b> (Client: ${clientName}).</p><p>The PDF is attached to this email.</p>`
                },
                toRecipients: [
                    {
                        emailAddress: {
                            address: senderEmail
                        }
                    }
                ],
                attachments: [
                    {
                        "@odata.type": "#microsoft.graph.fileAttachment",
                        name: filename,
                        contentType: "application/pdf",
                        contentBytes: base64Content
                    }
                ]
            },
            saveToSentItems: "false"
        };

        const mailResp = await fetch(mailEndpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(mailPayload)
        });

        if (!mailResp.ok) {
            const errText = await mailResp.text();
            console.error('Failed to send mail via MS Graph', errText);
            return res.status(500).json({ error: 'Failed to send mail via MS Graph' });
        }

        return res.status(200).json({ success: true, message: 'Email sent successfully via Graph API' });

    } catch (error: any) {
        console.error("send_internal_invoice Error:", error);
        return res.status(500).json({ error: error.message });
    }
}
