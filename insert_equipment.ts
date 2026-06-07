import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function insertEquipment() {
    const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    
    const rules = [
        {
            topic: "Equipment Capabilities: Creasing and Folding Machines",
            content: "We use professional creasing and folding machines for finishing documents. Capabilities: Creasing machines score paper to prevent cracking along the fold, which is essential for thick covers, laminated materials, and high-quality brochures. Folding machines automate the process of folding sheets into various formats (half-fold, tri-fold, Z-fold, roll-fold, etc.) at high speeds with perfect alignment. Used for producing flyers, brochures, menus, greeting cards, and covers.",
            category: "Equipment",
            priority: 50,
            is_active: true,
            is_internal: false
        }
    ];

    const { data, error } = await supabase.from('ai_knowledge').insert(rules);
    if (error) {
        console.error("Error inserting equipment:", error);
    } else {
        console.log("Equipment inserted successfully!");
    }
}
insertEquipment();
