import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Generates a standardized order number in the format ORD-YY-XXXX.
 * 
 * Logic:
 * 1. Try to use the database RPC function `generate_order_number`.
 * 2. If valid data returns, use it.
 * 3. If RPC fails or returns null, fallback to client-side logic:
 *    - Fetch the latest order number for the current year (ORD-YY-%).
 *    - Parse the sequence number.
 *    - Increment and format.
 * 
 * @param supabase The supabase client instance
 * @returns A string representing the new order number (e.g. "ORD-25-1002")
 */
export const generateOrderNumber = async (supabase: SupabaseClient): Promise<string> => {
    try {
        // 1. Attempt Database RPC
        const { data: rpcData, error: rpcError } = await supabase.rpc('generate_order_number');

        if (!rpcError && rpcData) {
            return rpcData as string;
        }

        console.warn("RPC generate_order_number failed or returned null, using client-side fallback.", rpcError);

        // 2. Client-Side Fallback
        const date = new Date();
        const yearShort = date.getFullYear().toString().slice(-2);
        const prefix = `ORD-${yearShort}-`;

        // Find the last order with this prefix
        const { data: lastOrder, error: queryError } = await supabase
            .from('orders')
            .select('order_number')
            .like('order_number', `${prefix}%`)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (queryError || !lastOrder) {
            // No orders found for this year, start sequence
            return `${prefix}1001`;
        }

        // Parse existing sequence
        // Expected format: ORD-25-1001
        const parts = lastOrder.order_number.split('-');
        if (parts.length === 3) {
            const sequence = parseInt(parts[2], 10);
            if (!isNaN(sequence)) {
                return `${prefix}${sequence + 1}`;
            }
        }

        // Fallback if parsing failed
        return `${prefix}1001`;

    } catch (error) {
        console.error("Critical error generating order number:", error);
        // Ultimate fallback to prevent blocking user
        const yearShort = new Date().getFullYear().toString().slice(-2);
        const random = Math.floor(1000 + Math.random() * 9000);
        return `ORD-${yearShort}-${random}`;
    }
};
