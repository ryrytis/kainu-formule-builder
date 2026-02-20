import { supabase } from './supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PricingRequest {
    product_id: string;
    quantity: number;
    lamination?: string;        // 'None' | 'Matt' | 'Gloss' | 'SoftTouch'
    selected_extras?: string[]; // extra_name values, e.g. ['Foil', 'Rounded Corners']
    client_discount_koef?: number;
    production_mode?: 'printed' | 'cut_only'; // printed → SRA3, cut_only → 500×700mm
    pages?: number;             // For calendars/booklets — pages per unit
    // Sheet-based fields (for stickers, boxes, custom-size products)
    width?: number;  // mm
    height?: number; // mm
    material_id?: string;
    print_type?: string;
}

export interface ExtraLine {
    name: string;
    price_per_unit: number;
    total: number;
}

export interface SheetCalcDetails {
    item_width: number;
    item_height: number;
    sheet_width: number;
    sheet_height: number;
    sheet_name: string;  // 'SRA3' or '500×700'
    items_per_sheet: number;
    sheets_needed: number;
    waste_percent: number;
    pages?: number;        // Pages per unit (calendars/booklets)
    total_prints?: number; // pages × quantity
}

export interface PricingBreakdown {
    // Base
    base_price_per_100: number;
    base_total: number;
    // Extras (per unit)
    extras: ExtraLine[];
    extras_total: number;
    // Subtotal before adjustments
    subtotal: number;
    // Qty adjustment (can be + for small orders or - for large)
    qty_adjustment_percent: number;  // e.g. +10 or -5
    qty_adjustment_amount: number;
    // Client discount
    client_discount_percent: number;
    client_discount_amount: number;
    // Final
    total: number;
    unit_price: number;
    // Sheet calculation (when applicable)
    sheet_calc?: SheetCalcDetails;
    // Audit trail
    applied_rules: string[];
}

export interface PricingResult {
    unit_price: number;
    total_price: number;
    applied_rules: string[];
    breakdown?: PricingBreakdown;
}

// ─── Rule type constants ─────────────────────────────────────────────────────

export const RULE_TYPES = {
    BASE_PRICE_100: 'Base Price per 100',
    EXTRA_COST_UNIT: 'Extra Cost per unit',
    EXTRA_COST_FLAT: 'Extra Cost Flat',
    QTY_ADJUSTMENT: 'Qty Adjustment',    // +10% for 50 pcs, -5% for 200, -10% for 500, etc.
    CLIENT_DISCOUNT: 'Client Discount',
    // Legacy (backward compatible)
    BASE_PRICE_UNIT: 'Base Price per unit',
    QTY_MULTIPLIER: 'Qty Multiplier',
    LAMINATION_COST: 'Lamination Cost',
    EXTRA_COST_100: 'Extra Cost per 100',
} as const;

// ─── Sheet Calculator ────────────────────────────────────────────────────────

const SRA3 = { width: 320, height: 450, name: 'SRA3' };
const CUT_SHEET = { width: 500, height: 700, name: '500×700' }; // For unprinted/cut-only (e.g. boxes)

function calculateSheetLayout(
    itemW: number, itemH: number,
    sheet = SRA3
): SheetCalcDetails {
    // Try both orientations and pick the best
    const layoutA = Math.floor(sheet.width / itemW) * Math.floor(sheet.height / itemH);
    const layoutB = Math.floor(sheet.width / itemH) * Math.floor(sheet.height / itemW);
    const itemsPerSheet = Math.max(layoutA, layoutB, 1);

    return {
        item_width: itemW,
        item_height: itemH,
        sheet_width: sheet.width,
        sheet_height: sheet.height,
        sheet_name: sheet.name,
        items_per_sheet: itemsPerSheet,
        sheets_needed: 0,
        waste_percent: 0
    };
}

function computeSheets(layout: SheetCalcDetails, quantity: number, pages = 1): SheetCalcDetails {
    const totalPrints = quantity * pages;
    const netSheets = Math.ceil(totalPrints / layout.items_per_sheet);
    // ~20% waste factor for setup, alignment, color proofing
    const grossSheets = Math.ceil(netSheets * 1.2);
    const totalItemsProduced = grossSheets * layout.items_per_sheet;
    const wasteItems = totalItemsProduced - totalPrints;
    const wastePercent = totalItemsProduced > 0 ? (wasteItems / totalItemsProduced) * 100 : 0;

    return {
        ...layout,
        sheets_needed: grossSheets,
        waste_percent: Number(wastePercent.toFixed(1)),
        pages: pages > 1 ? pages : undefined,
        total_prints: pages > 1 ? totalPrints : undefined,
    };
}

// Standard product sizes (mm) and default page counts
const STANDARD_SIZES: Record<string, { w: number; h: number; pages?: number }> = {
    'vizitinės': { w: 90, h: 50 },
    'vizitines': { w: 90, h: 50 },
    'business card': { w: 90, h: 50 },
    'a4': { w: 210, h: 297 },
    'a5': { w: 148, h: 210 },
    'a6': { w: 105, h: 148 },
    'a3': { w: 297, h: 420 },
    'dl': { w: 99, h: 210 },
    // Calendars — 3 dalių: 1 header + 1 footer + 3 parts × (12 months + 1 back) = 41
    '3 dalių': { w: 297, h: 420, pages: 41 },    // 3-part wall calendar
    '1 dalies': { w: 297, h: 420, pages: 15 },    // 1-part: 1 header + 1 footer + 1×(12+1 back)
    'pastatomas': { w: 148, h: 210, pages: 14 },  // Desk calendar (12 + header + footer)
    'stalinis': { w: 148, h: 210, pages: 14 },    // Desk calendar (alias)
};

// ─── Service ─────────────────────────────────────────────────────────────────

export const PricingService = {

    /**
     * Fetch available extras for a product (from rules with extra_name).
     */
    getAvailableExtras: async (productId?: string): Promise<{ name: string; rule_type: string; value: number }[]> => {
        const { data } = await (supabase as any)
            .from('calculation_rules')
            .select('extra_name, rule_type, value, product_id')
            .eq('is_active', true)
            .in('rule_type', [
                RULE_TYPES.EXTRA_COST_UNIT,
                RULE_TYPES.EXTRA_COST_FLAT,
                RULE_TYPES.LAMINATION_COST,
                RULE_TYPES.EXTRA_COST_100
            ]);

        if (!data) return [];

        // Filter: rules for this product OR global (null product_id)
        const filtered = data.filter((r: any) => !r.product_id || r.product_id === productId);

        // Deduplicate by extra_name, prefer product-specific
        const map = new Map<string, any>();
        for (const r of filtered) {
            const key = r.extra_name || r.rule_type;
            if (!map.has(key) || r.product_id) {
                map.set(key, { name: key, rule_type: r.rule_type, value: r.value });
            }
        }
        return Array.from(map.values());
    },

    /**
     * Main calculation engine.
     *
     * Pipeline:
     *   0. Check Product Pricing Matrix (Override)
     *      - If a specific price is defined for this Qty/Config in `product_pricing_matrices`, use it directly.
     *   1. Base Price (€ per 100 pcs) × qty/100
     *   2. + Extras (€ per unit) × qty
     *   3. = Subtotal
     *   4. Apply Qty Adjustment (± %)  → applies to entire total
     *   5. Apply Client Discount (%)
     *   6. = Final Total
     *
     * For sheet-based products (stickers, custom sizes):
     *   Calculates sheet layout, items per sheet, waste,
     *   and uses that as a secondary/fallback pricing model.
     */
    calculatePrice: async (request: PricingRequest): Promise<PricingResult> => {
        const {
            product_id,
            quantity,
            lamination,
            selected_extras = [],
            client_discount_koef,
            width,
            height,
            production_mode,
            pages: requestedPages,
            material_id,
            print_type
        } = request;

        const appliedRules: string[] = [];
        const qty100 = quantity / 100;

        // ── STEP 0: Matrix Pricing (Override) ────────────────────────────────
        // Check if there's a fixed price defined in the matrix for this configuration
        if (product_id) {
            const { data: matrixRows } = await (supabase as any)
                .from('product_pricing_matrices')
                .select('*')
                .eq('product_id', product_id);

            if (matrixRows && matrixRows.length > 0) {
                // Find a match
                const match = matrixRows.find((row: any) => {
                    // Qty check
                    const qtyOk = quantity >= row.quantity_from && (!row.quantity_to || quantity <= row.quantity_to);
                    if (!qtyOk) return false;

                    // Configuration check (if specified in matrix, must match request)
                    if (row.print_type && row.print_type !== print_type) return false;
                    if (row.lamination && row.lamination !== 'None' && row.lamination !== lamination) return false;
                    if (row.material_id && row.material_id !== material_id) return false;

                    return true;
                });

                if (match) {
                    const total = match.price;
                    const unitPrice = quantity > 0 ? total / quantity : 0;
                    appliedRules.push(`★ Matrix Price Rule: €${total.toFixed(2)} (Qty ${match.quantity_from}-${match.quantity_to || '+'})`);

                    return {
                        unit_price: unitPrice,
                        total_price: total,
                        applied_rules: appliedRules,
                        breakdown: {
                            base_price_per_100: 0,
                            base_total: total,
                            extras: [],
                            extras_total: 0,
                            subtotal: total,
                            qty_adjustment_percent: 0,
                            qty_adjustment_amount: 0,
                            client_discount_percent: 0,
                            client_discount_amount: 0,
                            total: total,
                            unit_price: unitPrice,
                            applied_rules: appliedRules
                        }
                    };
                }
            }
        }

        // ── Fetch rules (standard calculation) ───────────────────────────────
        const { data: allRules } = await (supabase as any)
            .from('calculation_rules')
            .select('*')
            .eq('is_active', true)
            .order('priority', { ascending: false });

        const rules = allRules || [];

        const matchesProduct = (rule: any) => !rule.product_id || rule.product_id === product_id;
        const matchesQty = (rule: any) => {
            const minOk = !rule.min_quantity || quantity >= rule.min_quantity;
            const maxOk = !rule.max_quantity || quantity <= rule.max_quantity;
            return minOk && maxOk;
        };

        // ── STEP 1: Sheet Calculation (if dimensions available) ──────────────
        let sheetCalc: SheetCalcDetails | undefined;
        let itemW = width || 0;
        let itemH = height || 0;
        let pages = requestedPages || 0;

        // Pick sheet based on production mode
        const sheet = production_mode === 'cut_only' ? CUT_SHEET : SRA3;

        // Auto-detect standard sizes and page counts from product name
        if ((!itemW || !itemH) && product_id) {
            const { data: prod } = await (supabase as any)
                .from('products').select('name').eq('id', product_id).single();
            if (prod?.name) {
                const nameLower = prod.name.toLowerCase();
                for (const [key, size] of Object.entries(STANDARD_SIZES)) {
                    if (nameLower.includes(key)) {
                        itemW = size.w;
                        itemH = size.h;
                        if (size.pages && !requestedPages) {
                            pages = size.pages;
                        }
                        appliedRules.push(`Auto-detect: ${key} (${itemW}×${itemH}mm${pages > 1 ? `, ${pages} pages` : ''})`);
                        break;
                    }
                }
            }
        }

        if (itemW > 0 && itemH > 0) {
            const layout = calculateSheetLayout(itemW, itemH, sheet);
            sheetCalc = computeSheets(layout, quantity, pages || 1);
            const pagesInfo = pages > 1 ? `, ${pages} pgs × ${quantity} = ${pages * quantity} prints` : '';
            appliedRules.push(
                `Sheet (${sheet.name}): ${sheetCalc.items_per_sheet}/sheet, ${sheetCalc.sheets_needed} sheets${pagesInfo} (${sheetCalc.waste_percent}% waste)`
            );
        }

        // ── STEP 2: Resolve Base Price (per 100) ─────────────────────────────
        let basePricePer100 = 0;

        const baseRule = rules.find((r: any) =>
            r.rule_type === RULE_TYPES.BASE_PRICE_100 && matchesProduct(r) && matchesQty(r)
        );

        if (baseRule) {
            basePricePer100 = baseRule.value;
            appliedRules.push(`Base: ${baseRule.name} — €${basePricePer100}/100 pcs`);
        } else {
            // Legacy fallback
            const legacyBase = rules.find((r: any) =>
                r.rule_type === RULE_TYPES.BASE_PRICE_UNIT && matchesProduct(r) && matchesQty(r)
            );
            if (legacyBase) {
                basePricePer100 = legacyBase.value * 100;
                appliedRules.push(`Base (legacy): ${legacyBase.name} — €${legacyBase.value}/unit → €${basePricePer100}/100`);
            } else {
                // Product default
                const { data: prod } = await (supabase as any)
                    .from('products').select('base_price').eq('id', product_id).single();
                if (prod?.base_price) {
                    basePricePer100 = prod.base_price;
                    appliedRules.push(`Base (product default): €${basePricePer100}/100`);
                }
            }
        }

        const baseTotal = basePricePer100 * qty100;

        // ── STEP 3: Add Extras (per unit) ────────────────────────────────────
        const extras: ExtraLine[] = [];

        // 3a. Lamination
        if (lamination && lamination !== 'None') {
            const lamRule = rules.find((r: any) =>
                (r.rule_type === RULE_TYPES.EXTRA_COST_UNIT ||
                    r.rule_type === RULE_TYPES.LAMINATION_COST ||
                    r.rule_type === RULE_TYPES.EXTRA_COST_100) &&
                matchesProduct(r) &&
                (r.extra_name === lamination || r.lamination === lamination)
            );
            if (lamRule) {
                let pricePerUnit = lamRule.value;
                // If legacy per-100 type, convert
                if (lamRule.rule_type === RULE_TYPES.EXTRA_COST_100) {
                    pricePerUnit = lamRule.value / 100;
                }
                const total = pricePerUnit * quantity;
                extras.push({ name: lamination, price_per_unit: pricePerUnit, total });
                appliedRules.push(`+ ${lamination}: €${pricePerUnit.toFixed(4)}/unit × ${quantity} = €${total.toFixed(2)}`);
            }
        }

        // 3b. Selected extras (foil, embossing, rounded corners, etc.)
        for (const extraName of selected_extras) {
            const extraRule = rules.find((r: any) =>
                (r.rule_type === RULE_TYPES.EXTRA_COST_UNIT ||
                    r.rule_type === RULE_TYPES.EXTRA_COST_FLAT ||
                    r.rule_type === RULE_TYPES.EXTRA_COST_100) &&
                matchesProduct(r) &&
                r.extra_name === extraName
            );
            if (extraRule) {
                if (extraRule.rule_type === RULE_TYPES.EXTRA_COST_FLAT) {
                    extras.push({ name: extraName, price_per_unit: 0, total: extraRule.value });
                    appliedRules.push(`+ ${extraName} (flat): €${extraRule.value}`);
                } else {
                    let pricePerUnit = extraRule.value;
                    if (extraRule.rule_type === RULE_TYPES.EXTRA_COST_100) {
                        pricePerUnit = extraRule.value / 100;
                    }
                    const total = pricePerUnit * quantity;
                    extras.push({ name: extraName, price_per_unit: pricePerUnit, total });
                    appliedRules.push(`+ ${extraName}: €${pricePerUnit.toFixed(4)}/unit × ${quantity} = €${total.toFixed(2)}`);
                }
            }
        }

        const extrasTotal = extras.reduce((sum, e) => sum + e.total, 0);
        const subtotal = baseTotal + extrasTotal;

        // ── STEP 4: Qty Adjustment (± %) ─────────────────────────────────────
        // Value is a percentage: +10 means 10% surcharge, -5 means 5% discount
        // Applied to the entire total (base + extras)
        let qtyAdjPercent = 0;

        const qtyRule = rules.find((r: any) =>
            r.rule_type === RULE_TYPES.QTY_ADJUSTMENT && matchesProduct(r) && matchesQty(r)
        );

        if (qtyRule) {
            qtyAdjPercent = qtyRule.value; // e.g. +10, -5, -10
            appliedRules.push(`Qty Adj: ${qtyAdjPercent > 0 ? '+' : ''}${qtyAdjPercent}% (${qtyRule.name})`);
        } else {
            // Legacy: 'Qty Multiplier' — value like 0.9 = -10%
            const legacyMult = rules.find((r: any) =>
                r.rule_type === RULE_TYPES.QTY_MULTIPLIER && matchesProduct(r) && matchesQty(r)
            );
            if (legacyMult) {
                qtyAdjPercent = (legacyMult.value - 1) * 100; // 0.9 → -10, 1.1 → +10
                appliedRules.push(`Qty Mult (legacy): ×${legacyMult.value} → ${qtyAdjPercent > 0 ? '+' : ''}${qtyAdjPercent.toFixed(1)}%`);
            }
        }

        const qtyAdjAmount = subtotal * (qtyAdjPercent / 100);
        const afterQtyAdj = subtotal + qtyAdjAmount; // + for surcharge, - for discount

        // ── STEP 5: Client Discount ──────────────────────────────────────────
        let clientDiscountPercent = 0;

        if (client_discount_koef && client_discount_koef < 1) {
            clientDiscountPercent = (1 - client_discount_koef) * 100;
        } else {
            const clientRule = rules.find((r: any) =>
                r.rule_type === RULE_TYPES.CLIENT_DISCOUNT && matchesProduct(r)
            );
            if (clientRule && clientRule.value < 1) {
                clientDiscountPercent = (1 - clientRule.value) * 100;
                appliedRules.push(`Client Discount: -${clientDiscountPercent.toFixed(1)}%`);
            }
        }

        const clientDiscountAmount = afterQtyAdj * (clientDiscountPercent / 100);
        const total = Math.max(0, afterQtyAdj - clientDiscountAmount);
        const unitPrice = quantity > 0 ? total / quantity : 0;

        // ── Build Breakdown ──────────────────────────────────────────────────
        const breakdown: PricingBreakdown = {
            base_price_per_100: basePricePer100,
            base_total: Number(baseTotal.toFixed(2)),
            extras,
            extras_total: Number(extrasTotal.toFixed(2)),
            subtotal: Number(subtotal.toFixed(2)),
            qty_adjustment_percent: qtyAdjPercent,
            qty_adjustment_amount: Number(qtyAdjAmount.toFixed(2)),
            client_discount_percent: clientDiscountPercent,
            client_discount_amount: Number(clientDiscountAmount.toFixed(2)),
            total: Number(total.toFixed(2)),
            unit_price: Number(unitPrice.toFixed(4)),
            sheet_calc: sheetCalc,
            applied_rules: appliedRules
        };

        return {
            unit_price: breakdown.unit_price,
            total_price: breakdown.total,
            applied_rules: appliedRules,
            breakdown
        };
    }
};
