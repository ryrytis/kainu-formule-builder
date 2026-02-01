
import OpenAI from 'openai';

export default async function handler(req, res) {
    // 1. Verification (GET)
    if (req.method === 'GET') {
        // Parse the query params
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        // Checks if a token and mode is in the query string of the request
        if (mode && token) {
            // Checks the mode and token sent is correct
            if (mode === 'subscribe' && token === process.env.FACEBOOK_VERIFY_TOKEN) {
                // Responds with the challenge token from the request
                console.log('WEBHOOK_VERIFIED');
                return res.status(200).send(challenge);
            } else {
                // Responds with '403 Forbidden' if verify tokens do not match
                return res.status(403).json({ error: 'Verification failed' });
            }
        }
    }

    // 2. Message Handling (POST)
    if (req.method === 'POST') {
        const body = req.body;

        // Checks this is an event from a page subscription
        if (body.object === 'page') {
            // Iterates over each entry - there may be multiple if batched
            for (const entry of body.entry) {
                // Gets the body of the webhook event.
                // entry.messaging is an array, but may be empty if it's a standpoint update or other non-message event
                if (entry.messaging && entry.messaging.length > 0) {
                    const webhook_event = entry.messaging[0];
                    console.log("Received event:", webhook_event);

                    // Get the sender PSID
                    const sender_psid = webhook_event.sender.id;

                    // Check if the event is a message or postback and
                    // pass the event to the appropriate handler function
                    if (webhook_event.message) {
                        await handleMessage(sender_psid, webhook_event.message);
                    }
                }
            }

            // Returns a '200 OK' response to all requests
            return res.status(200).send('EVENT_RECEIVED');
        } else {
            // Returns a '404 Not Found' if event is not from a page subscription
            return res.status(404).json({ error: 'Not a page event' });
        }
    }

    return res.status(405).json({ error: "Method not allowed" });
}

async function handleMessage(sender_psid, received_message) {
    let response;

    // Checks if the message contains text
    if (received_message.text) {

        // Generate response using OpenAI
        try {
            const openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
            });

            const completion = await openai.chat.completions.create({
                messages: [
                    { role: "system", content: "You are a helpful assistant for a business." },
                    { role: "user", content: received_message.text }
                ],
                model: "gpt-3.5-turbo",
            });

            const aiResponse = completion.choices[0].message.content;
            response = {
                "text": aiResponse
            }

        } catch (error) {
            console.error("OpenAI Error:", error);
            response = { "text": "Sorry, I am unable to process your request at the moment." };
        }
    } else if (received_message.attachments) {
        // Handles attachments (optional future scope)
        response = {
            "text": "Received attachment, but I can only process text for now."
        }
    }

    // Send the response message
    await callSendAPI(sender_psid, response);
}

async function callSendAPI(sender_psid, response) {
    const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

    const requestBody = {
        "recipient": {
            "id": sender_psid
        },
        "message": response
    };

    // Send the HTTP request to the Messenger Platform
    try {
        const res = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        if (!res.ok) {
            const errorData = await res.json();
            console.error("Facebook API Error:", errorData);
        } else {
            console.log('Message sent!');
        }
    } catch (error) {
        console.error("Unable to send message:" + error);
    }
}
