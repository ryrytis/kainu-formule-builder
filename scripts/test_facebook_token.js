
import fetch from 'node-fetch';
import 'dotenv/config';

const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

async function testToken() {
    console.log("Testing Facebook Page Access Token...");
    console.log("Token starts with:", PAGE_ACCESS_TOKEN ? PAGE_ACCESS_TOKEN.substring(0, 10) : 'MISSING');

    if (!PAGE_ACCESS_TOKEN) return;

    try {
        const res = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${PAGE_ACCESS_TOKEN}&fields=id,name`);
        const data = await res.json();
        
        if (res.ok) {
            console.log("✅ Token is VALID for Page:", data.name);
            console.log("Page ID:", data.id);
        } else {
            console.error("❌ Token is INVALID:", data);
        }
        
        const debugRes = await fetch(`https://graph.facebook.com/debug_token?input_token=${PAGE_ACCESS_TOKEN}&access_token=${PAGE_ACCESS_TOKEN}`);
        const debugData = await debugRes.json();
        console.log("\nDebug Token Info:", JSON.stringify(debugData, null, 2));

    } catch (err) {
        console.error("Error testing token:", err);
    }
}

testToken();
