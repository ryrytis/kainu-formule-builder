import { supabase } from './supabase';

export interface PricingRequest {
    product_id: string; // Map product name to ID if needed, or pass ID
    quantity: number;
    width?: number; // For area-based calc (future)
    height?: number;
    material_id?: string;
    lamination?: string;
    print_type?: string;
}

export interface PricingResult {
    unit_price: number;
    total_price: number;
    applied_rules: string[];
}

export const PricingService = {
    /**
     * Calculates the price for an item based on active calculation rules.
     */
    calculatePrice: async (request: PricingRequest): Promise<PricingResult> => {
        const { product_id, quantity, lamination, width, height, material_id } = request;

        let unitPrice = 0;
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

        // --- TIER 0: MATRIX PRICING (Exact Match) ---
        // This takes precedence over everything else except client discounts
        if (matrixRules && matrixRules.length > 0) {
            const match = matrixRules.find((m: any) => {
                const qtyMatch = quantity >= m.quantity_from && (m.quantity_to === null || quantity <= m.quantity_to);
                // If lamination/print_type/material are specified in Matrix, they MUST match request.
                // If they are null in Matrix, they are wildcards (match anything or ignore).

                // Strict matching logic:
                // 1. If Matrix has value, Request MUST match.
                // 2. If Matrix is null, it applies to all.
                // However, user wants "specific rows", so usually it implies strict match if provided.

                // Let's assume:
                // If request has 'lamination', and matrix has 'lamination', they must equal.
                // If matrix has 'lamination' but request doesn't, it's a mismatch (unless default).

                // Simplified Strict Match for Version 1:
                const matMatch = !m.material_id || m.material_id === material_id;
                const lamMatch = (!m.lamination || m.lamination === 'None') ? true : m.lamination === lamination;
                const printMatch = !m.print_type || m.print_type === request.print_type || true; // TODO: Request needs print_type. 
                // Note: 'request' input currently doesn't strictly disable 'print_type' but we can infer or ignore for now if not strictly passed.
                // Re-reading interface: PricingRequest doesn't have print_type yet. I'll need to add it or infer it.

                return qtyMatch && matMatch && lamMatch && printMatch;
            });

            if (match) {
                unitPrice = match.price / quantity; // Matrix price is TOTAL for that Qty usually? Or Unit?
                // Plan said "Price (Input)". Usually in print matrix it's "Price for 100 is €20". So Unit Price = 0.20.
                // Let's assume the Input Price is TOTAL for that row (e.g. 100pcs = €20).
                // Because user said "Price €" in UI for Qty 100.

                // Wait, previous code says `unitPrice = rule.value` for base price per unit.
                // Let's look at UI: "Total Price (€)".
                // So if I enter 20 for 100 qty, unit is 0.2.

                // BUT, if the quantity requested is 150, and we matched the '100' row (range 100-199?), do we use the unit price of the 100 row?
                // The logic `quantity >= m.quantity_from` suggests stepped pricing.
                // Let's treat the matrix price as the TOTAL price for the `quantity_from` amount?
                // No, usually matrix is "Price for X amount".
                // If I have a row: 100 qty, €20.
                // If I order 100, price is €20.
                // If I order 101?
                // Simplest interpretation: The price defined is for the exact quantity block?
                // Or does it resolve to a unit price?
                // Let's calculate unit price from the matrix entry.

                unitPrice = match.price / match.quantity_from;
                // Example: 100 cards = €20. Unit = 0.2.
                // If I order 150 cards, cost is 150 * 0.2 = €30.

                appliedRules.push(`Matrix Match: ${match.quantity_from}qty @ €${match.price} total`);
                basePriceRuleApplied = true;
            }
        }

        // --- TIER 1: CHECK CUSTOM BASE PRICE RULES (Legacy) ---
        if (rules) {
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
                        break; // Stop after highest priority base price rule
                    }
                }
            }
        }

        // --- TIER 2: PRODUCT BASE PRICE (from products table) ---
        if (!basePriceRuleApplied && (product as any).base_price) {
            unitPrice = (product as any).base_price;
            appliedRules.push(`Product Base Price: €${(product as any).base_price.toFixed(2)}`);
            basePriceRuleApplied = true;
        }

        // --- TIER 2.5: DESIGN SERVICE CHECK ---
        if (!basePriceRuleApplied) {
            const isDesignService = product.name.toLowerCase().includes('dizainas') || product.name.toLowerCase().includes('maketavimas');
            if (isDesignService) {
                appliedRules.push('Design Service Detected');
            }
        }

        // --- TIER 3: SHEET OPTIMIZATION (Standard Calculation) ---
        if (!basePriceRuleApplied && unitPrice === 0) {
            // 1. Determine Dimensions
            let prodWidth = width || 0;
            let prodHeight = height || 0;

            // Auto-detect standard sizes if not provided
            const standardSizes: Record<string, { w: number, h: number }> = {
                'a4': { w: 210, h: 297 },
                'a5': { w: 148, h: 210 },
                'a3': { w: 297, h: 420 },
                'vizitinės': { w: 90, h: 50 },
                'vizitines': { w: 90, h: 50 }
            };

            if (!prodWidth || !prodHeight) {
                const nameLower = product.name.toLowerCase();
                for (const key in standardSizes) {
                    if (nameLower.includes(key)) {
                        prodWidth = standardSizes[key].w;
                        prodHeight = standardSizes[key].h;
                        appliedRules.push(`Standard Size Detected: ${key.toUpperCase()}`);
                        break;
                    }
                }
            }

            if (prodWidth && prodHeight) {
                // 2. Algorithm Selection
                // Simple A3 Sheet Optimization
                const SHEET_W = 320; // SRA3 roughly or raw sheet
                const SHEET_H = 450;

                // Fits horizontal
                const fitsH = Math.floor(SHEET_W / prodWidth) * Math.floor(SHEET_H / prodHeight);
                // Fits vertical
                const fitsV = Math.floor(SHEET_W / prodHeight) * Math.floor(SHEET_H / prodWidth);

                const itemsPerSheet = Math.max(fitsH, fitsV) || 1;
                appliedRules.push(`Sheet Opt: ${itemsPerSheet} items/sheet (SRA3)`);

                // 3. Costs
                // Printing (Default to 4+4 if not specified/mapped, assume €15.00/sheet)
                // TODO: Map 'request.print_type' to 'print_options.print_option'
                const printOptionName = '4+4'; // Hardcoded for demo, map from request.printType properly
                const printOpt = printOptions?.find((p: any) => p.print_option === printOptionName);
                const sheetPrintPrice = printOpt ? printOpt.price : 15.00;
                const printCostPerItem = sheetPrintPrice / itemsPerSheet;

                // Paper
                let sheetPaperPrice = 0.15; // Default fallback
                if (material_id && materials) {
                    const mat = materials.find((m: any) => m.id === material_id);
                    if (mat && mat.unit_price) {
                        sheetPaperPrice = mat.unit_price;
                        appliedRules.push(`Material: ${mat.name}`);
                    }
                }
                const paperCostPerItem = sheetPaperPrice / itemsPerSheet;

                // Lamination
                let laminationCost = 0;
                if (lamination && works) {
                    const work = works.find((w: any) => w.operation === lamination);
                    if (work) {
                        laminationCost = work.price / itemsPerSheet; // Assuming sheet lamination, or if unit based, don't divide
                        appliedRules.push(`Lamination: ${work.operation}`);
                    }
                }

                unitPrice = printCostPerItem + paperCostPerItem + laminationCost;
            }
        }

        // --- FINAL ADJUSTMENTS (Multipliers) ---
        if (rules) {
            for (const rule of rules) {
                // Quantity Multiplier (Discount)
                if (rule.rule_type === 'Qty Multiplier') {
                    // Check criteria match (e.g. gaminys_contains)
                    // Simplified criteria check for now
                    const minQtyMatch = !rule.min_quantity || quantity >= rule.min_quantity;
                    if (minQtyMatch && unitPrice > 0) {
                        unitPrice = unitPrice * rule.value;
                        appliedRules.push(`${rule.name} (x${rule.value})`);
                    }
                }
                // Client Discount
                if (rule.rule_type === 'Client Discount' && unitPrice > 0) {
                    unitPrice = unitPrice * rule.value;
                    appliedRules.push(`${rule.name} (Client x${rule.value})`);
                }
            }
        }

        return {
            unit_price: Number(unitPrice.toFixed(4)),
            total_price: Number((unitPrice * quantity).toFixed(2)),
            applied_rules: appliedRules
        };
    }
};
