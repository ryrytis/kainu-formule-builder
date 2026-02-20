
import { CoreAgent } from '../src/lib/agent/CoreAgent';
import { PriceCalculatorTool } from '../src/lib/agent/tools/PriceCalculatorTool';
import { KnowledgeBaseTool } from '../src/lib/agent/tools/KnowledgeBaseTool';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// System Prompt for the Agent
const SYSTEM_PROMPT = `
You are an intelligent Email Assistant for 'Keturi print', a printing house.
Your goal is to help Customer Service by drafting replies to client emails.

You have access to:
1. 'calculate_price': PROHIBITED to guess price. YOU MUST USE THIS TOOL if the client asks for a quote.
2. 'search_knowledge_base': Use this for questions about files, shipping, policies, etc.

BEHAVIOR:
- If the email is a price request:
  - First, EXTRACT the product details (quantity, options).
  - Call 'calculate_price'.
  - If details are missing, your reply should ASK for them.
- If the email is a question:
  - Call 'search_knowledge_base'.
  - Answer based on the result.
- Your final output should be a JSON object with:
  - "suggested_reply": The email body you wrote.
  - "missing_info": Array of strings if you need more info.
  - "confidence": 0-1 score.
`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Security Check
    const apiKey = req.headers['x-api-key'];
    const internalKey = process.env.INTERNAL_API_KEY;

    if (!internalKey || apiKey !== internalKey) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { email_body, instruction } = req.body;

    if (!email_body) {
        return res.status(400).json({ error: 'Missing email_body' });
    }

    try {
        // Instantiate Agent with Tools
        const agent = new CoreAgent(
            [PriceCalculatorTool, KnowledgeBaseTool],
            SYSTEM_PROMPT
        );

        // Combine instruction with email body if provided
        const userMessage = instruction
            ? `INSTRUCTION: ${instruction}\n\nEMAIL CONTENT:\n${email_body}`
            : email_body;

        // Run
        const result = await agent.processRequest(userMessage);

        // Attempt to parse JSON from AI response if it followed instructions
        // If not, wrap it.
        let parsedReply = {};
        try {
            // Remove markdown code blocks if present
            const cleanJson = result.reply.replace(/```json/g, '').replace(/```/g, '').trim();
            parsedReply = JSON.parse(cleanJson);
        } catch (e) {
            parsedReply = {
                suggested_reply: result.reply,
                usage_notes: "AI did not return strict JSON."
            };
        }

        res.status(200).json({
            success: true,
            data: parsedReply,
            used_tools: result.used_tools
        });

    } catch (error: any) {
        console.error("Agent Error:", error);
        res.status(500).json({ error: error.message });
    }
}
