require('dotenv').config({ path: '.env' });
const fetch = require('node-fetch'); // we can use native fetch in node 18+

async function run() {
    const url = 'https://default31cd0426724949cbb20df8ce909f8c.6e.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/c365ea22a5a94243b586573efa67bcf8/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=8yH1JtN_BEWaXemjCse9sqWuWhoXKFIlyUqRqg4ZZjw';

    const payload = {
        type: 'invoice',
        email: 'rytis@keturiprint.lt',
        clientName: 'Test Client',
        orderNo: '12345',
        fileUrl: 'https://wnogzzwrsxlyowxwdciw.supabase.co/storage/v1/object/public/order-files/12345/test.pdf',
        tracking: 'INV-TEST',
        message: `New Invoice INV-TEST for Test Client`
    };

    console.log("Sending payload:", payload);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const text = await response.text();
            console.error(`Webhook failed: ${response.status} ${text}`);
        } else {
            console.log("Webhook succeeded with status 200 OK!");
        }
    } catch (err) {
        console.error("Error triggering webhook:", err);
    }
}

run();
