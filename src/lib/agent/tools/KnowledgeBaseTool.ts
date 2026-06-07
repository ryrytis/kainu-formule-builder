
import { AgentTool } from '../types.js';
import { supabase } from '../../supabase.js';

export const PublicKnowledgeBaseTool: AgentTool = {
    name: "search_knowledge_base",
    description: "Searches the public knowledge base for company policies, shipping info, artwork requirements, etc.",
    parameters: {
        type: "object",
        properties: {
            query: { type: "string", description: "The search query (keywords or question)." }
        },
        required: ["query"]
    },
    execute: async (args: any) => {
        const { query } = args;
        const { data, error } = await supabase
            .from('ai_knowledge')
            .select('topic, content')
            .or(`topic.ilike.%${query}%,content.ilike.%${query}%`)
            .eq('is_active', true)
            .eq('is_internal', false)
            .limit(3);

        if (error) return { error: "Search failed", details: error.message };
        if (data && data.length > 0) return data.map((d: any) => `[${d.topic}]: ${d.content}`).join("\n\n");
        return "No relevant information found in the knowledge base.";
    }
};

export const InternalKnowledgeBaseTool: AgentTool = {
    name: "search_knowledge_base",
    description: "Searches the full knowledge base (including internal-only rules) for company policies, shipping info, artwork requirements, etc.",
    parameters: {
        type: "object",
        properties: {
            query: { type: "string", description: "The search query (keywords or question)." }
        },
        required: ["query"]
    },
    execute: async (args: any) => {
        const { query } = args;
        const { data, error } = await supabase
            .from('ai_knowledge')
            .select('topic, content')
            .or(`topic.ilike.%${query}%,content.ilike.%${query}%`)
            .eq('is_active', true)
            .limit(3);

        if (error) return { error: "Search failed", details: error.message };
        if (data && data.length > 0) return data.map((d: any) => `[${d.topic}]: ${d.content}`).join("\n\n");
        return "No relevant information found in the knowledge base.";
    }
};
