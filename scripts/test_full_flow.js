import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testInvoice() {
    const { data: dbSettings } = await supabase.from('SASKAITA123Data').select('*').single();
    const { data: order } = await supabase.from('orders').select('*, clients(*), order_items(*)').limit(1).single();

    const clientName = order.clients.company || order.clients.name;
    const clientAddress = order.clients.address || '';
    const clientCode = order.clients.vat_code || '00000000';
    const vatCode = order.clients.vat_code || '';
    const isCompany = !!order.clients.company;
    const codeType = isCompany ? 'company' : 'personal';

    const payload = {
        type: "simple",
        series_id: "onr0rk8rkevd", // Hardcoded for test
        date: new Date().toISOString().split('T')[0],
        total: Number(order.total_price || 0).toFixed(2),
        issued_by: "System",
        issued_to: clientName,
        banks: ["46ej50ndmdzv"], // Hardcoded Swedbank ID
        client: {
            name: clientName,
            address: order.clients.address || '',
            code: order.clients.vat_code || '123456789',
            code_type: "company",
            vat_code: order.clients.vat_code || '',
            email: 'rytis@keturiprint.lt'
        },
        products: [
            {
                title: "Test Item",
                price: "1.00",
                quantity: 1,
                total: "1.00"
            }
        ],
        send_email: 0,
        language: "lt"
    };

    console.log('--- FULL PAYLOAD START ---');
    console.log(JSON.stringify(payload, null, 2));
    console.log('--- FULL PAYLOAD END ---');

    console.log('--- Testing Saskaita123 API directly ---');
    const response = await fetch('https://app.invoice123.com/api/v1.0/invoices', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${dbSettings.apiKey}`,
            'User-Agent': 'KainuCRM/1.0'
        },
        body: Buffer.from(JSON.stringify(payload))
    });

    const responseText = await response.text();
    console.log('--- ERROR_START ---');
    for (let i = 0; i < responseText.length; i += 50) {
        console.log(`CHUNK_${i}: ${responseText.slice(i, i + 50)}`);
    }
    console.log('--- ERROR_END ---');
    process.exit(0);
    console.log(JSON.stringify({ status: response.status, data }, null, 2));

    if (response.ok) {
        console.log('--- Successfully issued invoice! ---');
        const invoiceId = data?.data?.id || data?.id;
        if (invoiceId) {
            console.log(`Invoice ID: ${invoiceId}`);

            // Test PDF fetch
            console.log('--- Testing PDF fetch ---');
            const pdfResp = await fetch(`https://app.invoice123.com/api/v1.0/invoice/${invoiceId}/pdf/lt`, {
                headers: { 'Authorization': `Bearer ${dbSettings.apiKey}` }
            });
            console.log(`PDF Fetch Status: ${pdfResp.status}`);
            if (pdfResp.ok) {
                const blob = await pdfResp.arrayBuffer();
                console.log(`PDF Size: ${blob.byteLength} bytes`);

                // Test Webhook
                const hookUrl = dbSettings.webhook_invoice || dbSettings.webhookUrl;
                console.log(`--- Testing Webhook: ${hookUrl} ---`);
                const hookResp = await fetch(hookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'invoice',
                        email: order.clients.email || 'rytis@keturiprint.lt',
                        tracking: String(invoiceId),
                        fileUrl: 'https://test.com/sample.pdf',
                        clientName: clientName,
                        orderNo: order.order_number,
                        message: `TEST: New Invoice ${invoiceId} for ${clientName}`
                    })
                });
                console.log(`Webhook Status: ${hookResp.status}`);
            }
        }
    }
}

testInvoice();
```
