
// scripts/test_agent_local.ts
import dotenv from 'dotenv';
import path from 'path';

// Load env vars BEFORE importing anything else
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

console.log("DEBUG ENV VARS:");
console.log("OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "Loaded" : "Missing");
console.log("VITE_SUPABASE_URL:", process.env.VITE_SUPABASE_URL ? "Loaded" : "Missing");
console.log("VITE_SUPABASE_ANON_KEY:", process.env.VITE_SUPABASE_ANON_KEY ? "Loaded" : "Missing");

const SYSTEM_PROMPT = `
You are an intelligent Email Assistant.
You have access to:
1. 'calculate_price': PROHIBITED to guess price. YOU MUST USE THIS TOOL.
2. 'search_knowledge_base': Use this for questions.

Your final output should be a JSON object with:
  - "suggested_reply": The email body you wrote.
  - "confidence": 0-1 score.
`;

async function runTest() {
    // Dynamic imports to ensure env vars are loaded first
    const { CoreAgent } = await import('../src/lib/agent/CoreAgent');
    const { PriceCalculatorTool } = await import('../src/lib/agent/tools/PriceCalculatorTool');
    const { KnowledgeBaseTool } = await import('../src/lib/agent/tools/KnowledgeBaseTool');

    if (!process.env.OPENAI_API_KEY) {
        console.error("CRITICAL: Missing OPENAI_API_KEY");
        return;
    }

    // Initialize agent
    const agent = new CoreAgent(
        [PriceCalculatorTool, KnowledgeBaseTool],
        SYSTEM_PROMPT
    );

    console.log("\n--- TEST 1: General Question ---");
    try {
        const res1 = await agent.processRequest("Hi, do you print on weekends?");
        console.log("Response 1:", res1.reply);
        console.log("Tools Used:", res1.used_tools);
    } catch (e: any) {
        console.error("Test 1 Failed:", e.message, e.stack);
    }

    console.log("\n--- TEST 2: Price Calculation ---");
    try {
        const res2 = await agent.processRequest("I need 200 business cards (vizitines korteles).");
        console.log("Response 2:", res2.reply);
        console.log("Tools Used:", res2.used_tools);
    } catch (e: any) {
        console.error("Test 2 Failed:", e.message);
    }
}

runTest();
