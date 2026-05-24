// Self-contained pricing API for Vercel Serverless (Node.js runtime)
// Synchronized with PricingService.ts
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

function extractRollWidth(materialName) {
    if (!materialName) return null;
    const nameLower = materialName.toLowerCase();
    
    // Pattern 1: "Plotis X,Ym" or "Plotis X.Ym" (e.g. Plotis 1,067m or Plotis 1.067m)
    const meterMatch = materialName.match(/plotis\s*(\d+)(?:[.,](\d+))?\s*m/i);
    if (meterMatch) {
        const whole = parseInt(meterMatch[1], 10);
        const fractionStr = meterMatch[2] || '';
        const fractionVal = parseFloat('0.' + fractionStr) || 0;
        const meters = whole + fractionVal;
        return Math.round(meters * 1000);
    }
    
    // Pattern 2: "Plotis Xmm" or "Plotis X mm"
    const mmMatch = materialName.match(/plotis\s*(\d+)\s*mm/i);
    if (mmMatch) {
        return parseInt(mmMatch[1], 10);
    }

    // Pattern 3: Standard widths for roll labels
    if (nameLower.includes('rulon') || nameLower.includes('inkjet') || nameLower.includes('coated') || nameLower.includes('gloss') || nameLower.includes('matte') || nameLower.includes('photo')) {
        const numMatch = materialName.match(/\b(125|150|220|330|440|610|914|1067|1118|1270|1524|1620)\b/);
        if (numMatch) {
            return parseInt(numMatch[1], 10);
        }
    }

    return null;
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

        // Fetch Product & Rules
        const { data: product, error: prodErr } = await supabase.from('products').select('*').eq('id', product_id).maybeSingle();
        if (prodErr || !product) return res.status(404).json({ error: 'Product not found' });

        const { data: rules = [] } = await supabase.from('calculation_rules').select('*').eq('is_active', true).order('priority', { ascending: false });

        const matchesProduct = (rule) => {
            if (rule.material_id && rule.material_id !== material_id) return false;
            if (rule.product_id && rule.product_id === product_id) return true;
            if (rule.product_category && rule.product_category === product.category) return true;
            return !rule.product_id && !rule.product_category;
        };

        const matchesQty = (r) => {
            const minOk = !r.min_quantity || quantity >= r.min_quantity;
            const maxOk = !r.max_quantity || quantity <= r.max_quantity;
            return minOk && maxOk;
        };

        const getRuleVal = (type, def) => {
            const r = rules.find(r => r.rule_type === type && matchesProduct(r) && matchesQty(r));
            return r ? r.value : def;
        };

        // Fetch Material Details
        let materialName = '';
        let materialUnitPrice = 0;
        let materialWidth = null;
        let materialHeight = null;

        if (material_id) {
            const { data: mat, error: matErr } = await supabase
                .from('materials')
                .select('name, unit_price, width, height')
                .eq('id', material_id)
                .maybeSingle();

            if (matErr || !mat) {
                const { data: fallbackMat } = await supabase
                    .from('materials')
                    .select('name, unit_price')
                    .eq('id', material_id)
                    .maybeSingle();
                if (fallbackMat) {
                    materialName = fallbackMat.name || '';
                    materialUnitPrice = fallbackMat.unit_price || 0;
                }
            } else {
                materialName = mat.name || '';
                materialUnitPrice = mat.unit_price || 0;
                materialWidth = mat.width || null;
                materialHeight = mat.height || null;
            }
        }

        let rollWidth = materialWidth;
        let isRollMaterial = rollWidth !== null && materialHeight === null;

        if (rollWidth === null && materialName) {
            rollWidth = extractRollWidth(materialName);
            isRollMaterial = rollWidth !== null;
        }

        // Client Price List Override
        let priceListOverrideBasePrice = null;
        if (client_price_list_id) {
            const { data: plItem } = await supabase.from('price_list_items').select('custom_base_price').eq('price_list_id', client_price_list_id).eq('product_id', product_id).maybeSingle();
            if (plItem) priceListOverrideBasePrice = plItem.custom_base_price;
        }

        const nameLower = product.name.toLowerCase();
        const catLower = (product.category || '').toLowerCase();
        
        const isRollSticker = nameLower.includes('rulon') && nameLower.includes('lipdukas');
        const isPaperSticker = nameLower.includes('popieriaus');
        const isSheetLipdukas = nameLower.includes('lipdukas') && !isRollSticker;
        const isBox = nameLower.includes('dėžut') || nameLower.includes('dezut') || nameLower.includes('box');
        const isSleeve = nameLower.includes('įmaut') || nameLower.includes('imaut') || nameLower.includes('mova') || nameLower.includes('movą') || nameLower.includes('mov');
        const isKarulis = catLower.includes('karul') || nameLower.includes('karul');
        const isBooklet = nameLower.includes('buklet') || nameLower.includes('katalog') || nameLower.includes('knyg') || nameLower.includes('leidin');

        let unitPrice = 0;
        let totalPrice = 0;

        const SRA3 = { width: 320, height: 450, name: 'SRA3' };
        const CUT_SHEET = { width: 500, height: 700, name: '500×700' };

        const setupPercent = getRuleVal('Sheet Setup Waste', 20);
        const setupMultiplier = 1 + (setupPercent / 100);

        const sheet = isRollMaterial
            ? { width: rollWidth || 1000, height: 1000, name: `Rulonas ${rollWidth}mm` }
            : (materialWidth && materialHeight
                ? { width: materialWidth, height: materialHeight, name: `${materialWidth}×${materialHeight}mm` }
                : (production_mode === 'cut_only' ? CUT_SHEET : SRA3));

        let sheetCalc;
        const spacing = product.item_spacing || 0;

        if (!isRollSticker && !isSheetLipdukas && itemW > 0 && itemH > 0) {
            if (isRollMaterial) {
                // Roll layout calculation (continuous feed)
                const effectiveW_A = itemW + spacing;
                const effectiveH_A = itemH + spacing;
                const colsA = Math.floor((rollWidth + spacing) / effectiveW_A);

                const effectiveW_B = itemH + spacing;
                const effectiveH_B = itemW + spacing;
                const colsB = Math.floor((rollWidth + spacing) / effectiveW_B);

                let cols = 0;
                let rowHeight = 0;
                let usedOrientation = 'Portrait';

                if (colsA > 0 && colsB > 0) {
                    const rowsA = Math.ceil(quantity / colsA);
                    const lenA = rowsA * effectiveH_A;

                    const rowsB = Math.ceil(quantity / colsB);
                    const lenB = rowsB * effectiveH_B;

                    if (lenA <= lenB) {
                        cols = colsA;
                        rowHeight = effectiveH_A;
                        usedOrientation = 'Portrait';
                    } else {
                        cols = colsB;
                        rowHeight = effectiveH_B;
                        usedOrientation = 'Landscape';
                    }
                } else if (colsA > 0) {
                    cols = colsA;
                    rowHeight = effectiveH_A;
                    usedOrientation = 'Portrait';
                } else if (colsB > 0) {
                    cols = colsB;
                    rowHeight = effectiveH_B;
                    usedOrientation = 'Landscape';
                } else {
                    cols = 1;
                    rowHeight = Math.max(effectiveH_A, effectiveH_B);
                    usedOrientation = 'Exceeds Roll Width';
                }

                const netRows = Math.ceil(quantity / cols);
                const netLengthMm = netRows * rowHeight;
                const grossLengthMm = Math.ceil(netLengthMm * setupMultiplier);
                const metersNeeded = Number((grossLengthMm / 1000).toFixed(2));

                const totalCapacity = Math.ceil((metersNeeded * 1000) / rowHeight) * cols;
                const wasteItems = totalCapacity - quantity;
                const totalWastePercent = totalCapacity > 0 ? (wasteItems / totalCapacity) * 100 : 0;

                sheetCalc = {
                    item_width: itemW,
                    item_height: itemH,
                    sheet_width: rollWidth || 1000,
                    sheet_height: 1000,
                    sheet_name: `Rulonas ${rollWidth || 1000}mm (${usedOrientation})`,
                    items_per_sheet: cols,
                    sheets_needed: metersNeeded,
                    waste_percent: Number(totalWastePercent.toFixed(1)),
                    setup_waste_percent: Number(setupPercent.toFixed(1)),
                    layout_waste_percent: Number(Math.max(0, totalWastePercent - setupPercent).toFixed(1))
                };
            } else {
                // Sheet layout calculation
                const effectiveW = itemW + spacing;
                const effectiveH = itemH + spacing;
                const layoutA = Math.floor(sheet.width / effectiveW) * Math.floor(sheet.height / effectiveH);
                const layoutB = Math.floor(sheet.width / effectiveH) * Math.floor(sheet.height / effectiveW);
                const itemsPerSheet = Math.max(layoutA, layoutB);
                
                const netSheets = itemsPerSheet > 0 ? Math.ceil(quantity / itemsPerSheet) : 0;
                const grossSheets = Math.ceil(netSheets * setupMultiplier);
                
                const totalCapacity = grossSheets * itemsPerSheet;
                const setupWasteItems = (grossSheets - netSheets) * itemsPerSheet;
                const layoutWasteItems = (netSheets * itemsPerSheet) - quantity;
                
                const totalW = totalCapacity > 0 ? ((setupWasteItems + layoutWasteItems) / totalCapacity) * 100 : 0;
                
                sheetCalc = {
                    item_width: itemW,
                    item_height: itemH,
                    sheet_width: sheet.width,
                    sheet_height: sheet.height,
                    sheet_name: sheet.name,
                    items_per_sheet: itemsPerSheet,
                    sheets_needed: grossSheets,
                    waste_percent: Number(totalW.toFixed(1)),
                    setup_waste_percent: Number(((setupWasteItems / totalCapacity) * 100).toFixed(1)),
                    layout_waste_percent: Number(((layoutWasteItems / totalCapacity) * 100).toFixed(1))
                };
            }
        }

        // Dimensions to Yield Fallback
        if (!sheetCalc && !nameLower.includes('siuntim') && !nameLower.includes('dizain')) {
            let effectiveW = itemW;
            let effectiveH = itemH;
            if (effectiveW <= 0 || effectiveH <= 0) {
                const dimMatch = nameLower.match(/(\d+)\s*[x×*]\s*(\d+)/i);
                if (dimMatch) {
                    effectiveW = parseInt(dimMatch[1]);
                    effectiveH = parseInt(dimMatch[2]);
                } else if (nameLower.includes('a4')) {
                    effectiveW = 210; effectiveH = 297;
                } else if (nameLower.includes('a5')) {
                    effectiveW = 148; effectiveH = 210;
                } else if (nameLower.includes('vizit')) {
                    effectiveW = 90; effectiveH = 50;
                }
            }
            if (effectiveW > 0 && effectiveH > 0) {
                const effW = effectiveW + spacing;
                const effH = effectiveH + spacing;
                const yieldA = Math.floor(SRA3.width / effW) * Math.floor(SRA3.height / effH);
                const yieldB = Math.floor(SRA3.width / effH) * Math.floor(SRA3.height / effW);
                const bestYield = Math.max(yieldA, yieldB, 1);
                
                sheetCalc = {
                    item_width: effectiveW,
                    item_height: effectiveH,
                    sheet_width: SRA3.width,
                    sheet_height: SRA3.height,
                    sheet_name: SRA3.name,
                    items_per_sheet: bestYield,
                    sheets_needed: Math.ceil(quantity / bestYield),
                    waste_percent: 0,
                    layout_waste_percent: 0,
                    setup_waste_percent: 0
                };
            }
        }

        // Base Price Resolution
        let basePrice = 0;
        let isPerUnit = false;

        if (isRollSticker && itemW > 0 && itemH > 0) {
            // Roll sticker logic
            const rollWidthRule     = getRuleVal('Roll Width', 125);
            const sideMargin    = getRuleVal('Roll Side Margin', 10);
            const bleed         = getRuleVal('Roll Padding/Bleed', 2);
            const spacingRule   = isPaperSticker ? getRuleVal('Roll Spacing Paper', 7) : getRuleVal('Roll Spacing Pleveles', 4);
            const paintPriceM2  = getRuleVal('Roll Paint Price/m2', 8.0);
            const marginMul     = getRuleVal('Roll Default Margin', 1.5);

            const { pricePerSticker, bestYield, orientation } = calcRollPrice({
                width: itemW, height: itemH, materialPricePerM: materialUnitPrice, rollWidth: rollWidthRule, sideMargin, bleed, spacing: spacingRule,
                paintPriceM2, marginMultiplier: marginMul,
                manualPaintPrice: manual_unit_paint_price ?? null
            });

            basePrice = pricePerSticker;
            isPerUnit = true;
            appliedRules.push(`Roll Yield: ${bestYield} qty/m (${orientation})`);

        } else if ((isBox || isSleeve || isKarulis || isBooklet) && itemW > 0 && itemH > 0) {
            // BOM-based Packaging layout & calculations
            const isDouble = print_type === '4+4' || print_type === '1+1';
            const printMult = isDouble ? 2 : 1;
            const basePrintCost = production_mode === 'cut_only' ? 0 : getRuleVal('Sheet Print Cost', 0.10);
            const baseOpCost = production_mode === 'cut_only' ? 0 : getRuleVal('Sheet Print Operation', 0.05);
            const sheetPrintCost = basePrintCost * printMult;
            const sheetOperationCost = baseOpCost * printMult;
            const sheetCuttingCost = getRuleVal('Sheet Cutting Cost', 0.05);
            const sheetMarginMultiplier = getRuleVal('Sheet Margin', 1.5);

            let bodyYield = sheetCalc ? sheetCalc.items_per_sheet : 1;
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
                basePrice = quantity > 0 ? (totalCost / quantity) * sheetMarginMultiplier : 0;
                isPerUnit = true;
                appliedRules.push(`BOM Booklet: Cover ${coverSheets} sheets, Inner ${innerSheets} sheets`);
            } else {
                const sheetCost = materialUnitPrice + sheetPrintCost + sheetOperationCost + sheetCuttingCost;
                const grossSheets = bodyYield > 0 ? Math.ceil(Math.ceil(quantity / bodyYield) * setupMultiplier) : 0;
                
                totalCost = sheetCost * grossSheets;
                basePrice = quantity > 0 ? (totalCost / quantity) * sheetMarginMultiplier : 0;
                isPerUnit = true;
                appliedRules.push(`BOM Model: €${sheetCost.toFixed(3)}/sheet × ${grossSheets} sheets × ${sheetMarginMultiplier} margin`);
            }
        } else {
            // Standard fallback pricing rules
            const unitRule = rules.find(r => r.rule_type === 'Base Price per unit' && matchesProduct(r) && matchesQty(r));
            const per100Rule = rules.find(r => r.rule_type === 'Base Price per 100' && matchesProduct(r) && matchesQty(r));

            if (unitRule) {
                basePrice = unitRule.value;
                isPerUnit = true;
                appliedRules.push(`Base (unit): €${basePrice}`);
            } else if (per100Rule) {
                basePrice = per100Rule.value;
                appliedRules.push(`Base (per 100): €${basePrice}`);
            } else {
                basePrice = product.base_price || 0;
                isPerUnit = true;
                appliedRules.push(`Base (default): €${basePrice}`);
            }
        }

        if (priceListOverrideBasePrice !== null) {
            basePrice = priceListOverrideBasePrice;
            isPerUnit = true;
            appliedRules.push(`💎 Client Price List Override: €${basePrice.toFixed(2)}/vnt`);
        }

        let baseTotal = isPerUnit ? (basePrice * quantity) : (basePrice * (quantity / 100));
        let extrasTotal = 0;

        // 3. Extras & Discounts
        // 3aa. Paper Cost (for non-BOM standard products like posters, flyers, etc.)
        const isBOMProduct = isRollSticker || isSheetLipdukas || isBox || isSleeve || isKarulis || isBooklet;
        if (!isBOMProduct && material_id && materialUnitPrice > 0 && sheetCalc) {
            const marginMultiplier = isRollMaterial
                ? getRuleVal('Roll Default Margin', 1.5)
                : getRuleVal('Sheet Default Margin', 1.5);
            
            const paperCost = sheetCalc.sheets_needed * materialUnitPrice;
            const paperPrice = paperCost * marginMultiplier;

            extrasTotal += paperPrice;
            appliedRules.push(
                `+ Popierius (${materialName}): ${sheetCalc.sheets_needed.toFixed(2)}${isRollMaterial ? 'm' : ' lap.'} × €${materialUnitPrice.toFixed(4)} × Margin ${marginMultiplier} = €${paperPrice.toFixed(2)}`
            );
        }

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
                    extrasTotal += lamPricePerUnit * quantity;
                } else if (lamRule.rule_type === 'Extra Cost per Sheet') {
                    const itemsPerSheet = sheetCalc?.items_per_sheet || 1;
                    const sheetsNeeded = Math.ceil(quantity / itemsPerSheet);
                    extrasTotal += sheetsNeeded * val;
                } else if (lamRule.rule_type === 'Extra Cost Flat') {
                    extrasTotal += val;
                } else {
                    extrasTotal += val * quantity;
                }
                appliedRules.push(`+ ${lamination}${lamMultiplier > 1 ? ' (x2 sides)' : ''}: €${(lamRule.rule_type === 'Extra Cost Flat' ? val : (val * quantity)).toFixed(2)}`);
            }
        }

        // 3b-inkjet. Inkjet Click Cost (Canon GP-4600s Skaitiklis A–E)
        const inkjetCounter = req.body.inkjet_counter;
        const isCanonMaterial = materialName.toLowerCase().includes('canon');
        if (inkjetCounter && isCanonMaterial) {
            const clickRules = rules.filter(r =>
                r.rule_type === 'Inkjet Click Cost' &&
                matchesProduct(r)
            );
            const clickRule = clickRules.find(r => r.inkjet_counter === inkjetCounter)
                || clickRules.find(r => !r.inkjet_counter);

            const defaultRates = {
                A: 0.0750,
                B: 0.1310,
                C: 0.1880,
                D: 0.2810,
                E: 0.4380
            };
            const clickRate = clickRule ? clickRule.value : (defaultRates[inkjetCounter] || 0);

            if (clickRate > 0 && itemW > 0 && itemH > 0) {
                const areaM2 = (itemW * itemH) / 1_000_000;
                const areaA4 = areaM2 * 16;
                const clickCostPerUnit = areaA4 * clickRate;
                const clickTotal = clickCostPerUnit * quantity;
                extrasTotal += clickTotal;
                appliedRules.push(
                    `+ Inkjet Skaitiklis ${inkjetCounter}: ${itemW}×${itemH}mm = ${areaM2.toFixed(4)}m² = ${areaA4.toFixed(4)}A4 × €${clickRate.toFixed(4)}/A4 = €${clickCostPerUnit.toFixed(4)}/unit × ${quantity} = €${clickTotal.toFixed(2)}${!clickRule ? ' (Standard Fallback Rate)' : ''}`
                );
            }
        }

        // 3b. Selected Extras
        for (const extraName of selected_extras) {
            const extraNameLower = extraName.toLowerCase();
            if (isBooklet && (extraNameLower.includes('spiral') || extraNameLower.includes('rišim'))) {
                const bindCost = 0.80 * quantity;
                extrasTotal += bindCost;
                appliedRules.push(`+ ${extraName}: €${bindCost.toFixed(2)}`);
                continue;
            }

            const extraRule = rules.find(r => (r.rule_type === 'Extra Cost per unit' || r.rule_type === 'Extra Cost per 100' || r.rule_type === 'Extra Cost Flat' || r.rule_type === 'Extra Cost per Sheet') && r.extra_name === extraName);
            if (extraRule) {
                let val = extraRule.value;
                if (extraRule.rule_type === 'Extra Cost per 100') {
                    extrasTotal += (val / 100) * quantity;
                    appliedRules.push(`+ ${extraName}: €${((val / 100) * quantity).toFixed(2)}`);
                } else if (extraRule.rule_type === 'Extra Cost Flat') {
                    extrasTotal += val;
                    appliedRules.push(`+ ${extraName} (flat): €${val.toFixed(2)}`);
                } else if (extraRule.rule_type === 'Extra Cost per Sheet') {
                    const itemsPerSheet = sheetCalc?.items_per_sheet || 1;
                    const sheetsNeeded = Math.ceil(quantity / itemsPerSheet);
                    extrasTotal += sheetsNeeded * val;
                    appliedRules.push(`+ ${extraName} (per sheet): €${(sheetsNeeded * val).toFixed(2)}`);
                } else {
                    extrasTotal += val * quantity;
                    appliedRules.push(`+ ${extraName}: €${(val * quantity).toFixed(2)}`);
                }
            }
        }

        let finalTotal = baseTotal + extrasTotal;

        // 3c. Qty Discount / Adjustment
        const qtyRule = rules.find(r => (r.rule_type === 'Qty Adjustment' || r.rule_type === 'Qty Discount') && matchesQty(r));
        if (qtyRule) {
            const adj = (qtyRule.rule_type === 'Qty Discount') ? -Math.abs(qtyRule.value) : qtyRule.value;
            finalTotal *= (1 + (adj / 100));
            appliedRules.push(`Qty ${qtyRule.rule_type}: ${adj}%`);
        } else {
            const legacyMult = rules.find(r => r.rule_type === 'Qty Multiplier' && matchesQty(r));
            if (legacyMult) {
                finalTotal *= legacyMult.value;
                appliedRules.push(`Qty Mult (legacy): ×${legacyMult.value}`);
            }
        }

        // Client Discount
        let clientDiscountPercent = 0;
        const clientRule = rules.find(r => r.rule_type === 'Client Discount');
        if (clientRule && clientRule.value < 1) {
            clientDiscountPercent = (1 - clientRule.value) * 100;
            finalTotal *= clientRule.value;
            appliedRules.push(`Client Discount: -${clientDiscountPercent.toFixed(1)}%`);
        }

        unitPrice = quantity > 0 ? finalTotal / quantity : 0;
        totalPrice = finalTotal;

        return res.status(200).json({
            success: true,
            unit_price: Number(unitPrice.toFixed(4)),
            total_price: Number(totalPrice.toFixed(2)),
            applied_rules: appliedRules
        });

    } catch (error) {
        console.error('Pricing API Error:', error);
        return res.status(500).json({ error: 'Failed to calculate price', message: error.message });
    }
}
