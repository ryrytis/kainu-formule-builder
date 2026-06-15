import { processAiMessage } from './_lib/ai_logic.js';
import { createClient } from '@supabase/supabase-js';
import busboy from 'busboy';
import pdfParse from 'pdf-parse';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const config = {
    api: {
        bodyParser: false,
    },
};

async function readBodyStream(req) {
    return new Promise((resolve, reject) => {
        let chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        req.on('error', reject);
    });
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const contentType = req.headers['content-type'] || '';

    // 1. INVOICE PARSING ENDPOINT (Triggered by query parameter or multipart form data)
    if (req.query.action === 'parse_invoice' || contentType.includes('multipart/form-data')) {
        try {
            let pdfBuffer = null;

            if (contentType.includes('application/json')) {
                const rawBody = await readBodyStream(req);
                const jsonBody = JSON.parse(rawBody);
                if (jsonBody.pdfBase64) {
                    pdfBuffer = Buffer.from(jsonBody.pdfBase64, 'base64');
                } else {
                    return res.status(400).json({ error: 'Missing pdfBase64' });
                }
            } else if (contentType.includes('multipart/form-data')) {
                pdfBuffer = await new Promise((resolve, reject) => {
                    const bb = busboy({ headers: req.headers });
                    let fileBuffer = null;
                    bb.on('file', (name, file) => {
                        const chunks = [];
                        file.on('data', data => chunks.push(data));
                        file.on('end', () => fileBuffer = Buffer.concat(chunks));
                    });
                    bb.on('finish', () => resolve(fileBuffer));
                    bb.on('error', reject);
                    req.pipe(bb);
                });
            }

            if (!pdfBuffer) return res.status(400).json({ error: 'No file uploaded' });

            const pdfData = await pdfParse(pdfBuffer);
            const text = pdfData.text;

            const prompt = `You are an intelligent invoice parser. 
            Extract the materials purchased from the following supplier invoice text.
            Return a JSON array of objects with these keys ONLY:
            - name (string): The name of the material.
            - quantity (number): The total quantity purchased.
            - unit_price (number): The price per single unit.
            - unit (string): The unit of measurement (e.g. m, m2, vnt, kg, rul).

            IMPORTANT: RETURN ONLY VALID JSON. Do not return markdown, do not return explanations. Just the JSON array.
            
            Invoice text:
            ${text}`;

            const response = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [{ role: "user", content: prompt }],
                temperature: 0,
            });

            const cleanedContent = (response.choices[0].message.content || '[]').replace(/```json/g, '').replace(/```/g, '').trim();
            return res.status(200).json({ success: true, extracted_items: JSON.parse(cleanedContent) });
        } catch (error) {
            console.error('Invoice parsing error:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // 2. STANDARD APP CHAT ENDPOINT
    try {
        const rawBody = await readBodyStream(req);
        const { message, sessionId, userName } = JSON.parse(rawBody);

        if (!message || !sessionId) {
            return res.status(400).json({ error: 'Missing message or sessionId' });
        }

        const response = await processAiMessage(sessionId, message, true, userName);
        return res.status(200).json({ response });
    } catch (error) {
        console.error("App Chat Error:", error);
        return res.status(500).json({ error: 'Failed to process message' });
    }
}
