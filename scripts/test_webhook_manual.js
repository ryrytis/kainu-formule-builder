import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testWebhookManual() {
    const invoiceId = '98emg42npjep';
    console.log('--- Testing Webhook Manually with ID: ' + invoiceId + ' ---');

    // 1. Fetch settings
    const { data: dbSettings } = await supabase.from('SASKAITA123Data').select('*').single();
    const hookUrl = dbSettings.webhook_invoice || dbSettings.webhookUrl;

    if (!hookUrl) {
        console.error('Webhook URL not found in settings');
        return;
    }

    // 2. Fetch a real order for metadata
    const { data: order } = await supabase.from('orders').select('*, clients(*)').limit(1).single();

    const payload = {
        type: 'invoice',
        email: order?.clients?.email || 'rytis@keturiprint.lt',
        tracking: invoiceId,
        fileUrl: `https://app.invoice123.com/invoice/${invoiceId}/pdf/lt`,
        clientName: order?.clients?.company || order?.clients?.name || 'Test Client',
        orderNo: order?.order_number || '2026-TEST',
        message: `MANUAL TEST: New Invoice ${invoiceId}`
    };

    console.log('Target URL:', hookUrl);
    console.log('Payload:', JSON.stringify(payload, null, 2));

    try {
        const response = await fetch(hookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        console.log('--- Response Status: ' + response.status + ' ---');
        const text = await response.text();
        console.log('Response Body:', text);
    } catch (e) {
        console.error('Fetch Error:', e);
    }
}

testWebhookManual();
