
import 'dotenv/config';
import handler from '../api/messenger_webhook.js';

// Mock console.log/error to keep output clean, or keep them to see flow
// console.log = () => {};

async function runTests() {
    console.log("--- Starting Webhook Tests ---");

    // Mock Environment Variables
    // process.env.FACEBOOK_VERIFY_TOKEN = 'test_verify_token';
    // process.env.OPENAI_API_KEY = 'mock_openai_key'; // Commented out to use real key from .env
    // process.env.FACEBOOK_PAGE_ACCESS_TOKEN = 'mock_page_token';

    // Helper to mock Response object
    const createMockRes = () => {
        const res = {
            status: (code) => {
                res.statusCode = code;
                return res;
            },
            send: (body) => {
                console.log(`[Response] Status: ${res.statusCode}, Body: ${body}`);
                res.body = body;
                return res;
            },
            json: (body) => {
                console.log(`[Response] Status: ${res.statusCode}, Body:`, body);
                res.body = body;
                return res;
            }
        };
        return res;
    };

    // TEST 1: Verification (GET)
    console.log("\nTest 1: Webhook Verification");
    const reqVerify = {
        method: 'GET',
        query: {
            'hub.mode': 'subscribe',
            'hub.verify_token': process.env.FACEBOOK_VERIFY_TOKEN || 'kainu-crm-verify-token',
            'hub.challenge': '123456789'
        }
    };
    await handler(reqVerify, createMockRes());

    // TEST 2: Message Handling (POST)
    console.log("\nTest 2: Incoming Message");
    const reqMessage = {
        method: 'POST',
        body: {
            object: 'page',
            entry: [
                {
                    messaging: [
                        {
                            sender: { id: 'user_123' },
                            message: { text: 'Kokia lipdukų kaina?' }
                        }
                    ]
                }
            ]
        }
    };

    // We need to mock OpenAI and Fetch if we don't want real network calls failing
    // For this basic test, checking if it attempts to call them or handles errors is enough.
    // Since we don't have a real OpenAI key in this environment, we expect it to try and likely just log an error or proceed if we mock.
    // However, to avoid 'Module not found' errors if we try to mock modules we can just let it run.
    // If it fails on OpenAI auth, that proves the control flow reached there.

    try {
        await handler(reqMessage, createMockRes());
    } catch (e) {
        console.error("Handler error:", e);
    }

    console.log("--- Tests Completed ---");
}

runTests();
