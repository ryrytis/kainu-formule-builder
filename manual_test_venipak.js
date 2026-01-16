
import fs from 'fs';

const API_ID = '33451';
const TERMINAL_CODE = '300561011'; // Gargždų Udrop
const USER = 'keturiprint';
const PASS = 'ta9dm5l77';

function generatePayload() {
    const seq = Math.floor(Math.random() * 800000) + 9910000;
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const manifestTitle = `${API_ID}${dateStr}${Math.floor(Math.random() * 999).toString().padStart(3, '0')}`;
    const packNo = `V${API_ID}E${seq}`;

    console.log(`[GENERATED] Pack No: ${packNo}`);

    return `<?xml version="1.0" encoding="UTF-8"?>
<description type="4">
    <manifest title="${manifestTitle}">
        <shipment>
            <consignee>
                <name>Venipak locker, Gargždų Udrop AIBĖ</name>
                <company_code>${TERMINAL_CODE}</company_code>
                <country>LT</country>
                <city>Gargždai</city>
                <address>Karaliaus Mindaugo g. 3-50</address>
                <post_code>96144</post_code>
                <contact_person>Rytis Test</contact_person>
                <contact_tel>+37060000000</contact_tel>
                <contact_email>rytis@keturiprint.lt</contact_email>
            </consignee>
            <sender>
                <name>Keturi print, MB</name>
                <company_code>0</company_code>
                <country>LT</country>
                <city>Ramučiai</city>
                <address>Pakalnės 8-2</address>
                <post_code>54464</post_code>
                <contact_person>Agnietė Suknelevičienė</contact_person>
                <contact_tel>+37069663915</contact_tel>
                <contact_email>agniete@keturiprint.lt</contact_email>
            </sender>
            <attribute>
                <delivery_type>nwd</delivery_type>
                <delivery_mode>0</delivery_mode>
                <comment_text>FIX VERIFICATION - LOCKER ASSIGNMENT</comment_text>
            </attribute>
            <pack>
                <pack_no>${packNo}</pack_no>
                <description></description>
                <weight>0.1</weight>
                <volume>0.01</volume>
            </pack>
        </shipment>
    </manifest>
</description>`;
}

async function createShipment(xml) {
    console.log('[STEP 1] Creating Shipment...');
    const params = new URLSearchParams();
    params.append('user', USER);
    params.append('pass', PASS);
    params.append('xml_text', xml);

    const res = await fetch('https://go.venipak.lt/import/send.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
    });

    const text = await res.text();
    console.log(`[RESPONSE] ${text}`);
    return text;
}

async function getLabel(packNo) {
    console.log(`[STEP 2] Fetching Label for: ${packNo}`);

    // User's Power Automate structure: multipart/form-data with pack_no[]
    const formData = new FormData();
    formData.append('user', USER);
    formData.append('pass', PASS);
    formData.append('pack_no[]', packNo);
    formData.append('format', 'other');
    formData.append('carrier', 'venipak');
    formData.append('printReturns', '1');

    const res = await fetch('https://go.venipak.lt/import/print_label.php', {
        method: 'POST',
        body: formData
    });

    if (res.status === 200 && res.headers.get('content-type')?.includes('pdf')) {
        console.log('✅ SUCCESS! PDF Label received.');
        const buf = await res.arrayBuffer();
        const filename = `label_${packNo}.pdf`;
        fs.writeFileSync(filename, Buffer.from(buf));
        console.log(`Saved to ${filename} (${buf.byteLength} bytes)`);
    } else {
        const err = await res.text();
        console.log(`❌ FAILED to get label. Status: ${res.status}`);
        console.log(`Body: ${err}`);
    }
}



async function run() {
    try {
        // 1. Send
        const xml = generatePayload();
        const responseText = await createShipment(xml);

        // 2. Extract ID (Regex as per user instructions)
        // Check <shipment_no> first, then <text>
        let matchedId = null;
        const shipmentMatch = responseText.match(/<shipment_no>(.*?)<\/shipment_no>/);
        const textMatch = responseText.match(/<text>(.*?)<\/text>/);

        if (shipmentMatch) {
            matchedId = shipmentMatch[1];
            console.log(`✅ Extracted Shipment No: ${matchedId}`);
        } else if (textMatch) {
            matchedId = textMatch[1];
            console.log(`✅ Extracted Text ID: ${matchedId}`);
        } else {
            // Check for DB error specifically
            if (responseText.includes('database')) console.error('❌ API Error: DB Connection Failed at Venipak');
            console.error('❌ Could not extract ID from response.');
            return;
        }

        console.log('Waiting 5 seconds for Venipak to process manifest...');
        await new Promise(r => setTimeout(r, 5000));

        // 3. Get Label
        await getLabel(matchedId);

    } catch (e) {
        console.error('FATAL ERROR:', e);
    }
}


run();

