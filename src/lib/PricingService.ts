import { supabase } from './supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PricingRequest {
    product_id: string;
    quantity: number;
    lamination?: string;        // 'None' | 'Matt' | 'Gloss' | 'SoftTouch'
    lamination_sides?: 1 | 2;   // 1 or 2 sides
    selected_extras?: string[]; // extra_name values, e.g. ['Foil', 'Rounded Corners']
    client_discount_koef?: number;
    production_mode?: 'printed' | 'cut_only'; // printed → SRA3, cut_only → 500×700mm
    pages?: number;             // For calendars/booklets — pages per unit
    // Sheet-based fields (for stickers, boxes, custom-size products)
    width?: number;  // mm
    height?: number; // mm
    length?: number; // mm — for boxes (W × H × L)
    material_id?: string;
    print_type?: string;
    // Booklet components
    cover_material_id?: string;
    cover_print_type?: string;
    inner_material_id?: string;
    inner_print_type?: string;
    inner_pages?: number;
    
    manual_unit_paint_price?: number;
    client_price_list_id?: string;
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
    waste_percent: number; // Total waste %
    layout_waste_percent: number; // Scrap (items not filling sheets)
    setup_waste_percent: number;  // Color proofing / Setup buffer (20%)
    pages?: number;        // Pages per unit (calendars/booklets)
    total_prints?: number; // pages × quantity
}

export interface PricingBreakdown {
    // Base
    base_price: number;
    is_per_unit: boolean;
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
    EXTRA_COST_SHEET: 'Extra Cost per Sheet',
    QTY_ADJUSTMENT: 'Qty Adjustment',    // +10% for 50 pcs, -5% for 200, -10% for 500, etc.
    CLIENT_DISCOUNT: 'Client Discount',
    QTY_DISCOUNT: 'Qty Discount',
    // Legacy (backward compatible)
    BASE_PRICE_UNIT: 'Base Price per unit',
    QTY_MULTIPLIER: 'Qty Multiplier',
    LAMINATION_COST: 'Lamination Cost',
    EXTRA_COST_100: 'Extra Cost per 100',
    // Roll specific
    ROLL_WIDTH: 'Roll Width',
    ROLL_SIDE_MARGIN: 'Roll Side Margin',
    ROLL_PADDING: 'Roll Padding/Bleed',
    ROLL_SPACING_PLEVELE: 'Roll Spacing Pleveles',
    ROLL_SPACING_PAPER: 'Roll Spacing Paper',
    ROLL_PAINT_PRICE_M2: 'Roll Paint Price/m2',
    ROLL_MARGIN: 'Roll Default Margin',
    // Sheet Sticker specific
    SHEET_STICKER_SPACING: 'Sheet Sticker Spacing',
    SHEET_STICKER_BLEED: 'Sheet Sticker Bleed',
    SHEET_PRINT_PRICE: 'Sheet Print Cost',
    SHEET_PRINT_OPERATION: 'Sheet Print Operation',
    SHEET_CUTTING_PRICE: 'Sheet Cutting Cost',
    SHEET_MARGIN: 'Sheet Default Margin',
    SHEET_SETUP_WASTE: 'Sheet Setup Waste',
} as const;

// ─── Sheet Calculator ────────────────────────────────────────────────────────

const SRA3 = { width: 320, height: 450, name: 'SRA3' };
const CUT_SHEET = { width: 500, height: 700, name: '500×700' }; // For unprinted/cut-only (e.g. boxes)

function calculateSheetLayout(
    itemW: number, itemH: number,
    sheet = SRA3,
    spacing = 0
): SheetCalcDetails {
    // Add spacing to item dimensions for yield calculation
    const effectiveW = itemW + spacing;
    const effectiveH = itemH + spacing;

    // Try both orientations and pick the best
    const layoutA = Math.floor(sheet.width / effectiveW) * Math.floor(sheet.height / effectiveH);
    const layoutB = Math.floor(sheet.width / effectiveH) * Math.floor(sheet.height / effectiveW);
    const itemsPerSheet = Math.max(layoutA, layoutB);

    return {
        item_width: itemW,
        item_height: itemH,
        sheet_width: sheet.width,
        sheet_height: sheet.height,
        sheet_name: sheet.name,
        items_per_sheet: itemsPerSheet,
        sheets_needed: 0,
        waste_percent: 0,
        layout_waste_percent: 0,
        setup_waste_percent: 0
    };
}

function computeSheets(layout: SheetCalcDetails, quantity: number, pages = 1, setupMultiplier = 1.2): SheetCalcDetails {
    const totalPrints = quantity * pages;
    const netSheets = layout.items_per_sheet > 0 ? Math.ceil(totalPrints / layout.items_per_sheet) : 0;
    // Dynamic waste factor for setup, alignment, color proofing
    const grossSheets = netSheets > 0 ? Math.ceil(netSheets * setupMultiplier) : 0;
    
    const totalCapacity = grossSheets * layout.items_per_sheet;
    const setupWasteItems = (grossSheets - netSheets) * layout.items_per_sheet;
    const layoutWasteItems = (netSheets * layout.items_per_sheet) - totalPrints;
    
    const setupWastePercent = totalCapacity > 0 ? (setupWasteItems / totalCapacity) * 100 : 0;
    const layoutWastePercent = totalCapacity > 0 ? (layoutWasteItems / totalCapacity) * 100 : 0;
    const totalWastePercent = totalCapacity > 0 ? ((setupWasteItems + layoutWasteItems) / totalCapacity) * 100 : 0;

    return {
        ...layout,
        sheets_needed: grossSheets,
        waste_percent: Number(totalWastePercent.toFixed(1)),
        setup_waste_percent: Number(setupWastePercent.toFixed(1)),
        layout_waste_percent: Number(layoutWastePercent.toFixed(1)),
        pages: pages > 1 ? pages : undefined,
        total_prints: pages > 1 ? totalPrints : undefined,
    };
}





function getFixedYieldForStandardSize(productName: string): number | null {
    const nameLower = productName.toLowerCase();
    
    // Check specific formats (both standard and "atvirukas" / "skrajutė" variants)
    if (nameLower.includes('a6')) return 8;
    if (nameLower.includes('a5')) return 4;
    if (nameLower.includes('a4')) return 2;
    if (nameLower.includes('a3')) return 1;
    
    // Business Cards (vizitinės) fit 21 on SRA3
    if (nameLower.includes('vizitin') || nameLower.includes('business card')) return 21;

    // Kortelė 100x70 — 12 per sheet (production constraint)
    if ((nameLower.includes('kortel') || nameLower.includes('card')) &&
        (nameLower.includes('100x70') || nameLower.includes('100 x 70'))) return 12;
    
    return null;
}

/**
 * Finds the tiered setup waste multiplier for a product and quantity.
 * Defaults to 20% (1.2) if no rule is found.
 */
function getSetupWasteMultiplier(rules: any[], productId: string | null, quantity: number): { multiplier: number; percentage: number } {
    const rule = rules.find(r => 
        r.rule_type === RULE_TYPES.SHEET_SETUP_WASTE &&
        (!r.product_id || r.product_id === productId) &&
        (!r.min_quantity || quantity >= r.min_quantity) &&
        (!r.max_quantity || quantity <= r.max_quantity)
    );

    if (rule) {
        return { 
            multiplier: 1 + (rule.value / 100), 
            percentage: rule.value 
        };
    }

    return { multiplier: 1.2, percentage: 20 };
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
        // Fetch product category first if productId is provided
        let productCategory: string | null = null;
        if (productId) {
            const { data: prod } = await (supabase as any)
                .from('products').select('category').eq('id', productId).maybeSingle();
            if (prod) productCategory = prod.category;
        }

        const { data } = await (supabase as any)
            .from('calculation_rules')
            .select('extra_name, rule_type, value, product_id, product_category')
            .eq('is_active', true)
            .in('rule_type', [
                RULE_TYPES.EXTRA_COST_UNIT,
                RULE_TYPES.EXTRA_COST_FLAT,
                RULE_TYPES.EXTRA_COST_SHEET,
                RULE_TYPES.LAMINATION_COST,
                RULE_TYPES.EXTRA_COST_100
            ]);

        if (!data) return [];

        // Filter: rules for this product OR category OR global (null product_id AND null product_category)
        const filtered = data.filter((r: any) => {
            // Match specific product
            if (r.product_id && r.product_id === productId) return true;
            if (r.product_ids && productId && r.product_ids.includes(productId)) return true;
            
            // Match category
            if (r.product_category && r.product_category === productCategory) return true;
            if (r.product_categories && productCategory && r.product_categories.includes(productCategory)) return true;
            
            // Global rule
            if (!r.product_id && !r.product_category && (!r.product_ids || r.product_ids.length === 0) && (!r.product_categories || r.product_categories.length === 0)) return true;
            
            return false;
        });

        // Deduplicate by extra_name, prefer specific product rules over category rules, and category over global
        const map = new Map<string, any>();
        for (const r of filtered) {
            const key = r.extra_name || r.rule_type;
            const existing = map.get(key);
            
            // Priority: Product ID > Product Category > Global
            const currentPriority = r.product_id ? 3 : (r.product_category ? 2 : 1);
            const existingPriority = existing ? (existing._productId ? 3 : (existing._category ? 2 : 1)) : 0;

            if (!existing || currentPriority > existingPriority) {
                map.set(key, { 
                    name: key, 
                    rule_type: r.rule_type, 
                    value: r.value,
                    _productId: r.product_id,
                    _category: r.product_category
                });
            }
        }
        return Array.from(map.values()).map(({ _productId, _category, ...rest }) => rest);
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
            lamination_sides,
            selected_extras = [],
            client_discount_koef,
            width,
            height,

            production_mode,
            pages: requestedPages,
            material_id,
            print_type,

            cover_material_id,
            cover_print_type,
            inner_material_id,
            inner_print_type,
            inner_pages,

            manual_unit_paint_price,
            client_price_list_id,
            length: itemLength // Renamed to avoid collision with array.length if any
        } = request;

        const appliedRules: string[] = [];
        const qty100 = quantity / 100;

        // ── STEP -1: Client Price List Override ──────────────────────────────
        let priceListOverrideBasePrice: number | null = null;
        if (client_price_list_id && product_id) {
            const { data: plItem } = await (supabase as any)
                .from('price_list_items')
                .select('custom_base_price')
                .eq('price_list_id', client_price_list_id)
                .eq('product_id', product_id)
                .maybeSingle();

            if (plItem) {
                priceListOverrideBasePrice = plItem.custom_base_price;
            }
        }

        // ── STEP 0: Matrix Pricing (Override) ────────────────────────────────
        // Check if there's a fixed price defined in the matrix for this configuration
        // Skip matrix pricing if client has a custom price list item
        if (product_id && priceListOverrideBasePrice === null) {
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
                            base_price: 0,
                            is_per_unit: false,
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
                            sheet_calc: undefined,
                            applied_rules: appliedRules
                        }
                    };
                }
            }
        }

        // ── Fetch rules (standard calculation) ───────────────────────────────
        // ── STEP 0: Fetch Product & Material Info ───────────────────────────
        let prodName = '';
        let prodCategory = '';
        let prodBase = 0;
        let isRollSticker = false;
        let isPaperSticker = false;
        let isSheetLipdukas = false;
        let isBox = false;
        let isSleeve = false;
        let isKarulis = false;
        let isBooklet = false;
        let materialPricePerSheet = 0;
        let coverMatPrice = 0;
        let innerMatPrice = 0;

        let itemW = width || 0;
        let itemH = height || 0;
        let pages = requestedPages || 0;

        let currentProduct: any = null;
        if (product_id) {
            const { data: prod } = await (supabase as any)
                .from('products').select('name, base_price, category, item_spacing').eq('id', product_id).maybeSingle();
            if (prod) {
                currentProduct = prod;
                prodName = prod.name;
                prodCategory = prod.category || '';
                prodBase = prod.base_price || 0;
                
                const nameLower = prodName.toLowerCase();
                const catLower = prodCategory.toLowerCase();
                isRollSticker = nameLower.includes('rulon') && nameLower.includes('lipdukas');
                isPaperSticker = nameLower.includes('popieriaus');
                isSheetLipdukas = nameLower.includes('lipdukas') && !isRollSticker;
                const isInsert = nameLower.includes('įdėkl') || nameLower.includes('idekl');
                isBox = (catLower.includes('dėžut') || nameLower.includes('dėžut')) && !isInsert;
                isSleeve = catLower.includes('mov') || nameLower.includes('mov') || nameLower.includes('įmaut') || nameLower.includes('imaut');
                isKarulis = catLower.includes('karul') || nameLower.includes('karul') || isInsert;

                // Auto-detect dimensions from name if missing
                if (!itemW || !itemH) {
                    for (const [key, size] of Object.entries(STANDARD_SIZES)) {
                        if (nameLower.includes(key)) {
                            itemW = size.w;
                            itemH = size.h;
                            if (size.pages && !pages) {
                                pages = size.pages;
                            }
                            appliedRules.push(`Auto-detect: ${key} (${itemW}×${itemH}mm${(pages || 0) > 1 ? `, ${pages} pages` : ''})`);
                            break;
                        }
                    }
                }

                (request as any)._cachedBasePrice = prodBase;
                (request as any)._cachedName = prodName;
                (request as any)._cachedCategory = prodCategory;
            }
        }

        const { data: allRules } = await (supabase as any)
            .from('calculation_rules')
            .select('*')
            .eq('is_active', true)
            .order('priority', { ascending: false })
            .order('min_quantity', { ascending: false, nullsFirst: false });

        const rules = allRules || [];

        const matchesProduct = (rule: any) => {
            // Product match
            if (rule.product_id && rule.product_id === product_id) return true;
            if (rule.product_ids && product_id && rule.product_ids.includes(product_id)) return true;
            
            // Category match
            if (rule.product_category && rule.product_category === prodCategory) return true;
            if (rule.product_categories && prodCategory && rule.product_categories.includes(prodCategory)) return true;
            
            // Global rule (only if no specific filters are set)
            const isGlobal = !rule.product_id && !rule.product_category && 
                             (!rule.product_ids || rule.product_ids.length === 0) && 
                             (!rule.product_categories || rule.product_categories.length === 0);
            return isGlobal;
        };

        const matchesQty = (rule: any) => {
            const minOk = !rule.min_quantity || quantity >= rule.min_quantity;
            const maxOk = !rule.max_quantity || quantity <= rule.max_quantity;
            return minOk && maxOk;
        };

        // ── STEP 1: Sheet Calculation (if dimensions available) ──────────────
        let sheetCalc: SheetCalcDetails | undefined;

        const { multiplier: setupMultiplier, percentage: setupPercent } = getSetupWasteMultiplier(rules, product_id, quantity);
        if (setupPercent !== 20) {
            appliedRules.push(`★ Setup Waste Rule: ${setupPercent}% multiplier`);
        }

        // Pick sheet based on production mode
        const sheet = production_mode === 'cut_only' ? CUT_SHEET : SRA3;

        // ── Box/Sleeve blank override: compute unfolded blank W×H from W×H×L
        if ((isBox || isSleeve) && itemW > 0 && itemH > 0 && itemLength && itemLength > 0) {
            const originalW = itemW;
            const originalH = itemH;
            const originalL = itemLength;

            if (isSleeve) {
                // Sleeve (Mova/Įmautė): Unfolded width = 2*(W+H) + gluing flap, Height = Length
                itemW = 2 * (originalW + originalH) + 20; // 20mm glue flap
                itemH = originalL;
                appliedRules.push(`BOM Sleeve Blank: 2×(${originalW}+${originalH})+20 = ${itemW}mm, Length=${itemH}mm`);
            } else if (isBox) {
                // Box (Dėžutė): Unfolded width = 2*(W+L) + gluing flap, Height = H + W (flaps)
                itemW = 2 * (originalW + originalL) + 30; // 30mm glue flap
                itemH = originalH + originalW;
                appliedRules.push(`BOM Box Blank: 2×(${originalW}+${originalL})+30 = ${itemW}mm, Height+Width=${itemH}mm`);
            }
        }

        if (!isRollSticker && !isSheetLipdukas && itemW > 0 && itemH > 0) {
            const spacing = currentProduct?.item_spacing || 0;
            let layout = calculateSheetLayout(itemW, itemH, sheet, spacing);
            if (spacing > 0) appliedRules.push(`Layout: Added ${spacing}mm gap between items.`);
            
            // Override yield for standard formats (A6=8, A5=4, A4=2) if requested
            const castedReq = request as any;
            if (castedReq._cachedName && sheet === SRA3) {
                const fixedYield = getFixedYieldForStandardSize(castedReq._cachedName);
                if (fixedYield !== null) {
                    layout.items_per_sheet = fixedYield;
                    appliedRules.push(`Pinning SRA3 yield to exactly ${fixedYield} items/sheet for standard format (${castedReq._cachedName})`);
                }
            }
            
            if (isBooklet && cover_material_id && inner_material_id) {
                // BOOKLET LOGIC: Separate Cover and Inner Sheets
                const coverLayout = { ...layout };
                const innerLayout = { ...layout };
                
                const coverCalc = computeSheets(coverLayout, quantity, 4, setupMultiplier);
                const innerCalc = computeSheets(innerLayout, quantity, inner_pages || 8, setupMultiplier);
                
                appliedRules.push(`Booklet Split: Cover (4 psl., ${coverCalc.sheets_needed} sheets) + Vidus (${inner_pages || 8} psl., ${innerCalc.sheets_needed} sheets)`);
                
                // Store combined details in sheetCalc for UI
                sheetCalc = {
                    ...innerCalc,
                    sheets_needed: coverCalc.sheets_needed + innerCalc.sheets_needed,
                    sheet_name: `Cover + Inner (${sheet.name})`
                };
            } else {
                sheetCalc = computeSheets(layout, quantity, pages || 1, setupMultiplier);
                const pagesInfo = (pages || 0) > 1 ? `, ${pages} pgs × ${quantity} = ${(pages || 0) * quantity} prints` : '';
                appliedRules.push(
                    `Sheet (${sheet.name}): ${sheetCalc.items_per_sheet}/sheet, ${sheetCalc.sheets_needed} sheets${pagesInfo} (${sheetCalc.waste_percent}% waste)`
                );
            }
        }

        // ── STEP 2: Resolve Base Price ─────────────────────────────────────
        let basePrice = 0;
        let isPerUnit = false;

        const getRuleVal = (type: string, fallback: number) => {
            // Get printing price - prioritize rules that match the specific print type (4+0, 4+4, etc)
            let rule = rules.find((r: any) => 
                r.rule_type === type && 
                r.print_type === print_type &&
                matchesProduct(r) && 
                matchesQty(r)
            );
            
            if (rule) {
                appliedRules.push(`Rule Found: ${type} for mode ${print_type} = €${rule.value}`);
            }

            // Fallback to general rule if no specific type match
            if (!rule) {
                rule = rules.find((r: any) => 
                    r.rule_type === type && 
                    !r.print_type &&
                    matchesProduct(r) && 
                    matchesQty(r)
                );
                if (rule) {
                    appliedRules.push(`Rule Found: ${type} (General/Fallback) = €${rule.value}`);
                }
            }

            if (!rule) {
                appliedRules.push(`Rule Not Found: ${type} (using fallback €${fallback})`);
            }

            return rule?.value ?? fallback;
        };

        if (isRollSticker && itemW > 0 && itemH > 0) {
            const rollWidth = getRuleVal(RULE_TYPES.ROLL_WIDTH, 125);
            const rollSideMargin = getRuleVal(RULE_TYPES.ROLL_SIDE_MARGIN, 10);
            const bleed = getRuleVal(RULE_TYPES.ROLL_PADDING, 2);
            const spacing = isPaperSticker 
                ? getRuleVal(RULE_TYPES.ROLL_SPACING_PAPER, 7)
                : getRuleVal(RULE_TYPES.ROLL_SPACING_PLEVELE, 4);
            const paintPricePerM2 = getRuleVal(RULE_TYPES.ROLL_PAINT_PRICE_M2, 8.00);
            const rollMarginMultiplier = getRuleVal(RULE_TYPES.ROLL_MARGIN, 1.5);

            // Calculate yield per meter
            const effectiveWidth = rollWidth - (2 * rollSideMargin);
            const wStep = itemW + bleed + spacing;
            const hStep = itemH + bleed + spacing;

            // Portrait orientation
            const colsPortrait = Math.floor((effectiveWidth + spacing) / wStep);
            const rowsPortrait = Math.floor((1000 + spacing) / hStep);
            const yieldPortrait = Math.max(0, colsPortrait * rowsPortrait);

            // Landscape orientation
            const colsLandscape = Math.floor((effectiveWidth + spacing) / hStep);
            const rowsLandscape = Math.floor((1000 + spacing) / wStep);
            const yieldLandscape = Math.max(0, colsLandscape * rowsLandscape);
            
            const bestYield = Math.max(yieldPortrait, yieldLandscape, 1);
            const usedOrientation = yieldLandscape > yieldPortrait ? 'Landscape' : 'Portrait';

            // Get Material Price (per meter of roll)
            let materialPricePerM = 0;
            if (material_id) {
                const { data: mat } = await (supabase as any)
                    .from('materials').select('unit_price').eq('id', material_id).single();
                if (mat) materialPricePerM = mat.unit_price || 0;
            }

            // Calculate Paint Cost (per square meter of sticker)
            const itemAreaM2 = (itemW * itemH) / 1000000;
            let paintCostPerSticker = itemAreaM2 * paintPricePerM2;
            
            if (manual_unit_paint_price !== undefined && manual_unit_paint_price !== null) {
                paintCostPerSticker = manual_unit_paint_price;
            }

            const materialCostPerSticker = materialPricePerM / bestYield;

            // Cost per sticker
            const costPerSticker = materialCostPerSticker + paintCostPerSticker;
            const pricePerSticker = costPerSticker * rollMarginMultiplier;

            appliedRules.push(`Roll Setup: ${effectiveWidth}mm usable width, Spacing ${spacing}mm`);
            appliedRules.push(`Roll Yield: ${bestYield} qty/m (${usedOrientation})`);
            appliedRules.push(`Roll Cost/stk: Mat €${materialCostPerSticker.toFixed(4)} + Paint €${paintCostPerSticker.toFixed(4)}${manual_unit_paint_price !== undefined ? ' (Manual Override)' : ` (Rate: €${paintPricePerM2}/m²)`}`);
            appliedRules.push(`Roll Unit Price: €${costPerSticker.toFixed(4)} × Margin ${rollMarginMultiplier} = €${pricePerSticker.toFixed(4)}`);
            
            basePrice = pricePerSticker;
            isPerUnit = true;
            
            const netMeters = quantity / bestYield;
            const grossMeters = netMeters * setupMultiplier;
            const setupWasteMeters = grossMeters - netMeters;
            const totalItemsRaw = grossMeters * bestYield;
            const setupWPercent = totalItemsRaw > 0 ? (setupWasteMeters * bestYield / totalItemsRaw) * 100 : 0;

            sheetCalc = {
                item_width: itemW,
                item_height: itemH,
                sheet_width: rollWidth,
                sheet_height: 1000,
                sheet_name: `Roll 1m (${usedOrientation})`,
                items_per_sheet: bestYield,
                sheets_needed: Number(grossMeters.toFixed(2)),
                waste_percent: Number(setupWPercent.toFixed(1)),
                setup_waste_percent: Number(setupWPercent.toFixed(1)),
                layout_waste_percent: 0
            };
        } else if (isRollSticker) {
            if (manual_unit_paint_price !== undefined && manual_unit_paint_price !== null) {
                const rollMarginMultiplier = getRuleVal(RULE_TYPES.ROLL_MARGIN, 1.5);
                basePrice = manual_unit_paint_price * rollMarginMultiplier;
                isPerUnit = true;
                appliedRules.push(`Roll Paint Price (Manual): €${manual_unit_paint_price.toFixed(4)}/unit × Margin ${rollMarginMultiplier} = €${basePrice.toFixed(4)}`);
                if (itemW <= 0 || itemH <= 0) {
                    appliedRules.push(`Note: Enter dimensions to include material cost.`);
                }
            } else {
                appliedRules.push(`⚠️ Please enter Width and Height to calculate roll yield and price.`);
            }
        } else if (isSheetLipdukas && itemW > 0 && itemH > 0) {
            const sheetW = 295;
            const sheetH = 400;
            const spacing = getRuleVal(RULE_TYPES.SHEET_STICKER_SPACING, 2);
            const bleed = getRuleVal(RULE_TYPES.SHEET_STICKER_BLEED, 1);
            const sheetPrintCost = getRuleVal(RULE_TYPES.SHEET_PRINT_PRICE, 0.05);
            const sheetMarginMultiplier = getRuleVal(RULE_TYPES.SHEET_MARGIN, 1.5);

            // Total addition is 3mm by default (2mm spacing + 1mm bleed total)
            const wStep = itemW + bleed + spacing;
            const hStep = itemH + bleed + spacing;

            const colsP = Math.floor(sheetW / wStep);
            const rowsP = Math.floor(sheetH / hStep);
            const yieldP = Math.max(0, colsP * rowsP);

            const colsL = Math.floor(sheetW / hStep);
            const rowsL = Math.floor(sheetH / wStep);
            const yieldL = Math.max(0, colsL * rowsL);

            const bestYield = Math.max(yieldP, yieldL, 1);
            const usedOrientation = yieldL > yieldP ? 'Landscape' : 'Portrait';

            let materialPricePerSheet = 0;
            if (material_id) {
                const { data: mat } = await (supabase as any)
                    .from('materials').select('unit_price').eq('id', material_id).single();
                if (mat) materialPricePerSheet = mat.unit_price || 0;
            }

            const totalSheetCost = materialPricePerSheet + sheetPrintCost;
            const costPerSticker = totalSheetCost / bestYield;
            const pricePerSticker = costPerSticker * sheetMarginMultiplier;

            const totalPrints = quantity * (pages || 1);
            const netSheets = Math.ceil(totalPrints / bestYield);
            const grossSheets = Math.ceil(netSheets * setupMultiplier);
            
            const totalCapacityArr = grossSheets * bestYield;
            const setupWasteItemsArr = (grossSheets - netSheets) * bestYield;
            const layoutWasteItemsArr = (netSheets * bestYield) - totalPrints;
            const setupWastePercent = totalCapacityArr > 0 ? (setupWasteItemsArr / totalCapacityArr) * 100 : 0;
            const layoutWastePercent = totalCapacityArr > 0 ? (layoutWasteItemsArr / totalCapacityArr) * 100 : 0;
            const totalWastePercent = totalCapacityArr > 0 ? ((setupWasteItemsArr + layoutWasteItemsArr) / totalCapacityArr) * 100 : 0;

            appliedRules.push(`Sheet Setup: ${sheetW}×${sheetH}mm usable area, Spacing ${spacing}mm, Bleed ${bleed}mm`);
            appliedRules.push(`Sheet Yield: ${bestYield} qty/sheet (${usedOrientation}) -> Need ~${grossSheets} sheets (incl ${setupPercent}% waste)`);
            appliedRules.push(`Sheet Cost: Mat €${materialPricePerSheet.toFixed(4)} + Print €${sheetPrintCost.toFixed(4)} = €${totalSheetCost.toFixed(4)}`);
            appliedRules.push(`Sheet Unit Price: (Cost/Sheet ÷ Yield) × Margin = €${costPerSticker.toFixed(4)} × ${sheetMarginMultiplier} = €${pricePerSticker.toFixed(4)}`);

            basePrice = pricePerSticker;
            isPerUnit = true;
            
            sheetCalc = {
                item_width: itemW,
                item_height: itemH,
                sheet_width: sheetW,
                sheet_height: sheetH,
                sheet_name: `Sheet (${usedOrientation})`,
                items_per_sheet: bestYield,
                sheets_needed: grossSheets,
                waste_percent: Number(totalWastePercent.toFixed(1)),
                setup_waste_percent: Number(setupWastePercent.toFixed(1)),
                layout_waste_percent: Number(layoutWastePercent.toFixed(1))
            };
        } else if (isSheetLipdukas) {
            appliedRules.push(`⚠️ Please enter Width and Height to calculate sheet yield and price.`);
        } else if ((isBox || isSleeve || isKarulis || isBooklet) && itemW > 0 && itemH > 0) {
            // Sheet-based BOM pricing (Boxes, Sleeves, Karuliai, Booklets)
            const isDoubleSided = print_type === '4+4' || print_type === '1+1';
            const printMultiplier = isDoubleSided ? 2 : 1;

            const isCutOnly = production_mode === 'cut_only';
            const basePrintCost = isCutOnly ? 0 : getRuleVal(RULE_TYPES.SHEET_PRINT_PRICE, 0.10);
            const baseOpCost = isCutOnly ? 0 : getRuleVal(RULE_TYPES.SHEET_PRINT_OPERATION, 0.05);
            
            const sheetPrintCost = basePrintCost * printMultiplier;
            const sheetOperationCost = baseOpCost * printMultiplier;
            const sheetCuttingCost = getRuleVal(RULE_TYPES.SHEET_CUTTING_PRICE, 0.05);
            const sheetMarginMultiplier = getRuleVal(RULE_TYPES.SHEET_MARGIN, 1.5);
            
            appliedRules.push(`BOM Model: ${isBooklet ? 'Bukletas' : (isKarulis ? 'Karuliai' : 'Packaging')} logic (${isCutOnly ? 'Cut Only' : (print_type || '4+0')})`);
            
            coverMatPrice = 0;
            innerMatPrice = 0;

            if (isBooklet && cover_material_id && inner_material_id) {
                const { data: mats } = await (supabase as any)
                    .from('materials').select('id, unit_price').in('id', [cover_material_id, inner_material_id]);
                
                coverMatPrice = mats?.find((m: any) => m.id === cover_material_id)?.unit_price || 0;
                innerMatPrice = mats?.find((m: any) => m.id === inner_material_id)?.unit_price || 0;
                appliedRules.push(`Booklet Materials: Cover €${coverMatPrice.toFixed(4)}/sheet, Inner €${innerMatPrice.toFixed(4)}/sheet`);
            } else if (material_id) {
                const { data: mat } = await (supabase as any)
                    .from('materials').select('unit_price, name').eq('id', material_id).single();
                if (mat) {
                    materialPricePerSheet = mat.unit_price || 0;
                    appliedRules.push(`Material: ${mat.name} (€${materialPricePerSheet.toFixed(4)}/sheet)`);
                }
            }

            // Body blank layout (respecting item spacing)
            const spacing = currentProduct?.item_spacing || 0;
            const effW = itemW + spacing;
            const effH = itemH + spacing;
            
            const bodyLayoutA = Math.floor(sheet.width / effW) * Math.floor(sheet.height / effH);
            const bodyLayoutB = Math.floor(sheet.width / effH) * Math.floor(sheet.height / effW);
            const bodyYield = Math.max(bodyLayoutA, bodyLayoutB);
            
            if (spacing > 0) appliedRules.push(`Layout: Added ${spacing}mm gap between blanks.`);

            let totalCostPerBox = 0;
            let bodyGrossSheets = bodyYield > 0 ? Math.ceil(Math.ceil(quantity / bodyYield) * setupMultiplier) : 0;

            if (isBooklet && cover_material_id && inner_material_id) {
                // 1. Cover Cost
                const coverIsDouble = cover_print_type === '4+4' || cover_print_type === '1+1';
                const coverPrintMult = coverIsDouble ? 2 : 1;
                const coverTotalSheetCost = coverMatPrice + (basePrintCost * coverPrintMult) + (baseOpCost * coverPrintMult) + sheetCuttingCost;
                
                // 2. Inner Cost
                const innerIsDouble = inner_print_type === '4+4' || inner_print_type === '1+1';
                const innerPrintMult = innerIsDouble ? 2 : 1;
                const innerTotalSheetCost = innerMatPrice + (basePrintCost * innerPrintMult) + (baseOpCost * innerPrintMult) + sheetCuttingCost;

                // 3. Combined
                const coverSheets = bodyYield > 0 ? Math.ceil(Math.ceil((quantity * 4) / bodyYield) * setupMultiplier) : 0;
                const innerSheets = bodyYield > 0 ? Math.ceil(Math.ceil((quantity * (inner_pages || 8)) / bodyYield) * setupMultiplier) : 0;
                
                const totalCost = (coverTotalSheetCost * coverSheets) + (innerTotalSheetCost * innerSheets);
                totalCostPerBox = quantity > 0 ? totalCost / quantity : 0;

                appliedRules.push(`Booklet Cost Breakdown:`);
                appliedRules.push(`- Cover: €${coverTotalSheetCost.toFixed(4)}/sheet × ${coverSheets} sheets = €${(coverTotalSheetCost * coverSheets).toFixed(2)}`);
                appliedRules.push(`- Vidus: €${innerTotalSheetCost.toFixed(4)}/sheet × ${innerSheets} sheets = €${(innerTotalSheetCost * innerSheets).toFixed(2)}`);
                
                bodyGrossSheets = coverSheets + innerSheets;
            } else {
                const totalSheetCost = materialPricePerSheet + sheetPrintCost + sheetOperationCost + sheetCuttingCost;
                totalCostPerBox = quantity > 0 ? (totalSheetCost * bodyGrossSheets) / quantity : 0;
                appliedRules.push(`BOM Model Calculation: €${totalSheetCost.toFixed(4)}/sheet × ${bodyGrossSheets} sheets = €${(totalSheetCost * bodyGrossSheets).toFixed(2)} total cost`);
            }

            const pricePerUnit = totalCostPerBox * sheetMarginMultiplier;
            const itemLabel = isBooklet ? 'Bukletas' : (isKarulis ? 'Karulis' : 'Pakuotė');
            appliedRules.push(`Final ${itemLabel} Base: €${totalCostPerBox.toFixed(4)} (cost) × Margin ${sheetMarginMultiplier} = €${pricePerUnit.toFixed(4)}/unit`);

            basePrice = pricePerUnit;
            isPerUnit = true;

            // Update sheetCalc for booklets (combined view)
            if (isBooklet) {
                sheetCalc = {
                    item_width: itemW,
                    item_height: itemH,
                    sheet_width: sheet.width,
                    sheet_height: sheet.height,
                    sheet_name: `Cover + Inner (${sheet.name})`,
                    items_per_sheet: bodyYield,
                    sheets_needed: bodyGrossSheets,
                    waste_percent: Number(setupPercent.toFixed(1)),
                    setup_waste_percent: Number(setupPercent.toFixed(1)),
                    layout_waste_percent: 0
                };
            } else {
                sheetCalc = {
                    item_width: itemW,
                    item_height: itemH,
                    sheet_width: sheet.width,
                    sheet_height: sheet.height,
                    sheet_name: sheet.name,
                    items_per_sheet: bodyYield,
                    sheets_needed: bodyGrossSheets,
                    waste_percent: Number(setupPercent.toFixed(1)),
                    setup_waste_percent: Number(setupPercent.toFixed(1)),
                    layout_waste_percent: 0
                };
            }
        } else if (isBox) {
            appliedRules.push(`⚠️ Please enter Width, Height and Length to calculate box price.`);
        }

        if (basePrice === 0) {
            // Try 'Base Price per unit' first (higher priority for services)
            const unitBaseRule = rules.find((r: any) =>
                r.rule_type === RULE_TYPES.BASE_PRICE_UNIT && matchesProduct(r) && matchesQty(r)
            );

            if (unitBaseRule) {
                basePrice = unitBaseRule.value;
                isPerUnit = true;
                appliedRules.push(`Base (unit): ${unitBaseRule.name} — €${basePrice}/unit`);
            } else {
                // Try 'Base Price per 100'
                const baseRule = rules.find((r: any) =>
                    r.rule_type === RULE_TYPES.BASE_PRICE_100 && matchesProduct(r) && matchesQty(r)
                );

                if (baseRule) {
                    basePrice = baseRule.value;
                    appliedRules.push(`Base: ${baseRule.name} — €${basePrice}/100 pcs`);
                } else {
                    // Product default (fallback to per-100 logic for generic products, but per-unit for services)
                    const prodName = (request as any)._cachedName || '';
                    const prodBase = (request as any)._cachedBasePrice || 0;
                    const prodCategory = (request as any)._cachedCategory || '';
                    
                    if (prodBase) {
                        basePrice = prodBase;
                        isPerUnit = true; // Default to per-unit for product table base prices
                        
                        const isService = prodCategory?.toLowerCase() === 'paslaugos' ||
                            prodCategory?.toLowerCase() === 'siuntimas' ||
                            prodName.toLowerCase().includes('dizain') ||
                            prodName.toLowerCase().includes('kurjer') ||
                            prodName.toLowerCase().includes('siuntim') ||
                            prodName.toLowerCase().includes('maket') ||
                            prodName.toLowerCase().includes('kliš') ||
                            prodName.toLowerCase().includes('klis');
                        
                        appliedRules.push(`Base (product default${isService ? ', service' : ''}): €${basePrice}/vnt`);
                    }
                }
            }
        }

        if (priceListOverrideBasePrice !== null) {
            basePrice = priceListOverrideBasePrice;
            isPerUnit = true; // Custom prices are always per unit
            appliedRules.push(`💎 Client Price List Override: €${basePrice.toFixed(2)}/vnt`);
        }

        let baseTotal = isPerUnit ? (basePrice * quantity) : (basePrice * qty100);
        let skipLamination = false;

        const prodNameLower = ((request as any)._cachedName || '').toLowerCase();

        // ── Dimensions to Yield Fallback ────────────────────────────────────
        if (!sheetCalc && !prodNameLower.includes('siuntim') && !prodNameLower.includes('dizain')) {
            let effectiveW = itemW;
            let effectiveH = itemH;

            // If dimensions missing, try to extract from name (e.g. "90x50", "140x140", "A4")
            if (effectiveW <= 0 || effectiveH <= 0) {
                const dimMatch = prodNameLower.match(/(\d+)\s*[x×*]\s*(\d+)/i);
                if (dimMatch) {
                    effectiveW = parseInt(dimMatch[1]);
                    effectiveH = parseInt(dimMatch[2]);
                } else if (prodNameLower.includes('a4')) {
                    effectiveW = 210; effectiveH = 297;
                } else if (prodNameLower.includes('a5')) {
                    effectiveW = 148; effectiveH = 210;
                } else if (prodNameLower.includes('vizit')) {
                    effectiveW = 90; effectiveH = 50;
                }
            }

            if (effectiveW > 0 && effectiveH > 0) {
                const spacing = currentProduct?.item_spacing || 0;
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

        // --- Custom Business Card Interceptor ---
        if (prodNameLower.includes('vizitin') || prodNameLower.includes('business card')) {
            const isOneSided = print_type === '4+0' || print_type === '1+0';

            if (isOneSided) {
                basePrice = 5;
                isPerUnit = false;
                baseTotal = basePrice * qty100;
                appliedRules.push(`Special Pricing: One-Sided Vizitinės - €5.00 / 100 pcs`);
            }
        }

        // ── STEP 3: Add Extras (per unit) ────────────────────────────────────
        const extras: ExtraLine[] = [];

        // 3a. Lamination
        const printTypeLower = (print_type || '').toLowerCase();
        const isDoubleSided = printTypeLower === '4+4' || printTypeLower === '1+1';
        const extraMultiplier = isDoubleSided ? 2 : 1;

        if (!skipLamination && lamination && lamination !== 'None') {
            const lamRule = rules.find((r: any) =>
                (r.rule_type === RULE_TYPES.EXTRA_COST_UNIT ||
                    r.rule_type === RULE_TYPES.LAMINATION_COST ||
                    r.rule_type === RULE_TYPES.EXTRA_COST_100 ||
                    r.rule_type === RULE_TYPES.EXTRA_COST_FLAT ||
                    r.rule_type === RULE_TYPES.EXTRA_COST_SHEET) &&
                matchesProduct(r) &&
                (r.extra_name === lamination || r.lamination === lamination)
            );
            if (lamRule) {
                const lamNameLower = lamination.toLowerCase();
                const isDoubleSidedLam = lamination_sides === 2 || lamNameLower.includes('dvipus') || lamNameLower.includes('2-pus');
                const lamMultiplier = isDoubleSidedLam ? extraMultiplier : 1;
                
                let pricePerUnit = 0;
                let total = 0;
                const multipliedValue = lamRule.value * lamMultiplier;

                if (lamRule.rule_type === RULE_TYPES.EXTRA_COST_FLAT) {
                    total = multipliedValue;
                    pricePerUnit = quantity > 0 ? total / quantity : 0;
                } else if (lamRule.rule_type === RULE_TYPES.EXTRA_COST_SHEET) {
                    const itemsPerSheet = sheetCalc?.items_per_sheet || 1;
                    const sheetsNeeded = Math.ceil(quantity / itemsPerSheet);
                    total = sheetsNeeded * multipliedValue;
                    pricePerUnit = quantity > 0 ? total / quantity : 0;
                } else if (lamRule.rule_type === RULE_TYPES.EXTRA_COST_100) {
                    pricePerUnit = multipliedValue / 100;
                    total = pricePerUnit * quantity;
                } else {
                    pricePerUnit = multipliedValue;
                    total = pricePerUnit * quantity;
                }

                extras.push({ name: lamination, price_per_unit: pricePerUnit, total });
                appliedRules.push(`+ ${lamination}${lamMultiplier > 1 ? ' (x2 sides)' : ''}: €${pricePerUnit.toFixed(4)}/unit × ${quantity} = €${total.toFixed(2)}`);
            } else {
                appliedRules.push(`⚠️ Lamination rule not found for: "${lamination}"`);
            }
        }

        // 3b. Selected extras (foil, embossing, rounded corners, etc.)
        for (const extraName of selected_extras) {
            // Special Case: Spiral Binding for Booklets
            const extraNameLower = extraName.toLowerCase();
            if (isBooklet && (extraNameLower.includes('spiral') || extraNameLower.includes('rišim'))) {
                const workPrice = 0.50;
                const matPrice = 0.30;
                const totalUnit = workPrice + matPrice;
                const total = totalUnit * quantity;
                
                extras.push({ name: `${extraName} (Rišimas €0.5 + Spiralė €0.3)`, price_per_unit: totalUnit, total });
                appliedRules.push(`+ ${extraName}: Rišimas €0.50 + Spiralė €0.30 = €${totalUnit.toFixed(2)}/unit × ${quantity} = €${total.toFixed(2)}`);
                continue; // Skip standard rule search for this one as we handled it specially
            }

            const extraRule = rules.find((r: any) =>
                (r.rule_type === RULE_TYPES.EXTRA_COST_UNIT ||
                    r.rule_type === RULE_TYPES.EXTRA_COST_FLAT ||
                    r.rule_type === RULE_TYPES.EXTRA_COST_SHEET ||
                    r.rule_type === RULE_TYPES.EXTRA_COST_100) &&
                matchesProduct(r) &&
                r.extra_name === extraName
            );
            if (extraRule) {
                const value = extraRule.value;
                if (extraRule.rule_type === RULE_TYPES.EXTRA_COST_FLAT) {
                    const pricePerUnit = quantity > 0 ? value / quantity : 0;
                    extras.push({ name: extraName, price_per_unit: pricePerUnit, total: value });
                    appliedRules.push(`+ ${extraName} (flat): €${value.toFixed(2)} (~€${pricePerUnit.toFixed(4)}/unit)`);
                } else if (extraRule.rule_type === RULE_TYPES.EXTRA_COST_SHEET) {
                    // Divide extra value by items_per_sheet (defaulting to 1 if no sheet calc available)
                    const itemsPerSheet = sheetCalc?.items_per_sheet || 1;
                    const pricePerUnit = value / itemsPerSheet;
                    const total = pricePerUnit * quantity;
                    extras.push({ name: extraName, price_per_unit: pricePerUnit, total });
                    appliedRules.push(`+ ${extraName} (per sheet): €${value.toFixed(2)}/sheet (${itemsPerSheet} items/sheet) = €${pricePerUnit.toFixed(4)}/unit × ${quantity} = €${total.toFixed(2)}`);
                } else {
                    let pricePerUnit = value;
                    if (extraRule.rule_type === RULE_TYPES.EXTRA_COST_100) {
                        pricePerUnit = value / 100;
                    }
                    const total = pricePerUnit * quantity;
                    extras.push({ name: extraName, price_per_unit: pricePerUnit, total });
                    appliedRules.push(`+ ${extraName}: €${pricePerUnit.toFixed(4)}/unit × ${quantity} = €${total.toFixed(2)}`);
                }
            }
        }

        const extrasTotal = extras.reduce((sum, e) => sum + e.total, 0);

        // --- STEP 3c: Separate Flat Extras from Per-Unit Extras for Qty Adjustment ---
        // Qty adjustment should only apply to base price and per-unit extras.
        // Fixed costs like Design or Shipping (Flat Fees) should NOT be discounted/surcharged by volume.
        const perUnitExtrasTotal = extras
            .filter(item => item.price_per_unit > 0)
            .reduce((sum, item) => sum + item.total, 0);



        const subtotal = baseTotal + extrasTotal;
        const adjustableSubtotal = baseTotal + perUnitExtrasTotal;

        // ── STEP 4: Qty Adjustment (± %) ─────────────────────────────────────
        // Value is a percentage: +10 means 10% surcharge, -5 means 5% discount
        // Applied to the adjustable subtotal (base + per-unit extras)
        let qtyAdjPercent = 0;

        const qtyRule = rules.find((r: any) =>
            (r.rule_type === RULE_TYPES.QTY_ADJUSTMENT || r.rule_type === RULE_TYPES.QTY_DISCOUNT) && 
            matchesProduct(r) && matchesQty(r)
        );

        if (qtyRule) {
            if (qtyRule.rule_type === RULE_TYPES.QTY_DISCOUNT) {
                // For Qty Discount, value 10 means -10%
                qtyAdjPercent = -Math.abs(qtyRule.value);
            } else {
                qtyAdjPercent = qtyRule.value; // e.g. +10, -5, -10
            }
            appliedRules.push(`Qty ${qtyRule.rule_type === RULE_TYPES.QTY_DISCOUNT ? 'Discount' : 'Adj'}: ${qtyAdjPercent > 0 ? '+' : ''}${qtyAdjPercent}% (${qtyRule.name}) - Appled to base & per-unit extras`);
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

        const qtyAdjAmount = adjustableSubtotal * (qtyAdjPercent / 100);
        const afterQtyAdj = subtotal + qtyAdjAmount; // subtotal includes flat extras, but qtyAdjAmount only calculated from adjustable

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
            base_price: basePrice,
            is_per_unit: isPerUnit,
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
