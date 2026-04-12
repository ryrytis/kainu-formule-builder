import React, { useState, useEffect } from 'react';
import { PricingService, PricingBreakdown } from '../lib/PricingService';
import { supabase } from '../lib/supabase';
import { Loader2, Calculator as CalculatorIcon, RefreshCw, Plus, ChevronDown, ChevronRight, Layers } from 'lucide-react';
import CreateOrderModal from '../components/CreateOrderModal';
import { useAuth } from '../contexts/AuthContext';

const Calculator: React.FC = () => {
    const [products, setProducts] = useState<any[]>([]);
    const [materials, setMaterials] = useState<any[]>([]);
    const [popularProducts, setPopularProducts] = useState<string[]>([]);
    const [availableExtras, setAvailableExtras] = useState<{ name: string; rule_type: string; value: number }[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Form State
    const [productId, setProductId] = useState('');
    const [materialId, setMaterialId] = useState('');
    const [quantity, setQuantity] = useState<number>(100);
    const [width, setWidth] = useState('');
    const [height, setHeight] = useState('');
    const [length, setLength] = useState('');
    const [printType, setPrintType] = useState('4+4');
    const [lamination, setLamination] = useState('None');
    const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
    const [productionMode, setProductionMode] = useState<'printed' | 'cut_only'>('printed');
    const [pages, setPages] = useState<number>(0); // 0 = auto-detect, >0 = manual
    const [manualPaintPrice, setManualPaintPrice] = useState<string>('');
    const [isService, setIsService] = useState(false);

    // Pricing State
    const [breakdown, setBreakdown] = useState<PricingBreakdown | null>(null);
    const [totalPrice, setTotalPrice] = useState(0);
    const [unitPrice, setUnitPrice] = useState(0);
    const [appliedRules, setAppliedRules] = useState<string[]>([]);
    const [isCalculating, setIsCalculating] = useState(false);
    const [showDetails, setShowDetails] = useState(true);
    const [showSheetInfo, setShowSheetInfo] = useState(false);
    
    const { profile } = useAuth();
    const isAdmin = profile?.role === 'admin';

    useEffect(() => {
        fetchProducts();
        fetchMaterials();
        fetchPopularProducts();
    }, []);

    // Load available extras when product changes
    useEffect(() => {
        const loadExtras = async () => {
            const extras = await PricingService.getAvailableExtras(productId || undefined);
            setAvailableExtras(extras);
            setSelectedExtras(prev => prev.filter(e => extras.some(x => x.name === e)));
        };
        loadExtras();
    }, [productId]);

    // Auto-calculate
    useEffect(() => {
        const calculate = async () => {
            if (!productId) {
                setBreakdown(null);
                setUnitPrice(0);
                setTotalPrice(0);
                setAppliedRules([]);
                return;
            }

            setIsCalculating(true);
            try {
                const result = await PricingService.calculatePrice({
                    product_id: productId,
                    quantity,
                    material_id: materialId || undefined,
                    lamination,
                    selected_extras: selectedExtras,
                    production_mode: productionMode,
                    pages: pages || undefined,
                    width: width ? parseFloat(width) : undefined,
                    height: height ? parseFloat(height) : undefined,
                    length: length ? parseFloat(length) : undefined,
                    print_type: printType,
                    manual_unit_paint_price: manualPaintPrice ? parseFloat(manualPaintPrice) : undefined
                });

                setUnitPrice(result.unit_price);
                setTotalPrice(result.total_price);
                setAppliedRules(result.applied_rules);
                setBreakdown(result.breakdown || null);
            } catch (err) {
                console.error("Calculation failed", err);
            } finally {
                setIsCalculating(false);
            }
        };

        const debounce = setTimeout(calculate, 400);
        return () => clearTimeout(debounce);
    }, [productId, quantity, materialId, width, height, printType, lamination, selectedExtras, productionMode, pages, manualPaintPrice]);

    const fetchProducts = async () => {
        const { data } = await (supabase as any).from('products').select('*').order('name');
        if (data) setProducts(data);
    };

    const fetchMaterials = async () => {
        const { data } = await supabase.from('materials').select('*').order('name');
        if (data) setMaterials(data);
    };

    const fetchPopularProducts = async () => {
        const { data } = await supabase.from('order_items').select('product_type').order('created_at', { ascending: false }).limit(300);
        if (data) {
            const counts = data.reduce((acc: any, curr: any) => {
                const pName = curr.product_type;
                if (!pName) return acc;
                acc[pName] = (acc[pName] || 0) + 1;
                return acc;
            }, {});
            const sortedNames = Object.entries(counts)
                .map(entry => entry[0] as string)
                .filter(name => {
                    const l = name.toLowerCase();
                    return !l.includes('maketavim') && 
                           !l.includes('siuntim') && 
                           !l.includes('paštomat') && 
                           !l.includes('kliš') &&
                           !l.includes('dizain') &&
                           !l.includes('pristatym');
                })
                .sort((a, b) => counts[b] - counts[a])
                .slice(0, 6);
            setPopularProducts(sortedNames);
        }
    };

    const toggleExtra = (extraName: string) => {
        setSelectedExtras(prev =>
            prev.includes(extraName)
                ? prev.filter(e => e !== extraName)
                : [...prev, extraName]
        );
    };

    const handleReset = () => {
        setProductId('');
        setMaterialId('');
        setQuantity(100);
        setWidth('');
        setHeight('');
        setLength('');
        setPrintType('4+4');
        setLamination('None');
        setSelectedExtras([]);
        setProductionMode('printed');
        setPages(0);
        setManualPaintPrice('');
        setBreakdown(null);
        setUnitPrice(0);
        setTotalPrice(0);
        setAppliedRules([]);
    };

    const filteredMaterials = React.useMemo(() => {
        return materials.filter(m => {
            const selectedProduct = products.find(p => p.id === productId);
            const pName = selectedProduct?.name?.toLowerCase() || '';
            
            const isRuloninisLipdukasAntPop = pName.includes('ruloninis lipdukas ant popieriaus');
            const isRuloninisLipdukasPleveles = pName.includes('ruloninis lipdukas') && pName.includes('plėvelės');
            const isSheetSticker = pName.includes('lipdukas') && !pName.includes('rulon');
            const isLipdukasAntPop = pName.includes('lipdukas ant popieriaus') && !pName.includes('rulon');
            const isOtherSheetSticker = isSheetSticker && !isLipdukasAntPop;
            
            const mn = m.name.toLowerCase();

            if (isRuloninisLipdukasAntPop) {
                return mn.includes('coated wb') ||
                       mn.includes('inkjet high glossy') ||
                       (mn.includes('inkjet matte') && mn.includes('108')) ||
                       mn.includes('rustic cream');
            }

            if (isRuloninisLipdukasPleveles) {
                return (mn.includes('inkjet glossy') && mn.includes('pp')) ||
                       (mn.includes('inkjet matte') && mn.includes('pp')) ||
                       mn.includes('inkjet glossy w pp 100');
            }

            if (isLipdukasAntPop) {
                return mn.includes('sticotac popierinis lipdukas');
            }

            if (isOtherSheetSticker) {
                return mn.includes('raflatac polylaser, plėvelė blizgi') ||
                       mn.includes('raflatac polylaser, plėvelė matinė') ||
                       mn.includes('raflatac polylaser, plėvelė skaidri blizgi');
            }

            if (!isRuloninisLipdukasAntPop && !isRuloninisLipdukasPleveles && mn.includes('inkjet')) {
                return false;
            }

            // Raflatac only for sheet film stickers
            if (mn.includes('raflatac')) {
                return false;
            }

            return true;
        });
    }, [materials, products, productId]);

    useEffect(() => {
        if (materialId) {
            const isValid = filteredMaterials.some(m => m.id === materialId);
            if (!isValid) setMaterialId('');
        }
    }, [filteredMaterials, materialId]);

    // Force one-sided printing if Lipdukas or Siuntimas
    useEffect(() => {
        if (productId) {
            const selectedProduct = products.find(p => p.id === productId);
            const pName = selectedProduct?.name?.toLowerCase() || '';
            if (pName.includes('lipdukas') || pName.includes('siuntimas')) {
                setPrintType('4+0');
            }
            
            // --- Qty and Base defaults for Paslaugos ---
            const pCategory = selectedProduct?.category?.toLowerCase() || '';
            const isServiceNow = pCategory === 'paslaugos' || pName.includes('siuntimas');
            setIsService(isServiceNow);
            
            if (isServiceNow) {
                if (quantity === 100 || quantity === 0) {
                    setQuantity(1);
                }
            }
        } else {
            setProductId('');
            setMaterialId('');
            setQuantity(100);
            setIsService(false);
        }
    }, [productId, products]);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-primary flex items-center gap-3">
                        <CalculatorIcon className="text-accent-teal" />
                        Price Calculator
                    </h1>
                    <p className="text-gray-500 mt-1">Configure product and see price breakdown in real-time.</p>
                </div>
                <button onClick={handleReset} className="btn-secondary flex items-center gap-2">
                    <RefreshCw size={16} /> Reset
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* ─── Configuration Panel ─── */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Product + Quantity */}
                    <div className="card">
                        <h3 className="section-title mb-6">Product</h3>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="calc-product" className="block text-sm font-medium text-gray-700 mb-1">Product Type</label>
                                <select
                                    id="calc-product"
                                    value={productId}
                                    onChange={(e) => setProductId(e.target.value)}
                                    className="input-field"
                                >
                                    <option value="">Select Product...</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                                
                                {popularProducts.length > 0 && products.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-2 mt-3">
                                        <span className="text-xs text-gray-400 font-medium">Popular:</span>
                                        {popularProducts.map(pName => {
                                            const p = products.find(prod => prod.name === pName);
                                            if (!p) return null;
                                            return (
                                                <button 
                                                    key={p.id}
                                                    onClick={() => setProductId(p.id)}
                                                    className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                                                        productId === p.id 
                                                            ? 'bg-accent-teal/10 border-accent-teal text-accent-teal font-medium flex-shrink-0' 
                                                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 flex-shrink-0'
                                                    }`}
                                                >
                                                    {p.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <label htmlFor="calc-qty" className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                                    <input
                                        id="calc-qty"
                                        type="number"
                                        min="1"
                                        step="50"
                                        value={quantity}
                                        onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                                        className="input-field font-mono font-bold"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="calc-print" className="block text-sm font-medium text-gray-700 mb-1">Print Type</label>
                                    <select 
                                        id="calc-print" 
                                        value={printType} 
                                        onChange={(e) => setPrintType(e.target.value)} 
                                        className="input-field"
                                        disabled={
                                            products.find(p => p.id === productId)?.name?.toLowerCase().includes('lipdukas') ||
                                            products.find(p => p.id === productId)?.name?.toLowerCase().includes('siuntimas')
                                        }
                                    >
                                        <option value="4+4">4+4 (Two sided)</option>
                                        <option value="4+0">4+0 (One sided)</option>
                                        <option value="1+1">1+1 (B&W Two)</option>
                                        <option value="1+0">1+0 (B&W One)</option>
                                    </select>
                                </div>
                                {/* Width + Height — hidden for predefined A3/A4 products */}
                                {!isService && (() => {
                                    const pn = products.find(p => p.id === productId)?.name?.toLowerCase() || '';
                                    const isPredefined = (pn.includes('lankstinukas') || pn.includes('plakatas')) &&
                                        (pn.includes('a3') || pn.includes('a4'));
                                    const isDezute = pn.includes('dėžut') || pn.includes('dezut') || pn.includes('box') || pn.includes('įmaut') || pn.includes('imaut');
                                    if (isPredefined) return null;
                                    return (
                                        <>
                                            <div>
                                                <label htmlFor="calc-w" className="block text-sm font-medium text-gray-700 mb-1">Width (mm)</label>
                                                <input
                                                    id="calc-w"
                                                    type="number"
                                                    max={(() => {
                                                        const pName = products.find(p => p.id === productId)?.name?.toLowerCase() || '';
                                                        const isRuloninis = pName.includes('rulon') && pName.includes('lipdukas');
                                                        const isSheetLipdukas = pName.includes('lipdukas') && !isRuloninis;
                                                        return isRuloninis ? 110 : (isSheetLipdukas ? 295 : undefined);
                                                    })()}
                                                    value={width}
                                                    onChange={(e) => {
                                                        let val = e.target.value;
                                                        const pName = products.find(p => p.id === productId)?.name?.toLowerCase() || '';
                                                        const isRuloninis = pName.includes('rulon') && pName.includes('lipdukas');
                                                        const isSheetLipdukas = pName.includes('lipdukas') && !isRuloninis;
                                                        if (isRuloninis && parseFloat(val) > 110) val = '110';
                                                        else if (isSheetLipdukas && parseFloat(val) > 295) val = '295';
                                                        setWidth(val);
                                                    }}
                                                    className="input-field"
                                                    placeholder="e.g. 90"
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="calc-h" className="block text-sm font-medium text-gray-700 mb-1">Height (mm)</label>
                                                <input
                                                    id="calc-h"
                                                    type="number"
                                                    max={products.find(p => p.id === productId)?.name?.toLowerCase().includes('lipdukas') ? 400 : undefined}
                                                    value={height}
                                                    onChange={(e) => {
                                                        let val = e.target.value;
                                                        const pName = products.find(p => p.id === productId)?.name?.toLowerCase() || '';
                                                        if (pName.includes('lipdukas') && parseFloat(val) > 400) val = '400';
                                                        setHeight(val);
                                                    }}
                                                    className="input-field"
                                                    placeholder="e.g. 50"
                                                />
                                            </div>
                                            {isDezute && (
                                                <div>
                                                    <label htmlFor="calc-l" className="block text-sm font-medium text-gray-700 mb-1">Length (mm)</label>
                                                    <input
                                                        id="calc-l"
                                                        type="number"
                                                        value={length}
                                                        onChange={(e) => setLength(e.target.value)}
                                                        className="input-field"
                                                        placeholder="e.g. 150"
                                                    />
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                                
                                {!isService && (() => {
                                    const pName = products.find(p => p.id === productId)?.name?.toLowerCase() || '';
                                    return pName.includes('rulon') && pName.includes('lipdukas');
                                })() && (
                                    <div>
                                        <label htmlFor="calc-paint-manual" className="block text-sm font-medium text-gray-700 mb-1">Manual Paint Price per piece</label>
                                        <input
                                            id="calc-paint-manual"
                                            type="number"
                                            step="0.001"
                                            min="0"
                                            value={manualPaintPrice}
                                            onChange={(e) => setManualPaintPrice(e.target.value)}
                                            className="input-field border-accent-teal/50 focus:border-accent-teal bg-accent-teal/5"
                                            placeholder="e.g. 0.05"
                                            title="Override area-based paint calculation with a fixed price per individual sticker"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Pages (for calendars/booklets) */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <label htmlFor="calc-pages" className="block text-sm font-medium text-gray-700 mb-1">Pages / Unit</label>
                                    <input
                                        id="calc-pages"
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={pages || ''}
                                        onChange={(e) => setPages(parseInt(e.target.value) || 0)}
                                        className="input-field font-mono"
                                        placeholder="Auto"
                                        title="For calendars/booklets: pages per unit. Leave empty for auto-detect."
                                    />
                                </div>
                            </div>

                            {/* Production Mode */}
                            {!products.find(p => p.id === productId)?.name?.toLowerCase().includes('rulon') && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Production Mode</label>
                                    <div className="flex gap-2">
                                        {([['printed', '🖨 Printed (SRA3)'], ['cut_only', '✂ Cut Only (500×700)']] as const).map(([mode, label]) => (
                                            <button
                                                key={mode}
                                                onClick={() => setProductionMode(mode)}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${productionMode === mode
                                                    ? 'bg-primary text-white border-primary shadow-md'
                                                    : 'bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary'
                                                    }`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {!isService && (
                                <div>
                                    <label htmlFor="calc-material" className="block text-sm font-medium text-gray-700 mb-1">
                                        Material / Paper <span className="text-red-500">*</span>
                                    </label>
                                    <select id="calc-material" value={materialId} onChange={(e) => setMaterialId(e.target.value)} className="input-field">
                                        <option value="">Select Material...</option>
                                        {filteredMaterials.map(m => (
                                            <option key={m.id} value={m.id}>{m.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Lamination + Extras */}
                    <div className="card">
                        <h3 className="section-title mb-4">Post-printing Options</h3>



                        {/* Extras */}
                        {availableExtras.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Extras</label>
                                <div className="flex flex-wrap gap-2">
                                    {availableExtras
                                        .map(extra => (
                                            <button
                                                key={extra.name}
                                                onClick={() => toggleExtra(extra.name)}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${selectedExtras.includes(extra.name)
                                                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-md'
                                                    : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-400 hover:text-emerald-600'
                                                    }`}
                                            >
                                                {extra.name}
                                                <span className="ml-1 opacity-70">
                                                    {extra.rule_type === 'Extra Cost Flat'
                                                        ? `(€${extra.value})`
                                                        : `(€${extra.value}/vnt)`
                                                    }
                                                </span>
                                            </button>
                                        ))}
                                </div>
                            </div>
                        )}

                        {availableExtras.length === 0 && productId && (
                            <p className="text-sm text-gray-400 italic mt-2">
                                No extras configured. Add "Extra Cost per unit" rules in Calculation Rules.
                            </p>
                        )}
                    </div>
                </div>

                {/* ─── Results Panel ─── */}
                <div className="space-y-4">
                    {/* Total */}
                    <div className="card h-fit bg-gradient-to-br from-gray-50 to-white border-gray-200">
                        <h3 className="section-title mb-4 text-gray-800">Price Summary</h3>

                        <div className="space-y-3">
                            <div className="flex justify-between items-baseline">
                                <span className="text-gray-500">Unit Price</span>
                                {isCalculating ? (
                                    <Loader2 className="animate-spin text-accent-teal" size={16} />
                                ) : (
                                    <span className="text-lg font-medium text-gray-900 font-mono">€{unitPrice.toFixed(4)}</span>
                                )}
                            </div>

                            <div className="flex justify-between items-baseline pt-3 border-t border-gray-200">
                                <span className="text-lg font-bold text-gray-700">Total</span>
                                {isCalculating ? (
                                    <Loader2 className="animate-spin text-accent-teal" size={24} />
                                ) : (
                                    <span className="text-3xl font-bold text-accent-teal font-mono">€{totalPrice.toFixed(2)}</span>
                                )}
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-200">
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                disabled={
                                    isCalculating || 
                                    totalPrice <= 0 || 
                                    (!materialId && !products.find(p => p.id === productId)?.name?.toLowerCase().includes('siuntimas'))
                                }
                                className="w-full btn-primary flex items-center justify-center gap-2 py-3"
                            >
                                <Plus size={20} />
                                Create Order
                            </button>
                        </div>

                        {!productId && (
                            <div className="mt-4 p-3 bg-amber-50 text-amber-700 text-sm rounded-md border border-amber-100">
                                Select a product to see pricing.
                            </div>
                        )}
                    </div>

                    {/* Breakdown */}
                    {breakdown && productId && isAdmin && (
                        <div className="card bg-white border-gray-200">
                            <button
                                onClick={() => setShowDetails(!showDetails)}
                                className="w-full flex items-center justify-between text-sm font-bold text-gray-600 uppercase tracking-wider"
                            >
                                Price Breakdown
                                {showDetails ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>

                            {showDetails && (
                                <div className="mt-4 space-y-2 text-sm">
                                    {/* Base */}
                                    <div className="flex justify-between py-1">
                                        <span className="text-gray-600">
                                            Base ({quantity} pcs × €{breakdown.base_price}{breakdown.is_per_unit ? '/vnt' : '/100'})
                                        </span>
                                        <span className="font-mono font-medium">€{breakdown.base_total.toFixed(2)}</span>
                                    </div>

                                    {/* Extras (per unit) */}
                                    {breakdown.extras.map((extra, idx) => (
                                        <div key={idx} className="flex justify-between py-1">
                                            <span className="text-emerald-700">
                                                + {extra.name}
                                                {extra.price_per_unit > 0 && ` (€${extra.price_per_unit.toFixed(4)}/vnt × ${quantity})`}
                                            </span>
                                            <span className="font-mono font-medium text-emerald-700">
                                                +€{extra.total.toFixed(2)}
                                            </span>
                                        </div>
                                    ))}

                                    {/* Subtotal */}
                                    {(breakdown.extras.length > 0 || breakdown.qty_adjustment_percent !== 0) && (
                                        <div className="flex justify-between py-1 border-t border-gray-100 pt-2">
                                            <span className="text-gray-500 font-medium">Subtotal</span>
                                            <span className="font-mono font-medium">€{breakdown.subtotal.toFixed(2)}</span>
                                        </div>
                                    )}

                                    {/* Qty Adjustment */}
                                    {breakdown.qty_adjustment_percent !== 0 && (
                                        <div className="flex justify-between py-1">
                                            <span className={breakdown.qty_adjustment_percent > 0 ? 'text-orange-700' : 'text-purple-700'}>
                                                {breakdown.qty_adjustment_percent > 0 ? '+ ' : '− '}
                                                Qty adj ({breakdown.qty_adjustment_percent > 0 ? '+' : ''}{breakdown.qty_adjustment_percent}%)
                                            </span>
                                            <span className={`font-mono font-medium ${breakdown.qty_adjustment_percent > 0 ? 'text-orange-700' : 'text-purple-700'}`}>
                                                {breakdown.qty_adjustment_amount >= 0 ? '+' : '−'}€{Math.abs(breakdown.qty_adjustment_amount).toFixed(2)}
                                            </span>
                                        </div>
                                    )}

                                    {/* Client Discount */}
                                    {breakdown.client_discount_percent > 0 && (
                                        <div className="flex justify-between py-1">
                                            <span className="text-rose-700">
                                                − Client ({breakdown.client_discount_percent.toFixed(1)}%)
                                            </span>
                                            <span className="font-mono font-medium text-rose-700">
                                                −€{breakdown.client_discount_amount.toFixed(2)}
                                            </span>
                                        </div>
                                    )}

                                    {/* Final Total */}
                                    <div className="flex justify-between pt-2 border-t-2 border-gray-200">
                                        <span className="font-bold text-gray-800">Total</span>
                                        <span className="font-mono font-bold text-lg text-accent-teal">
                                            €{breakdown.total.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Sheet Calculation Info */}
                    {breakdown?.sheet_calc && isAdmin && (
                        <div className={`card ${breakdown.sheet_calc.items_per_sheet === 0 ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                            <button
                                onClick={() => setShowSheetInfo(!showSheetInfo)}
                                className={`w-full flex items-center justify-between text-sm font-bold uppercase tracking-wider ${breakdown.sheet_calc.items_per_sheet === 0 ? 'text-red-700' : 'text-blue-700'}`}
                            >
                                <span className="flex items-center gap-2">
                                    <Layers size={16} /> 
                                    Sheet Layout {breakdown.sheet_calc.items_per_sheet === 0 && <span className="text-red-600 font-black ml-2 animate-pulse">! DOES NOT FIT</span>}
                                </span>
                                {showSheetInfo ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>

                            {showSheetInfo && (
                                <div className={`mt-3 space-y-1 text-sm ${breakdown.sheet_calc.items_per_sheet === 0 ? 'text-red-800' : 'text-blue-800'}`}>
                                    <div className="flex justify-between">
                                        <span>Item size</span>
                                        <span className="font-mono">{breakdown.sheet_calc.item_width}×{breakdown.sheet_calc.item_height} mm</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Sheet ({breakdown.sheet_calc.sheet_name})</span>
                                        <span className="font-mono">{breakdown.sheet_calc.sheet_width}×{breakdown.sheet_calc.sheet_height} mm</span>
                                    </div>
                                    <div className="flex justify-between font-bold">
                                        <span>Items per sheet</span>
                                        <span className="font-mono">{breakdown.sheet_calc.items_per_sheet}</span>
                                    </div>
                                    {breakdown.sheet_calc.pages && (
                                        <>
                                            <div className="flex justify-between text-indigo-700">
                                                <span>Pages per unit</span>
                                                <span className="font-mono">{breakdown.sheet_calc.pages}</span>
                                            </div>
                                            <div className="flex justify-between text-indigo-700">
                                                <span>Total prints</span>
                                                <span className="font-mono">{breakdown.sheet_calc.total_prints}</span>
                                            </div>
                                        </>
                                    )}
                                    <div className="flex justify-between font-bold">
                                        <span>Sheets needed</span>
                                        <span className="font-mono">{breakdown.sheet_calc.sheets_needed}</span>
                                    </div>
                                    <div className="flex justify-between text-xs opacity-80 pt-1">
                                        <span>Scrap (Layout)</span>
                                        <span className="font-mono">{breakdown.sheet_calc.layout_waste_percent}%</span>
                                    </div>
                                    <div className="flex justify-between text-xs opacity-80">
                                        <span>Setup / Proofing</span>
                                        <span className="font-mono">{breakdown.sheet_calc.setup_waste_percent}%</span>
                                    </div>
                                    <div className="flex justify-between border-t border-blue-200 mt-1 pt-1 font-medium">
                                        <span>Total Waste</span>
                                        <span className="font-mono">{breakdown.sheet_calc.waste_percent}%</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Applied Rules */}
                    {appliedRules.length > 0 && isAdmin && (
                        <div className="card bg-white border-gray-200">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Applied Rules</p>
                            <ul className="space-y-1.5">
                                {appliedRules.map((rule, idx) => (
                                    <li key={idx} className="text-xs text-gray-600 flex items-start gap-2">
                                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-accent-lime shrink-0"></span>
                                        {rule}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            <CreateOrderModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onOrderCreated={() => { }}
                initialItem={
                    productId ? {
                        product_id: productId,
                        product_type: products.find(p => p.id === productId)?.name || '',
                        material_id: materialId,
                        width: width ? parseFloat(width) : 0,
                        height: height ? parseFloat(height) : 0,
                        quantity,
                        print_type: printType,
                        unit_price: unitPrice,
                        total_price: totalPrice,
                        manual_unit_paint_price: manualPaintPrice ? parseFloat(manualPaintPrice) : undefined
                    } : undefined
                }
            />
        </div>
    );
};

export default Calculator;
