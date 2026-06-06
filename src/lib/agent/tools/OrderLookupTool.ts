import { AgentTool } from '../types.js';
import { supabase } from '../../supabase.js';

export const OrderLookupTool: AgentTool = {
    name: "lookup_order",
    description: "Look up a specific order by its order number (e.g. 2026-1186).",
    parameters: {
        type: "object",
        properties: {
            order_number: { type: "string", description: "The exact order number, e.g. 2026-1186." }
        },
        required: ["order_number"]
    },
    execute: async (args: any) => {
        try {
            const { data: orderData, error } = await supabase
                .from('orders')
                .select('order_number, status, total_price, notes, finish_date, clients(name)')
                .eq('order_number', args.order_number)
                .single();

            if (error || !orderData) {
                return { error: `Order ${args.order_number} not found.` };
            }

            return { order: orderData };
        } catch (error: any) {
            return { error: "Order lookup failed", details: error.message };
        }
    }
};
