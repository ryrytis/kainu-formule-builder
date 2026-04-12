import { PricingService, PricingRequest } from '../src/lib/PricingService';

export default async function handler(req: any, res: any) {
    // 1. CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const payload: PricingRequest = req.body;

        // 2. Validate essential fields
        if (!payload || !payload.product_id || !payload.quantity) {
            return res.status(400).json({ error: 'Missing product_id or quantity' });
        }

        // 3. Perform server-side calculation (this hides the underlying margins and algorithms)
        // Since PricingService imports supabase from src/lib/supabase, it runs queries using VITE_SUPABASE_ANON_KEY 
        // Note: For extreme security on RLS protected rules, we would inject a Service Role client here, 
        // but since calculation_rules are read by anon if configured, or if we ensure env variables are set, it will work.
        const result = await PricingService.calculatePrice(payload);

        // 4. STRIP SENSITIVE DATA
        // Do not return the 'breakdown' or 'applied_rules' containing sensitive exact margins, waste percentages, etc.
        // We only return the unit price and total price.
        return res.status(200).json({
            success: true,
            unit_price: result.unit_price,
            total_price: result.total_price
        });

    } catch (error: any) {
        console.error('Pricing Error:', error.message);
        return res.status(500).json({
            error: 'Failed to calculate price',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}
