
import dotenv from 'dotenv';
dotenv.config();
import { processAiMessage } from './api/_lib/ai_logic.js';

async function runTests() {
    console.log("--- TEST 1: Internal Client Search (Giedrė) ---");
    try {
        const response1 = await processAiMessage("test-staff-1", "Kokie yra Giedrės Onutės Barzdaitės kontaktai?", true);
        console.log("Response 1:", response1);
    } catch (e) { console.error("Test 1 Failed:", e); }

    console.log("\n--- TEST 2: Internal Recent Orders (Tilis) ---");
    try {
        const response2 = await processAiMessage("test-staff-1", "paskutiniai 5 tilio užsakymai?", true);
        console.log("Response 2:", response2);
    } catch (e) { console.error("Test 2 Failed:", e); }

    console.log("\n--- TEST 3: External Privacy Check ---");
    try {
        const response3 = await processAiMessage("test-customer-1", "paskutiniai 5 tilio užsakymai?", false);
        console.log("Response 3:", response3);
    } catch (e) { console.error("Test 3 Failed:", e); }
}

runTests();
