import { AgentTool } from '../types.js';
import { supabase } from '../../supabase.js';

export const ClientSearchTool: AgentTool = {
    name: "search_clients",
    description: "Search for clients by name, email, or company. Returns client details and their recent orders.",
    parameters: {
        type: "object",
        properties: {
            query: { type: "string", description: "Search term (e.g. part of name, email, or company name)." }
        },
        required: ["query"]
    },
    execute: async (args: any) => {
        const query = args.query.replace(/[?!.,]/g, '').trim();
        if (query.length < 3) return { error: "Query too short. Please provide at least 3 characters." };

        try {
            const { data: clientData, error: clientErr } = await supabase
                .from('clients')
                .select('id, name, email, phone, company, notes, city, address')
                .or(`name.ilike.%${query}%,email.ilike.%${query}%,company.ilike.%${query}%`)
                .limit(5);

            if (clientErr) throw clientErr;

            if (!clientData || clientData.length === 0) {
                return { result: "No clients found matching the query." };
            }

            const results = await Promise.all(clientData.map(async (client: any) => {
                const { data: recentOrders } = await supabase
                    .from('orders')
                    .select('order_number, status, total_price, created_at, finish_date')
                    .eq('client_id', client.id)
                    .order('created_at', { ascending: false })
                    .limit(5);

                return {
                    client,
                    recent_orders: recentOrders || []
                };
            }));

            return { clients: results };
        } catch (error: any) {
            return { error: "Search failed", details: error.message };
        }
    }
};
