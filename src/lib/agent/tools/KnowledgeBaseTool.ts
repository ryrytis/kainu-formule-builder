
import { AgentTool } from '../types';
import { supabase } from '../../supabase';

export const KnowledgeBaseTool: AgentTool = {
    name: "search_knowledge_base",
    description: "Searches the internal knowledge base for company policies, shipping info, artwork requirements, etc.",
    parameters: {
        type: "object",
        properties: {
            query: { type: "string", description: "The search query (keywords or question)." }
        },
        required: ["query"]
    },
    execute: async (args: any) => {
        const { query } = args;

        // Simple text search (using ilike for now, ideally vector search)
        // We will search 'topic' and 'content' columns.
        const { data, error } = await supabase
            .from('ai_knowledge')
            .select('topic, content')
            .or(`topic.ilike.%${query}%,content.ilike.%${query}%`)
            .eq('is_active', true)
            .limit(3);

        const rows = data as any[] | null;

        if (error) {
            return { error: "Search failed", details: error.message };
        }

        if (rows && rows.length > 0) {
            return rows.map(d => `[${d.topic}]: ${d.content}`).join("\n\n");
        } else {
            return "No relevant information found in the knowledge base.";
        }
    }
};
