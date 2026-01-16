import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

const reportedUrl = "https://default31cd0426724949cbb20df8ce909f8c.6e.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/c365ea22a5a94243b586573efa67bcf8/triggers/manual/paths/invoke?api-version=1";

async function verifyWebhook() {
    const { data, error } = await supabase
        .from('SASKAITA123Data')
        .select('webhook_invoice, webhookUrl, enable_invoice')
        .single();

    if (error) {
        console.error('Error fetching settings:', error);
        return;
    }

    console.log('--- Webhook Verification ---');
    console.log('Stored webhook_invoice:', data.webhook_invoice);
    console.log('Stored webhookUrl (Legacy):', data.webhookUrl);
    console.log('Invoice Webhook Enabled:', data.enable_invoice);
    console.log('Reported URL:', reportedUrl);

    if (data.webhook_invoice === reportedUrl) {
        console.log('MATCH: The stored webhook_invoice matches the reported URL.');
    } else {
        console.log('MISMATCH: The stored webhook_invoice does NOT match the reported URL.');
    }

    if (data.webhookUrl === reportedUrl) {
        console.log('MATCH: The stored legacy webhookUrl matches the reported URL.');
    }
}

verifyWebhook();
