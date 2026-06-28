require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    try {
        const fileUrl = 'https://wnogzzwrsxlyowxwdciw.supabase.co/storage/v1/object/public/order-files/12345/test.pdf';
        const clientName = 'Test Client';
        const orderNo = '12345';
        const tracking = 'INV-TEST';

        console.log("Fetching Graph Settings...");
        const { data: graphSettings, error: graphErr } = await supabase
            .from('graph_settings')
            .select('*')
            .limit(1)
            .maybeSingle();

        if (graphErr || !graphSettings || !graphSettings.tenant_id) {
            throw new Error('Graph Credentials missing');
        }

        console.log("Authenticating with Microsoft Graph...");
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

        if (!tokenResp.ok) throw new Error(await tokenResp.text());
        const accessToken = (await tokenResp.json()).access_token;
        console.log("Token obtained!");

        console.log("Downloading PDF from URL:", fileUrl);
        const fileResp = await fetch(fileUrl);
        if (!fileResp.ok) throw new Error("Failed to download PDF");
        
        const arrayBuffer = await fileResp.arrayBuffer();
        const base64Content = Buffer.from(arrayBuffer).toString('base64');
        const filename = `Invoice_${tracking}.pdf`;

        console.log("Sending mail with attachment...");
        const senderEmail = 'rytis@keturiprint.lt';
        const mailEndpoint = `https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`;

        const mailPayload = {
            message: {
                subject: `New Invoice ${tracking} for ${clientName}`,
                body: {
                    contentType: "HTML",
                    content: `<p>A new internal invoice has been generated for order <b>${orderNo}</b>.</p>`
                },
                toRecipients: [
                    { emailAddress: { address: senderEmail } }
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
            console.error('Failed to send mail via MS Graph:', await mailResp.text());
        } else {
            console.log("Mail sent successfully!");
        }

    } catch (e) {
        console.error(e);
    }
}

run();
