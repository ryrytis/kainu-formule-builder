import { supabase } from './supabase';

export interface PricingRequest {
    product_id: string; // Map product name to ID if needed, or pass ID
    quantity: number;
    width?: number; // For area-based calc (future)
    height?: number;
    material_id?: string;
    lamination?: string;
    print_type?: string;
    extra_works?: { name: string, duration: number }[];
}

export interface PricingResult {
    unit_price: number;
    total_price: number;
    total_cost?: number;
    margin_percent?: number;
    applied_rules: string[];
}

export const PricingService = {
    /**
     * Calculates the price for an item based on active calculation rules.
     */
    calculatePrice: async (request: PricingRequest): Promise<PricingResult> => {
        const { product_id, quantity, lamination, width, height, material_id } = request;

        let unitPrice = 0;
        let totalCost = 0;
        const appliedRules: string[] = [];
        let basePriceRuleApplied = false;

        // --- FETCH DATA (Parallel) ---
        const [
            { data: rules },
            { data: productData },
            { data: printOptions },
            { data: works },
            { data: materials },
            { data: matrixRules }
        ] = await Promise.all([
            (supabase as any).from('calculation_rules').select('*').eq('is_active', true).order('priority', { ascending: false }),
            (supabase as any).from('products').select('*').eq('id', product_id).single(),
            (supabase as any).from('print_options').select('*'),
            (supabase as any).from('works').select('*'),
            (supabase as any).from('materials').select('*'),
            (supabase as any).from('product_pricing_matrices').select('*').eq('product_id', product_id)
        ]);

        const product = productData || { name: 'Unknown' };

        // --- SHEET OPTIMIZATION & COST CALCULATION ---
        let sheetDetails = { itemsPerSheet: 0, totalSheets: 0, sheetCost: 0, printCost: 0, workCost: 0 };

        // 1. Determine Product Dimensions
        let ItemW = width || 0;
        let ItemH = height || 0;

        // Auto-detect standard sizes if not provided
        if (!ItemW || !ItemH) {
            const nameLower = product.name.toLowerCase();
            const standardSizes: Record<string, { w: number, h: number }> = {
                'a4': { w: 210, h: 297 },
                'a5': { w: 148, h: 210 },
                'a3': { w: 297, h: 420 },
                'vizitinės': { w: 90, h: 50 },
                'vizitines': { w: 90, h: 50 }
            };
            for (const key in standardSizes) {
                if (nameLower.includes(key)) {
                    ItemW = standardSizes[key].w;
                    ItemH = standardSizes[key].h;
                    appliedRules.push(`Standard Size: ${key.toUpperCase()} (${ItemW}x${ItemH}mm)`);
                    break;
                }
            }
        }

        if (ItemW && ItemH) {
            // SRA3 Sheet Dimensions
            const SheetW = 320;
            const SheetH = 450;
            const SheetAreaM2 = (SheetW * SheetH) / 1000000;

            // Geometric Layout
            const perSheetH = Math.floor(SheetW / ItemW) * Math.floor(SheetH / ItemH);
            const perSheetV = Math.floor(SheetW / ItemH) * Math.floor(SheetH / ItemW);
            sheetDetails.itemsPerSheet = Math.max(perSheetH, perSheetV) || 1;

            // Sheet Requirement
            const requiredSheetsNet = Math.ceil(quantity / sheetDetails.itemsPerSheet);
            const utilizationFactor = 0.8; // User specified 80% utilization
            sheetDetails.totalSheets = Math.ceil(requiredSheetsNet / utilizationFactor);

            appliedRules.push(`Sheet Optimization: ${sheetDetails.itemsPerSheet} per SRA3. Net: ${requiredSheetsNet}, Gross: ${sheetDetails.totalSheets} sheets.`);

            // MATERIAL COST
            if (material_id && materials) {
                const mat = materials.find((m: any) => m.id === material_id);
                if (mat) {
                    // Cost is per sheet (usually). If unit_price is per pack, we'd need to know. 
                    // Assuming materials.cost_price is per sheet or per unit (A3 sheet).
                    // If materials.unit is 'm2', then use area.
                    // For now, assume cost_price is per SRA3 sheet.
                    const costPerSheet = mat.cost_price || 0;
                    sheetDetails.sheetCost = sheetDetails.totalSheets * costPerSheet;
                    appliedRules.push(`Material Cost: €${sheetDetails.sheetCost.toFixed(2)} (${mat.name})`);
                }
            }

            // PRINT COST
            // Assume 4+4 default unless specified
            const printOptionName = '4+4';
            const printOpt = printOptions?.find((p: any) => p.print_option === printOptionName);
            if (printOpt) {
                const printCostPerSheet = printOpt.cost_price || 0;
                sheetDetails.printCost = sheetDetails.totalSheets * printCostPerSheet;
                appliedRules.push(`Print Cost: €${sheetDetails.printCost.toFixed(2)}`);
            }

            // LAMINATION WORK COST check
            if (lamination && works) {
                const work = works.find((w: any) => w.operation === lamination);
                if (work) {
                    // Assume lamination cost is per sheet too, or per meter?
                    // If cost_price is per unit... let's assume per sheet for lamination work.
                    const lamCost = (work.cost_price || 0) * sheetDetails.totalSheets;
                    sheetDetails.workCost += lamCost;
                    appliedRules.push(`Lamination Cost: €${lamCost.toFixed(2)}`);
                }
            }

            // GENERIC EXTRA WORKS
            if (request.extra_works && request.extra_works.length > 0 && works) {
                for (const extra of request.extra_works) {
                    const workDef = works.find((w: any) => w.operation === extra.name);
                    if (workDef) {
                        const exCost = (workDef.cost_price || 0) * extra.duration;
                        sheetDetails.workCost += exCost;
                        appliedRules.push(`Work: ${extra.name} x${extra.duration} (Cost: €${exCost.toFixed(2)})`);
                    }
                }
            }

            totalCost = sheetDetails.sheetCost + sheetDetails.printCost + sheetDetails.workCost;
        }


        // --- TIER 0: MATRIX PRICING (Exact Match) ---
        if (matrixRules && matrixRules.length > 0) {
            const match = matrixRules.find((m: any) => {
                const qtyMatch = quantity >= m.quantity_from && (m.quantity_to === null || quantity <= m.quantity_to);
                const matMatch = !m.material_id || m.material_id === material_id;
                const lamMatch = (!m.lamination || m.lamination === 'None') ? true : m.lamination === lamination;
                // const printMatch = !m.print_type || m.print_type === request.print_type || true; 

                return qtyMatch && matMatch && lamMatch;
            });

            if (match) {
                // If matrix price is TOTAL for the block
                // E.g. 100 qty = €20. Unit = 0.2.
                unitPrice = match.price / match.quantity_from;
                if (quantity > match.quantity_from) {
                    // Scaling? Or fixed block?
                    // Usually matrix is "100 vnt = 20eu". If 150 vnt, do we prorate?
                    // Let's assume linear pro-rating from the base unit price of that tier.
                }

                appliedRules.push(`Matrix Match: ${match.quantity_from}qty @ €${match.price}`);
                basePriceRuleApplied = true;
            }
        }

        // --- TIER 1: CHECK CUSTOM BASE PRICE RULES (Legacy) ---
        if (!basePriceRuleApplied && rules) {
            for (const rule of rules) {
                if (rule.rule_type === 'Base Price per unit' || rule.rule_type === 'Base Price per 100') {
                    const productMatch = !rule.product_id || rule.product_id === product_id;
                    const laminationMatch = !rule.lamination || rule.lamination === (lamination || 'None');
                    const minQtyMatch = !rule.min_quantity || quantity >= rule.min_quantity;
                    const maxQtyMatch = !rule.max_quantity || quantity <= rule.max_quantity;

                    if (productMatch && laminationMatch && minQtyMatch && maxQtyMatch) {
                        if (rule.rule_type === 'Base Price per unit') {
                            unitPrice = rule.value;
                            appliedRules.push(`Base Price Rule: ${rule.name} (€${rule.value}/unit)`);
                        } else {
                            unitPrice = rule.value / 100;
                            appliedRules.push(`Base Price Rule: ${rule.name} (€${rule.value}/100)`);
                        }
                        basePriceRuleApplied = true;
                        break;
                    }
                }
            }
        }

        // --- TIER 2: PRODUCT BASE PRICE ---
        if (!basePriceRuleApplied && (product as any).base_price) {
            unitPrice = (product as any).base_price;
            appliedRules.push(`Product Base Price: €${(product as any).base_price.toFixed(2)}`);
            basePriceRuleApplied = true;
        }

        // --- TIER 3: CALCULATED PRICE (Fallback) ---
        if (!basePriceRuleApplied && unitPrice === 0 && sheetDetails.itemsPerSheet > 0) {
            // Price Calculation based on Cost + Margin?
            // Or Price based on Sheet Price + Print Price?
            // Existing logic had hardcoded 15.00 print price etc.

            // Let's rely on Sales Price columns in materials/options if available, 
            // OR apply a standard margin to the Cost.
            // For now, let's keep the legacy logic for Price, but strictly calculate Cost.

            // Re-implementing simplified Price logic from before to maintain compatibility
            // Printing
            const printOptionName = '4+4';
            const printOpt = printOptions?.find((p: any) => p.print_option === printOptionName);
            const sheetPrintPrice = printOpt ? printOpt.price : 15.00; // Sales Price
            const printPriceTotal = sheetDetails.totalSheets * sheetPrintPrice; // Using Gross sheets for price too? Or Net? Usually Gross to cover waste.

            // Paper
            let sheetPaperPrice = 0.15;
            if (material_id && materials) {
                const mat = materials.find((m: any) => m.id === material_id);
                if (mat && mat.unit_price) sheetPaperPrice = mat.unit_price; // Sales Price
            }
            const paperPriceTotal = sheetDetails.totalSheets * sheetPaperPrice;

            // Lamination
            let laminationPriceTotal = 0;
            if (lamination && works) {
                const work = works.find((w: any) => w.operation === lamination);
                if (work) laminationPriceTotal = work.price * sheetDetails.totalSheets;
            }

            const totalCalculatedPrice = printPriceTotal + paperPriceTotal + laminationPriceTotal;
            unitPrice = totalCalculatedPrice / quantity;

            appliedRules.push(`Calculated: ${(unitPrice * quantity).toFixed(2)} (Cost: ${totalCost.toFixed(2)})`);
        }

        // --- FINAL ADJUSTMENTS (Multipliers) ---
        if (rules) {
            for (const rule of rules) {
                if (rule.rule_type === 'Qty Multiplier') {
                    const minQtyMatch = !rule.min_quantity || quantity >= rule.min_quantity;
                    if (minQtyMatch && unitPrice > 0) {
                        unitPrice = unitPrice * rule.value;
                        appliedRules.push(`${rule.name} (x${rule.value})`);
                    }
                }
                if (rule.rule_type === 'Client Discount' && unitPrice > 0) {
                    unitPrice = unitPrice * rule.value;
                    appliedRules.push(`${rule.name} (Client x${rule.value})`);
                }
            }
        }

        return {
            unit_price: Number(unitPrice.toFixed(4)),
            total_price: Number((unitPrice * quantity).toFixed(2)),
            total_cost: Number(totalCost.toFixed(2)),
            applied_rules: appliedRules,
            margin_percent: totalCost > 0 && (unitPrice * quantity) > 0
                ? Number((((unitPrice * quantity - totalCost) / (unitPrice * quantity)) * 100).toFixed(1))
                : 100 // If cost is 0, margin is effectively 100% (or undefined, but 100 is safer for display)
        };
    }
};
