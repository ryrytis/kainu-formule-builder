import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testInvoice() {
    console.log('--- Saskaita123 Production Test ---');

    // 1. Fetch real settings
    const { data: dbSettings } = await supabase
        .from('SASKAITA123Data')
        .select('*')
        .single();

    if (!dbSettings) {
        console.error('Settings not found');
        return;
    }

    const apiKey = dbSettings.apiKey;
    const settings = {
        series_id: dbSettings.seriesid,
        bank_id: dbSettings.bankid,
        vat_id: dbSettings.vatid,
        unit_id: dbSettings.unitid,
    };

    // 2. Fetch a real order to test with
    const { data: order } = await supabase
        .from('orders')
        .select('*, clients(*), order_items(*)')
        .limit(1)
        .single();

    if (!order) {
        console.error('No orders found to test with');
        return;
    }

    const clientName = order.clients.company || order.clients.name;
    const clientAddress = order.clients.address || '';
    const clientCode = order.clients.vat_code || '00000000';
    const vatCode = order.clients.vat_code || '';
    const isCompany = !!order.clients.company;
    const codeType = isCompany ? 'company' : 'personal';

    // 3. Construct payload (Same as SaskaitaService.ts)
    const payload = {
        type: "simple",
        series_id: settings.series_id,
        activity_id: null,
        project_id: null,
        date: new Date().toISOString().split('T')[0],
        date_due: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        date_due_show: true,
        total: String(order.total_price || 0),
        discount: "0",
        discount_type: "percent",
        discount_value: "0",
        issued_by: "System",
        issued_to: clientName,
        note_enabled: true,
        note: order.notes || "",
        comment_enabled: true,
        comment: null,
        banks: [
            settings.bank_id
        ],
        client: {
            name: clientName,
            address: clientAddress,
            code: clientCode,
            code_type: codeType,
            vat_code: vatCode,
            email: order.clients.email,
            phone: order.clients.phone,
            country_code: "lt"
        },
        products: order.order_items.map((item) => ({
            company_vat_id: settings.vat_id,
            title: `${item.product_type || 'Service'} ${item.print_type ? `- ${item.print_type}` : ''}`.trim(),
            id: "",
            price: String(item.unit_price || 0),
            quantity: item.quantity || 1,
            total: String(item.total_price || (item.unit_price * item.quantity) || 0),
            unit_id: settings.unit_id || 'vnt',
            discount: "0",
            discount_type: "percent"
        })),
        send_email: 0,
        language: "lt",
        template_id: null
    };

    console.log('Payload:', JSON.stringify(payload, null, 2));

    // 4. Send request (Directly to Saskaita123, bypassing proxy to see raw error)
    const url = 'https://app.invoice123.com/api/v1.0/invoices';
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'User-Agent': 'KainuCRM/1.0'
            },
            body: JSON.stringify(payload)
        });

        const responseText = await response.text();
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            data = { message: responseText };
        }

        if (!response.ok) {
            console.log('--- ERROR RESPONSE FROM SASKAITA ---');
            console.log(`Status: ${response.status}`);
            console.log('Data:', JSON.stringify(data, null, 2));
        } else {
            console.log('--- SUCCESS RESPONSE FROM SASKAITA ---');
            console.log('Data:', JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error('Fetch Error:', e);
    }
}

testInvoice();
