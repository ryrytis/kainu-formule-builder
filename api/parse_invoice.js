import busboy from 'busboy';
import pdfParse from 'pdf-parse';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export const config = {
    api: {
        bodyParser: false, // Disallow Next.js/Vercel body parsing to consume it as a stream
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Optional Security: Check for a custom API token
    // If you define INTERNAL_API_KEY in your Vercel env, we enforce it here.
    const expectedKey = process.env.INTERNAL_API_KEY;
    if (expectedKey) {
        const providedKey = req.headers['authorization']?.replace('Bearer ', '') || req.headers['x-api-key'];
        if (providedKey !== expectedKey) {
            return res.status(401).json({ error: 'Unauthorized. Invalid API Key.' });
        }
    }

    try {
        let pdfBuffer = null;

        // Check if the request is standard JSON with base64 encoded PDF
        const contentType = req.headers['content-type'] || '';
        
        if (contentType.includes('application/json')) {
            // We disabled bodyParser, so we have to manually read the JSON stream
            const rawBody = await new Promise((resolve, reject) => {
                let chunks = [];
                req.on('data', (chunk) => chunks.push(chunk));
                req.on('end', () => resolve(Buffer.concat(chunks).toString()));
                req.on('error', reject);
            });
            
            const jsonBody = JSON.parse(rawBody);
            if (jsonBody.pdfBase64) {
                pdfBuffer = Buffer.from(jsonBody.pdfBase64, 'base64');
            } else {
                return res.status(400).json({ error: 'Missing pdfBase64 field in JSON payload.' });
            }
        } 
        else if (contentType.includes('multipart/form-data')) {
            // Parse multipart/form-data using busboy
            pdfBuffer = await new Promise((resolve, reject) => {
                const bb = busboy({ headers: req.headers });
                let fileBuffer = null;

                bb.on('file', (name, file, info) => {
                    const chunks = [];
                    file.on('data', (data) => chunks.push(data));
                    file.on('end', () => {
                        fileBuffer = Buffer.concat(chunks);
                    });
                });

                bb.on('finish', () => resolve(fileBuffer));
                bb.on('error', reject);
                req.pipe(bb);
            });

            if (!pdfBuffer) {
                return res.status(400).json({ error: 'No file uploaded in form-data.' });
            }
        } 
        else {
            return res.status(400).json({ error: 'Unsupported Content-Type. Use multipart/form-data or application/json.' });
        }

        // 1. Extract Text from PDF
        const pdfData = await pdfParse(pdfBuffer);
        const text = pdfData.text;

        if (!text || text.trim().length === 0) {
            return res.status(400).json({ error: 'Could not extract any text from the provided PDF.' });
        }

        // 2. Call OpenAI API to parse the invoice
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

        const rawContent = response.choices[0].message.content || '[]';
        const cleanedContent = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
        
        let parsedItems = [];
        try {
            parsedItems = JSON.parse(cleanedContent);
        } catch (e) {
            throw new Error("Failed to parse OpenAI JSON response.");
        }

        // 3. Return the parsed items
        return res.status(200).json({
            success: true,
            extracted_items: parsedItems
        });

    } catch (error) {
        console.error('Invoice parsing error:', error);
        return res.status(500).json({ 
            error: 'Internal Server Error', 
            details: error.message 
        });
    }
}
