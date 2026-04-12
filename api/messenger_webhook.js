
import { processAiMessage } from './_lib/ai_logic.js';

export default async function handler(req, res) {
    // 1. Verification (GET)
    if (req.method === 'GET') {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];
        if (mode === 'subscribe' && token === process.env.FACEBOOK_VERIFY_TOKEN) {
            return res.status(200).send(challenge);
        }
        return res.status(403).send('Forbidden');
    }

    // 2. Message Handling (POST)
    if (req.method === 'POST') {
        const body = req.body;
        if (body.object === 'page') {
            res.status(200).send('EVENT_RECEIVED'); // Immediate response

            for (const entry of body.entry) {
                if (entry.messaging) {
                    for (const event of entry.messaging) {
                        if (event.message && !event.message.is_echo) {
                             const sender_psid = event.sender.id;
                             processAiMessage(sender_psid, event.message.text, false).catch(err => {
                                 console.error("Messenger Error:", err);
                             }).then(response => {
                                 if (response) sendMessengerReply(sender_psid, response);
                             });
                        }
                    }
                }
            }
            return;
        }
    }
    return res.status(405).send('Method Not Allowed');
}

async function sendMessengerReply(psid, text) {
    const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            recipient: { id: psid },
            message: { text: text }
        }),
    });
}
