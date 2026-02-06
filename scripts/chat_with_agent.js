
import 'dotenv/config';
import handler from '../api/messenger_webhook.js';
import readline from 'readline';

// Enable mock mode in the webhook handler
process.env.MOCK_FB_RESPONSE = 'true';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const mockRes = {
    status: () => mockRes,
    send: () => mockRes,
    json: () => mockRes
};

console.log("--- Interactive Agent Chat ---");
console.log("Type your message and press Enter. Type 'exit' to quit.\n");

function ask() {
    rl.question('👤 YOU: ', async (text) => {
        if (text.toLowerCase() === 'exit') {
            rl.close();
            return;
        }

        const req = {
            method: 'POST',
            body: {
                object: 'page',
                entry: [{
                    messaging: [{
                        sender: { id: 'local_test_user' },
                        message: { text }
                    }]
                }]
            }
        };

        try {
            await handler(req, mockRes);
        } catch (err) {
            console.error("Error:", err);
        }

        ask();
    });
}

ask();
