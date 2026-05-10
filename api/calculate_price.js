// Self-contained pricing API for Vercel Serverless (Node.js runtime)
// Synchronized with PricingService.ts (Updated: 2026-05-03)
import { createClient } from '@supabase/supabase-js';

const getSupabase = () => {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
    return createClient(url, key);
};

// --- Roll Sticker Pricing Logic ---
function calcRollPrice({ width, height, materialPricePerM, rollWidth = 125, sideMargin = 10, bleed = 2, spacing = 4, paintPriceM2 = 8.0, marginMultiplier = 1.5, manualPaintPrice }) {
    const effectiveWidth = rollWidth - (2 * sideMargin);
    const wStep = width + bleed + spacing;
    const hStep = height + bleed + spacing;

    const colsP = Math.floor((effectiveWidth + spacing) / wStep);
    const rowsP = Math.floor((1000 + spacing) / hStep);
    const yieldP = Math.max(0, colsP * rowsP);

    const colsL = Math.floor((effectiveWidth + spacing) / hStep);
    const rowsL = Math.floor((1000 + spacing) / wStep);
    const yieldL = Math.max(0, colsL * rowsL);

    const bestYield = Math.max(yieldP, yieldL, 1);
    const orientation = yieldL > yieldP ? 'Landscape' : 'Portrait';

    const materialCostPerSticker = materialPricePerM / bestYield;
    const itemAreaM2 = (width * height) / 1_000_000;
    const paintCost = manualPaintPrice != null ? manualPaintPrice : itemAreaM2 * paintPriceM2;

    const costPerSticker = materialCostPerSticker + paintCost;
    const pricePerSticker = costPerSticker * marginMultiplier;

    return { pricePerSticker, bestYield, orientation, materialCostPerSticker, paintCost };
}

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { 
            product_id, quantity, width, height, length, material_id, 
            lamination, manual_unit_paint_price, client_price_list_id,
            print_type, production_mode, 
            cover_material_id, inner_material_id, 
            cover_print_type, inner_print_type, inner_pages,
            selected_extras = []
        } = req.body || {};

        if (!product_id || !quantity) {
            return res.status(400).json({ error: 'Missing product_id or quantity' });
        }

        const supabase = getSupabase();
        const appliedRules = [];
        const itemW = width || 0;
        const itemH = height || 0;

        // 0. Fetch Product & Rules
        const { data: product, error: prodErr } = await supabase.from('products').select('*').eq('id', product_id).maybeSingle();
        if (prodErr || !product) return res.status(404).json({ error: 'Product not found' });

        const { data: rules = [] } = await supabase.from('calculation_rules').select('*').eq('is_active', true).order('priority', { ascending: false });

        const getRuleVal = (type, def) => {
            const r = rules.find(r => r.rule_type === type && (r.product_id === product_id || (!r.product_id && r.product_category === product.category) || (!r.product_id && !r.product_category)));
            return r ? r.value : def;
        };

        const matchesQty = (r) => {
            const minOk = !r.min_quantity || quantity >= r.min_quantity;
            const maxOk = !r.max_quantity || quantity <= r.max_quantity;
            return minOk && maxOk;
        };

        // 1. Client Price List Override
        let priceListOverrideBasePrice = null;
        if (client_price_list_id) {
            const { data: plItem } = await supabase.from('price_list_items').select('custom_base_price').eq('price_list_id', client_price_list_id).eq('product_id', product_id).maybeSingle();
            if (plItem) priceListOverrideBasePrice = plItem.custom_base_price;
        }

        const nameLower = product.name.toLowerCase();
        const catLower = (product.category || '').toLowerCase();
        
        const isRollSticker = nameLower.includes('rulon') && nameLower.includes('lipdukas');
        const isPaperSticker = nameLower.includes('popieriaus');
        const isBox = nameLower.includes('dėžut') || nameLower.includes('dezut') || nameLower.includes('box');
        const isSleeve = nameLower.includes('įmaut') || nameLower.includes('imaut') || nameLower.includes('mova') || nameLower.includes('movą') || nameLower.includes('mov');
        const isKarulis = catLower.includes('karul') || nameLower.includes('karul');
        const isBooklet = nameLower.includes('buklet') || nameLower.includes('katalog') || nameLower.includes('knyg') || nameLower.includes('leidin');

        let unitPrice = 0;
        let totalPrice = 0;

        // 2. Main Calculation
        if (isRollSticker && itemW > 0 && itemH > 0) {
            // Roll sticker logic
            let materialPricePerM = 0;
            if (material_id) {
                const { data: mat } = await supabase.from('materials').select('unit_price').eq('id', material_id).maybeSingle();
                if (mat) materialPricePerM = mat.unit_price || 0;
            }

            const rollWidth     = getRuleVal('Roll Width', 125);
            const sideMargin    = getRuleVal('Roll Side Margin', 10);
            const bleed         = getRuleVal('Roll Padding/Bleed', 2);
            const spacing       = isPaperSticker ? getRuleVal('Roll Spacing Paper', 7) : getRuleVal('Roll Spacing Pleveles', 4);
            const paintPriceM2  = getRuleVal('Roll Paint Price/m2', 8.0);
            const marginMul     = getRuleVal('Roll Default Margin', 1.5);

            const { pricePerSticker, bestYield, orientation, materialCostPerSticker, paintCost } = calcRollPrice({
                width: itemW, height: itemH, materialPricePerM, rollWidth, sideMargin, bleed, spacing,
                paintPriceM2, marginMultiplier: marginMul,
                manualPaintPrice: manual_unit_paint_price ?? null
            });

            unitPrice = pricePerSticker;
            totalPrice = unitPrice * quantity;
            appliedRules.push(`Roll Yield: ${bestYield} qty/m (${orientation})`);

        } else if ((isBox || isSleeve || isKarulis || isBooklet) && itemW > 0 && itemH > 0) {
            // BOM-based logic (SRA3)
            const sheet = { width: 320, height: 450, name: 'SRA3' };
            
            // ── Box/Sleeve blank override: compute unfolded blank W×H from W×H×L
            let effW = itemW;
            let effH = itemH;
            const itemLength = length || 0;

            if ((isBox || isSleeve) && itemW > 0 && itemH > 0 && itemLength > 0) {
                const originalW = itemW;
                const originalH = itemH;
                const originalL = itemLength;

                if (isSleeve) {
                    // Sleeve (Mova/Įmautė): Unfolded width = 2*(W+H) + gluing flap, Height = Length
                    effW = 2 * (originalW + originalH) + 20; // 20mm glue flap
                    effH = originalL;
                    appliedRules.push(`BOM Sleeve Blank: 2×(${originalW}+${originalH})+20 = ${effW}mm, Length=${effH}mm`);
                } else if (isBox) {
                    // Box (Dėžutė): Unfolded width = 2*(W+L) + gluing flap, Height = H + W (flaps)
                    effW = 2 * (originalW + originalL) + 30; // 30mm glue flap
                    effH = originalH + originalW;
                    appliedRules.push(`BOM Box Blank: 2×(${originalW}+${originalL})+30 = ${effW}mm, Height+Width=${effH}mm`);
                }
            }

            const spacing = product.item_spacing || 0;
            const finalW = effW + spacing;
            const finalH = effH + spacing;
            
            const bodyLayoutA = Math.floor(sheet.width / finalW) * Math.floor(sheet.height / finalH);
            const bodyLayoutB = Math.floor(sheet.width / finalH) * Math.floor(sheet.height / finalW);
            const bodyYield = Math.max(bodyLayoutA, bodyLayoutB);

            const setupMultiplier = 1 + (getRuleVal('Sheet Setup Waste', 15) / 100);
            const sheetMarginMultiplier = getRuleVal('Sheet Margin', 1.5);
            const basePrintCost = production_mode === 'cut_only' ? 0 : getRuleVal('Sheet Print Cost', 0.10);
            const baseOpCost = production_mode === 'cut_only' ? 0 : getRuleVal('Sheet Print Operation', 0.05);
            const sheetCuttingCost = getRuleVal('Sheet Cutting Cost', 0.05);

            let totalCost = 0;

            if (isBooklet && cover_material_id && inner_material_id) {
                const { data: mats } = await supabase.from('materials').select('id, unit_price').in('id', [cover_material_id, inner_material_id]);
                const coverMatPrice = mats?.find(m => m.id === cover_material_id)?.unit_price || 0;
                const innerMatPrice = mats?.find(m => m.id === inner_material_id)?.unit_price || 0;

                const coverIsDouble = cover_print_type === '4+4' || cover_print_type === '1+1';
                const coverPrintMult = coverIsDouble ? 2 : 1;
                const coverSheetCost = coverMatPrice + (basePrintCost * coverPrintMult) + (baseOpCost * coverPrintMult) + sheetCuttingCost;

                const innerIsDouble = inner_print_type === '4+4' || inner_print_type === '1+1';
                const innerPrintMult = innerIsDouble ? 2 : 1;
                const innerSheetCost = innerMatPrice + (basePrintCost * innerPrintMult) + (baseOpCost * innerPrintMult) + sheetCuttingCost;

                const coverSheets = bodyYield > 0 ? Math.ceil(Math.ceil((quantity * 4) / bodyYield) * setupMultiplier) : 0;
                const innerSheets = bodyYield > 0 ? Math.ceil(Math.ceil((quantity * (inner_pages || 8)) / bodyYield) * setupMultiplier) : 0;
                
                totalCost = (coverSheetCost * coverSheets) + (innerSheetCost * innerSheets);
                unitPrice = quantity > 0 ? (totalCost / quantity) * sheetMarginMultiplier : 0;
                appliedRules.push(`BOM Booklet: Cover ${coverSheets} sheets, Inner ${innerSheets} sheets`);
            } else {
                let materialPrice = 0;
                if (material_id) {
                    const { data: mat } = await supabase.from('materials').select('unit_price').eq('id', material_id).maybeSingle();
                    if (mat) materialPrice = mat.unit_price || 0;
                }
                const isDouble = print_type === '4+4' || print_type === '1+1';
                const printMult = isDouble ? 2 : 1;
                const sheetCost = materialPrice + (basePrintCost * printMult) + (baseOpCost * printMult) + sheetCuttingCost;
                const grossSheets = bodyYield > 0 ? Math.ceil(Math.ceil(quantity / bodyYield) * setupMultiplier) : 0;
                
                totalCost = sheetCost * grossSheets;
                unitPrice = quantity > 0 ? (totalCost / quantity) * sheetMarginMultiplier : 0;
                appliedRules.push(`BOM Model: €${sheetCost.toFixed(3)}/sheet × ${grossSheets} sheets × ${sheetMarginMultiplier} margin`);
            }
            totalPrice = unitPrice * quantity;

        } else {
            // Fallback: Base Price rules
            const unitRule = rules.find(r => r.rule_type === 'Base Price per unit' && matchesQty(r));
            const per100Rule = rules.find(r => r.rule_type === 'Base Price per 100' && matchesQty(r));

            if (unitRule) {
                unitPrice = unitRule.value;
                appliedRules.push(`Base (unit): €${unitPrice}`);
            } else if (per100Rule) {
                unitPrice = per100Rule.value / 100;
                appliedRules.push(`Base (per 100): €${per100Rule.value}`);
            } else {
                unitPrice = product.base_price || 0;
                appliedRules.push(`Base (default): €${unitPrice}`);
            }
            totalPrice = unitPrice * quantity;
        }

        if (priceListOverrideBasePrice !== null) {
            unitPrice = priceListOverrideBasePrice;
            totalPrice = unitPrice * quantity;
            appliedRules.push(`💎 Client Price List Override: €${unitPrice.toFixed(2)}/vnt`);
        }

        // 3. Extras & Discounts
        // 3a. Lamination
        if (lamination && lamination !== 'None') {
            const lamRule = rules.find(r => 
                (r.rule_type === 'Extra Cost per unit' || 
                 r.rule_type === 'Lamination Cost' || 
                 r.rule_type === 'Extra Cost per 100' || 
                 r.rule_type === 'Extra Cost per Sheet' ||
                 r.rule_type === 'Extra Cost Flat') && 
                (r.extra_name === lamination || r.lamination === lamination)
            );

            if (lamRule) {
                const lamNameLower = lamination.toLowerCase();
                const isDoubleSidedLam = req.body.lamination_sides === 2 || lamNameLower.includes('dvipus') || lamNameLower.includes('2-pus');
                const isDoublePrint = (print_type === '4+4' || print_type === '1+1');
                const lamMultiplier = isDoubleSidedLam ? (isDoublePrint ? 2 : 1) : 1;

                let val = lamRule.value * lamMultiplier;
                let lamPricePerUnit = 0;

                if (lamRule.rule_type === 'Extra Cost per 100') {
                    lamPricePerUnit = val / 100;
                } else if (lamRule.rule_type === 'Extra Cost per Sheet') {
                    // Need to calculate itemsPerSheet for yield
                    let itemsPerSheet = 1;
                    
                    let effectiveW = itemW;
                    let effectiveH = itemH;

                    // If dimensions missing, try to extract from name (e.g. "90x50", "140x140", "A4")
                    if (effectiveW <= 0 || effectiveH <= 0) {
                        const name = product.name || '';
                        const dimMatch = name.match(/(\d+)\s*[x×*]\s*(\d+)/i);
                        if (dimMatch) {
                            effectiveW = parseInt(dimMatch[1]);
                            effectiveH = parseInt(dimMatch[2]);
                        } else if (name.includes('A4')) {
                            effectiveW = 210; effectiveH = 297;
                        } else if (name.includes('A5')) {
                            effectiveW = 148; effectiveH = 210;
                        } else if (name.toLowerCase().includes('vizit')) {
                            effectiveW = 90; effectiveH = 50;
                        }
                    }

                    if (effectiveW > 0 && effectiveH > 0) {
                        const sheet = { width: 320, height: 450 }; // Default SRA3
                        const spacing = product.item_spacing || 0;
                        const effW = effectiveW + spacing;
                        const effH = effectiveH + spacing;
                        const yieldA = Math.floor(sheet.width / effW) * Math.floor(sheet.height / effH);
                        const yieldB = Math.floor(sheet.width / effH) * Math.floor(sheet.height / effW);
                        itemsPerSheet = Math.max(yieldA, yieldB, 1);
                    } else {
                        // Fallback for standard small items if still zero
                        itemsPerSheet = 1; 
                    }
                    
                    const sheetsNeeded = Math.ceil(quantity / itemsPerSheet);
                    lamPricePerUnit = (sheetsNeeded * val) / quantity;
                } else if (lamRule.rule_type === 'Extra Cost Flat') {
                    lamPricePerUnit = (quantity > 0 ? val / quantity : 0);
                } else {
                    lamPricePerUnit = val;
                }
                
                if (lamRule.rule_type === 'Extra Cost Flat') {
                    totalPrice += val;
                    unitPrice += lamPricePerUnit;
                    appliedRules.push(`+ ${lamination} (flat): €${val.toFixed(2)}`);
                } else {
                    unitPrice += lamPricePerUnit;
                    totalPrice += (lamPricePerUnit * quantity);
                    appliedRules.push(`+ ${lamination}${lamMultiplier > 1 ? ' (x2 sides)' : ''}: €${lamPricePerUnit.toFixed(4)}/unit`);
                }
            } else {
                appliedRules.push(`⚠️ Lamination rule not found for: "${lamination}"`);
            }
        }

        // 3b. Selected Extras
        for (const extraName of selected_extras) {
            const extraNameLower = extraName.toLowerCase();
            // Special Case: Spiral Binding for Booklets
            if (isBooklet && (extraNameLower.includes('spiral') || extraNameLower.includes('rišim'))) {
                const bindCost = 0.80; // 0.50 + 0.30
                unitPrice += bindCost;
                totalPrice += (bindCost * quantity);
                appliedRules.push(`+ ${extraName}: Rišimas €0.5 + Spiralė €0.3 = €0.80/unit`);
                continue;
            }

            const extraRule = rules.find(r => (r.rule_type === 'Extra Cost per unit' || r.rule_type === 'Extra Cost per 100' || r.rule_type === 'Extra Cost Flat') && r.extra_name === extraName);
            if (extraRule) {
                let val = extraRule.value;
                if (extraRule.rule_type === 'Extra Cost per 100') val = val / 100;
                if (extraRule.rule_type === 'Extra Cost Flat') {
                    totalPrice += val;
                    unitPrice += (val / quantity);
                    appliedRules.push(`+ ${extraName} (flat): €${val.toFixed(2)}`);
                } else {
                    unitPrice += val;
                    totalPrice += (val * quantity);
                    appliedRules.push(`+ ${extraName}: €${val.toFixed(4)}/unit`);
                }
            }
        }

        // 3c. Qty Discount
        const qtyRule = rules.find(r => (r.rule_type === 'Qty Adjustment' || r.rule_type === 'Qty Discount') && matchesQty(r));
        if (qtyRule) {
            const adj = (qtyRule.rule_type === 'Qty Discount') ? -Math.abs(qtyRule.value) : qtyRule.value;
            totalPrice *= (1 + (adj / 100));
            unitPrice = quantity > 0 ? totalPrice / quantity : 0;
            appliedRules.push(`Qty ${qtyRule.rule_type}: ${adj}%`);
        }

        return res.status(200).json({
            success: true,
            unit_price: unitPrice,
            total_price: totalPrice,
            applied_rules: appliedRules
        });

    } catch (error) {
        console.error('Pricing API Error:', error);
        return res.status(500).json({ error: 'Failed to calculate price', message: error.message });
    }
}
