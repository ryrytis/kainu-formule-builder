import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const USER = 'keturiprint';
const PASS = 'ta9dm5l77';
const API_ID = '33451';

async function tryCombo(id, name, deliveryType) {
    const seq = Math.floor(Math.random() * 800000) + 9900000;
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const manifestTitle = `${API_ID}${dateStr}${Math.floor(Math.random() * 999).toString().padStart(3, '0')}`;
    const packNo = `V${API_ID}E${seq}`;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<description type="4">
    <manifest title="${manifestTitle}">
        <shipment>
            <consignee>
                <name>${name}</name>
                <company_code>${id}</company_code>
                <country>LT</country>
                <city>Gargždai</city>
                <address>Karaliaus Mindaugo g. 3-50</address>
                <post_code>96144</post_code>
                <contact_person>Test User</contact_person>
                <contact_tel>+37060000000</contact_tel>
            </consignee>
            <sender>
                <name>Keturi print, MB</name>
                <company_code>0</company_code>
                <country>LT</country>
                <city>Ramučiai</city>
                <address>Pakalnės 8-2</address>
                <post_code>54464</post_code>
                <contact_person>Agnietė</contact_person>
                <contact_tel>+37069663915</contact_tel>
            </sender>
            <attribute>
                <delivery_type>${deliveryType}</delivery_type>
                <delivery_mode>0</delivery_mode>
            </attribute>
            <pack>
                <pack_no>${packNo}</pack_no>
                <weight>0.1</weight>
                <volume>1</volume>
            </pack>
        </shipment>
    </manifest>
</description>`;

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
    console.log(`TRY: ID=${id}, NAME="${name}", TYPE=${deliveryType}`);
    console.log(`RESPONSE: ${text}`);
    return text.includes('<status>1</status>');
}

async function runTests() {
    console.log('--- STARTING DIAGNOSTICS ---');
    // Try 1: DB ID with simple name (matches manual test style)
    await tryCombo('4117', 'API TEST USER', 'nwd');

    // Try 2: pastomat_id with simple name
    await tryCombo('4691', 'API TEST USER', 'nwd');

    // Try 3: DB ID with 'pickup' type
    await tryCombo('4117', 'API TEST USER', 'pickup');
}

runTests();
