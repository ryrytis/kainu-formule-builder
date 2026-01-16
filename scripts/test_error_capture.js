import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testInvoice() {
    const { data: dbSettings } = await supabase.from('SASKAITA123Data').select('*').single();
    const { data: order } = await supabase.from('orders').select('*, clients(*)').limit(1).single();

    const clientName = order.clients.company || order.clients.name;
    const payload = {
        type: "simple",
        series_id: "onr0rk8rkevd",
        date: new Date().toISOString().split('T')[0],
        total: (1.21).toFixed(2),
        issued_by: "System",
        issued_to: clientName,
        banks: [dbSettings.bankid],
        client: {
            name: clientName,
            address: "Test Address",
            code: "123456789",
            code_type: "company",
            email: "rytis@keturiprint.lt"
        },
        products: [
            {
                company_vat_id: dbSettings.vatid,
                title: "Test Item",
                price: (1.00).toFixed(2),
                quantity: 1,
                total: (1.00).toFixed(2),
                unit_id: dbSettings.unitid || 'vnt'
            }
        ],
        send_email: 0,
        language: "lt"
    };

    console.log('--- PAYLOAD ---');
    console.log(JSON.stringify(payload));

    const response = await fetch('https://app.invoice123.com/api/v1.0/invoices', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${dbSettings.apiKey}`,
            'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const text = await response.text();
    console.log('--- STATUS: ' + response.status + ' ---');
    console.log('--- TOTAL_LENGTH: ' + text.length + ' ---');
    console.log('--- ERROR_START ---');
    for (let i = 0; i < text.length; i += 20) {
        console.log(`[${i}-${i + 20}]: ${text.slice(i, i + 20)}`);
    }
    console.log('--- ERROR_END ---');
}

testInvoice();
