import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function insert() {
    const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    
    const rules = [
        {
            topic: "Proactive Pricing Protocol",
            content: "If the user asks for a product but doesn't provide enough details (like quantity or lamination), do NOT just ask them clarifying questions. Instead, PROACTIVELY use the 'calculate_price' tool multiple times to fetch 'baseline example prices' (e.g., calculate for 100 pcs and 500 pcs). Then present these example prices to the user. DO NOT guess the price, always use the tool.",
            category: "SYSTEM",
            priority: 100,
            is_active: true,
            is_internal: false
        },
        {
            topic: "Stickers (Lipdukai) Protocol",
            content: "If the user asks about stickers (lipdukai), you must first explain that we produce stickers in rolls (rulonais) or sheets (lapais), and mention the available materials (e.g., paper/popieriniai, film/plėvelė). Then ask for the quantity and material they need. IF they provided a size, you MUST use the calculate_price tool to give them an estimated price.",
            category: "SYSTEM",
            priority: 99,
            is_active: true,
            is_internal: false
        }
    ];

    const { data, error } = await supabase.from('ai_knowledge').insert(rules);
    if (error) {
        console.error("Error inserting rules:", error);
    } else {
        console.log("Rules inserted successfully:", data);
    }
}
insert();
