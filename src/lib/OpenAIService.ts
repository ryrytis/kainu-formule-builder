import OpenAI from 'openai';

// Since this is a client-side app, using the API key directly is not recommended for production
// However, the project is currently using an exposed OPENAI_API_KEY in the .env file.
const getEnv = (key: string) => {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
        return (import.meta as any).env[key];
    }
    const fallbackKey = key.startsWith('VITE_') ? key.replace('VITE_', '') : `VITE_${key}`;
    if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[fallbackKey]) {
        return (import.meta as any).env[fallbackKey];
    }
    return '';
};

const apiKey = getEnv('OPENAI_API_KEY') || getEnv('VITE_OPENAI_API_KEY');

const openai = apiKey ? new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true // Required since we're calling from Vite client
}) : null;

export interface ParsedMaterial {
    name: string;
    quantity: number;
    unit_price: number;
    unit: string;
}

export const OpenAIService = {
    parseInvoiceText: async (text: string): Promise<ParsedMaterial[]> => {
        if (!openai) throw new Error('OpenAI API key not configured.');

        const prompt = `
You are an intelligent data extraction assistant. I will provide you with the raw text extracted from a supplier invoice.
Your task is to identify all the purchased materials, their quantities, units, and unit prices.

Please extract this data and return it as a JSON array of objects.
Each object should have the following exact keys:
- "name" (string): The name of the material.
- "quantity" (number): The quantity purchased.
- "unit_price" (number): The price per unit.
- "unit" (string): The unit of measurement (e.g. "m2", "vnt", "kg", "m").

Raw Invoice Text:
"""
${text.substring(0, 8000)} // Limiting text to avoid token limits
"""

Return ONLY valid JSON. Do not include any markdown formatting like \`\`\`json. Just the raw array.
`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: prompt }],
            temperature: 0,
        });

        const content = response.choices[0].message.content?.trim() || '[]';
        
        try {
            // Remove markdown code blocks if GPT ignored instructions
            const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanContent) as ParsedMaterial[];
            return parsed;
        } catch (e) {
            console.error('Failed to parse OpenAI response:', content);
            throw new Error('Failed to parse invoice materials. Please try again.');
        }
    }
};
