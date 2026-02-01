import { supabase } from './supabase';

export interface AiAgentConfig {
    agentType: 'order_entry' | 'email_drafter' | 'data_analyst';
    model?: string;
}

/**
 * Service to handle interactions with AI Agents.
 * In production, this would call Supabase Edge Functions which wrap LLM APIs (OpenAI/Anthropic).
 */
export const AiService = {

    /**
     * Parses raw text (email/clipboard) to extract order details.
     * Future: Connect to OpenAI GPT-4o-mini via Edge Function.
     */
    parseOrderFromText: async (text: string) => {
        console.log("AI Agent: Analyzing text...", text.substring(0, 50) + "...");

        // MOCK IMPLEMENTATION
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    data: {
                        client: "Mock Client UAB",
                        product: "Business Cards",
                        quantity: 100,
                        specs: "Matte finish, 350gsm"
                    },
                    confidence: 0.95
                });
            }, 1000);
        });
    },

    /**
     * Generates a polite email draft based on order status and context.
     */
    generateEmailDraft: async (orderId: string, context: string) => {
        // Fetch order details first
        const { data: orderData, error } = await supabase
            .from('orders') // Assuming 'orders' table
            .select('*, clients(*)') // Assuming it also fetches client details
            .eq('id', orderId)
            .single();

        if (error) {
            console.error("Error fetching order:", error);
            throw new Error("Could not fetch order details.");
        }

        const order = orderData as any;
        if (!order) throw new Error("Order not found");

        console.log("AI Agent: Drafting email for order", order.order_number);

        // MOCK
        return `Subject: Update regarding Order #${order.order_number}\n\nDear ${order.clients?.name},\n\nWe wanted to let you know that your order for ${context || 'printed items'} is on track. We expect to ship it by tomorrow.\n\nBest regards,\nKeturiprint Team`;
    }
};
