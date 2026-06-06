import { createClient } from '@supabase/supabase-js';
import calculatePriceHandler from './calculate_price.js';

const getSupabase = () => {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
    return createClient(url, key);
};

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { 
            product_name, 
            material_keywords, 
            quantity, 
            width_mm, 
            height_mm,
            print_type = '4+0',
            lamination = 'None'
        } = req.body || {};

        if (!product_name || !quantity) {
            return res.status(400).json({ error: 'Missing product_name or quantity' });
        }

        const supabase = getSupabase();

        // 1. Fuzzy match product
        // Replace spaces with | for fuzzy searching or just use ilike
        const { data: products, error: pErr } = await supabase
            .from('products')
            .select('id, name')
            .ilike('name', `%${product_name.split(' ')[0]}%`)
            .limit(10);

        if (pErr || !products || products.length === 0) {
            return res.status(404).json({ 
                error: 'Product not found', 
                ai_message: `Could not find a product matching '${product_name}'. Please ask the user to clarify.`
            });
        }

        // Just take the first match for simplicity, or try to find an exact match first
        let matchedProduct = products.find(p => p.name.toLowerCase() === product_name.toLowerCase()) || products[0];

        // 2. Fuzzy match material (if provided)
        let matchedMaterial = null;
        if (material_keywords) {
            const { data: materials, error: mErr } = await supabase
                .from('materials')
                .select('id, name')
                .ilike('name', `%${material_keywords.split(' ')[0]}%`)
                .limit(10);
            
            if (!mErr && materials && materials.length > 0) {
                matchedMaterial = materials[0];
            }
        }

        // 3. Mock Request to calculate_price
        const mockReq = {
            method: 'POST',
            body: {
                product_id: matchedProduct.id,
                material_id: matchedMaterial ? matchedMaterial.id : null,
                quantity: quantity,
                width: width_mm || 0,
                height: height_mm || 0,
                print_type: print_type,
                lamination: lamination
            }
        };

        let calcResult = null;
        let calcStatus = 200;

        const mockRes = {
            setHeader: () => {},
            status: (s) => { calcStatus = s; return mockRes; },
            json: (data) => { calcResult = data; return mockRes; },
            end: () => {}
        };

        await calculatePriceHandler(mockReq, mockRes);

        if (calcStatus !== 200 || !calcResult.success) {
            return res.status(500).json({ 
                error: 'Calculation failed', 
                details: calcResult 
            });
        }

        const finalPrice = calcResult.total_price;
        const unitPrice = calcResult.unit_price;

        const summaryStr = `${quantity} vnt. ${matchedProduct.name} ${width_mm && height_mm ? `(${width_mm}x${height_mm}mm)` : ''} ${matchedMaterial ? `ant '${matchedMaterial.name}'` : ''} kainuos ${finalPrice.toFixed(2)} EUR be PVM (${unitPrice.toFixed(4)} EUR/vnt).`;

        return res.status(200).json({
            success: true,
            matched_product: matchedProduct.name,
            matched_material: matchedMaterial ? matchedMaterial.name : null,
            total_price_without_vat: finalPrice,
            unit_price_without_vat: unitPrice,
            ai_summary: summaryStr
        });

    } catch (error) {
        console.error('AI Quote API Error:', error);
        return res.status(500).json({ error: 'Failed to process AI quote', message: error.message });
    }
}
