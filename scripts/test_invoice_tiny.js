import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testInvoice() {
    const { data: dbSettings } = await supabase.from('SASKAITA123Data').select('*').single();
    const { data: order } = await supabase.from('orders').select('*, clients(*), order_items(*)').limit(1).single();

    const clientName = order.clients.company || order.clients.name;
    const payload = {
        type: "simple",
        series_id: dbSettings.seriesid,
        date: new Date().toISOString().split('T')[0],
        date_due: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        date_due_show: true,
        total: Number(order.total_price || 0).toFixed(2),
        issued_by: "System",
        issued_to: clientName,
        banks: [dbSettings.bankid],
        client: {
            name: clientName,
            address: order.clients.address || '',
            code: order.clients.vat_code || '00000000',
            code_type: order.clients.company ? 'company' : 'personal',
            vat_code: order.clients.vat_code || '',
            email: 'rytis@keturiprint.lt', // Back to Rytis for Saskaita API
            phone: order.clients.phone,
            country_code: "lt"
        },
        products: order.order_items.map((item) => ({
            company_vat_id: dbSettings.vatid,
            title: `${item.product_type || 'Service'} ${item.print_type ? `- ${item.print_type}` : ''}`.trim(),
            price: Number(item.unit_price || 0).toFixed(2),
            quantity: item.quantity || 1,
            total: Number(item.total_price || (item.unit_price * item.quantity) || 0).toFixed(2),
            unit_id: dbSettings.unitid || 'vnt',
            id: "",
            discount: "0",
            discount_type: "percent"
        })),
        send_email: 0,
        language: "lt",
        template_id: null
    };

    const response = await fetch('https://app.invoice123.com/api/v1.0/invoices', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${dbSettings.apiKey}`,
            'User-Agent': 'KainuCRM/1.0'
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log(JSON.stringify({ status: response.status, data }, null, 2));
}

testInvoice();
