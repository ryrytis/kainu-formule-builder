import React, { useState, useEffect, useMemo } from 'react';
import { PricingService, PricingBreakdown, RULE_TYPES } from '../lib/PricingService';
import { supabase } from '../lib/supabase';
import { 
    Loader2, RefreshCw, Info, Zap
} from 'lucide-react';
import { clsx } from 'clsx';

interface PriceCalculatorProps {
    clientId?: string | null;
    mode?: 'admin' | 'client';
    onAction?: (data: any) => void; // For 'Create Order' or 'Add to Cart'
    initialProductId?: string;
}

const PriceCalculator: React.FC<PriceCalculatorProps> = ({ 
    clientId: initialClientId, 
    mode = 'admin',
    onAction,
    initialProductId = ''
}) => {
    const isAdmin = mode === 'admin';
    const [products, setProducts] = useState<any[]>([]);
    const [materials, setMaterials] = useState<any[]>([]);
    const [popularProducts, setPopularProducts] = useState<string[]>([]);
    const [availableExtras, setAvailableExtras] = useState<{ name: string; rule_type: string; value: number }[]>([]);
    const [clientId, setClientId] = useState<string | null>(initialClientId || null);
    const [clientPriceListId, setClientPriceListId] = useState<string | null>(null);

    // Form State
    const [productId, setProductId] = useState(initialProductId);
    const [materialId, setMaterialId] = useState('');
    const [quantity, setQuantity] = useState<number>(100);
    const [width, setWidth] = useState('');
    const [height, setHeight] = useState('');
    const [length, setLength] = useState('');
    const [printType, setPrintType] = useState('4+4');
    const [lamination, setLamination] = useState('None');
    const [laminationSides, setLaminationSides] = useState<1 | 2>(1);
    const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
    const [productionMode, setProductionMode] = useState<'printed' | 'cut_only'>('printed');
    const [pages, setPages] = useState<number>(0);
    const [manualPaintPrice, setManualPaintPrice] = useState<string>('');
    const [isService, setIsService] = useState(false);
    const [inkjetCounter, setInkjetCounter] = useState<'A'|'B'|'C'|'D'|'E'|''>('');
    const [hasInkjetRules, setHasInkjetRules] = useState(false);

    // Booklet Specific
    const [coverMaterialId, setCoverMaterialId] = useState('');
    const [innerMaterialId, setInnerMaterialId] = useState('');
    const [innerPages, setInnerPages] = useState<number>(8);
    const [coverPrintType, setCoverPrintType] = useState('4+4');
    const [innerPrintType, setInnerPrintType] = useState('4+4');

    const isBooklet = useMemo(() => {
        const p = products.find(p => p.id === productId);
        const name = p?.name?.toLowerCase() || '';
        return name.includes('buklet') || name.includes('katalog') || name.includes('knyg') || name.includes('leidin');
    }, [productId, products]);

    const isInkjet = useMemo(() => {
        // 1. Check if selected material is inkjet
        const selectedMaterial = materials.find(m => m.id === materialId);
        if (selectedMaterial) {
            const isDbRoll = selectedMaterial.width && !selectedMaterial.height;
            const mName = (selectedMaterial.name || '').toLowerCase();
            const mCat = (selectedMaterial.category || '').toLowerCase();
            if (isDbRoll || mCat === 'rulonai' || mCat === 'photo' || mName.includes('canon') || mName.includes('inkjet') || mName.includes('plotis')) {
                return true;
            }
        }

        // 2. Check if selected product is inkjet
        const selectedProduct = products.find(p => p.id === productId);
        if (selectedProduct) {
            const pName = (selectedProduct.name || '').toLowerCase();
            const pCat = (selectedProduct.category || '').toLowerCase();
            if (hasInkjetRules || pName.includes('plakatas') || pName.includes('poster') || pCat.includes('inkjet') || pCat.includes('large format') || pCat.includes('plačiaformat')) {
                return true;
            }

            // 3. If all allowed materials for this product are inkjet
            const allowedIds = selectedProduct.allowed_material_ids;
            if (allowedIds && allowedIds.length > 0) {
                const allowedMats = materials.filter((m: any) => allowedIds.includes(m.id));
                if (allowedMats.length > 0 && allowedMats.every((m: any) => {
                    const mName = (m.name || '').toLowerCase();
                    const mCat = (m.category || '').toLowerCase();
                    const isDbRoll = m.width && !m.height;
                    return isDbRoll || mCat === 'rulonai' || mCat === 'photo' || mName.includes('canon') || mName.includes('inkjet') || mName.includes('plotis');
                })) {
                    return true;
                }
            }
        }

        return false;
    }, [productId, products, materials, materialId, hasInkjetRules]);

    // Pricing State
    const [breakdown, setBreakdown] = useState<PricingBreakdown | null>(null);
    const [totalPrice, setTotalPrice] = useState(0);
    const [unitPrice, setUnitPrice] = useState(0);
    const [appliedRules, setAppliedRules] = useState<string[]>([]);
    const [isCalculating, setIsCalculating] = useState(false);

    useEffect(() => {
        fetchProducts();
        fetchMaterials();
        if (isAdmin) fetchPopularProducts();
    }, []);

    useEffect(() => {
        setClientId(initialClientId || null);
    }, [initialClientId]);

    // Inkjet products/materials only support one-sided printing
    useEffect(() => {
        if (isInkjet) {
            if (printType === '4+4') {
                setPrintType('4+0');
            } else if (printType === '1+1') {
                setPrintType('1+0');
            }
        }
    }, [isInkjet, printType]);

    // Fetch client price list
    useEffect(() => {
        const fetchClientPriceList = async () => {
            if (!clientId) {
                setClientPriceListId(null);
                return;
            }
            const { data } = await (supabase as any).from('clients').select('price_list_id').eq('id', clientId).maybeSingle();
            if (data) {
                setClientPriceListId(data.price_list_id);
            } else {
                setClientPriceListId(null);
            }
        };
        fetchClientPriceList();
    }, [clientId]);

    // Load available extras when product changes
    useEffect(() => {
        const loadExtras = async () => {
            const extras = await PricingService.getAvailableExtras(productId || undefined);
            setAvailableExtras(extras);
            setSelectedExtras(prev => prev.filter(e => extras.some(x => x.name === e)));

            // Check for inkjet click cost rules for this product
            if (productId) {
                const { data: inkjetRules } = await (supabase as any)
                    .from('calculation_rules')
                    .select('id')
                    .eq('is_active', true)
                    .eq('rule_type', RULE_TYPES.INKJET_CLICK_COST)
                    .or(`product_ids.cs.{${productId}},product_id.eq.${productId}`);
                setHasInkjetRules(!!(inkjetRules && inkjetRules.length > 0));
            } else {
                setHasInkjetRules(false);
                setInkjetCounter('');
            }
        };
        loadExtras();
    }, [productId]);

    const { lamExtras, otherExtras } = useMemo(() => {
        const lam = availableExtras.filter(e => {
            const l = e.name.toLowerCase();
            return l.includes('laminat') || 
                   l.includes('plėvel') || 
                   l.includes('matt') || 
                   l.includes('gloss') || 
                   l.includes('soft touch') || 
                   l.includes('softtouch') ||
                   l.includes('matinis') || 
                   l.includes('blizgus');
        });
        const other = availableExtras.filter(e => !lam.some(lx => lx.name === e.name));
        return { lamExtras: lam, otherExtras: other };
    }, [availableExtras]);

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
                // Use backend API for clients, internal service for admin
                let result;
                if (mode === 'client') {
                    const res = await fetch('/api/calculate_price', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            product_id: productId,
                            quantity,
                            material_id: materialId || undefined,
                            cover_material_id: isBooklet ? coverMaterialId : undefined,
                            inner_material_id: isBooklet ? innerMaterialId : undefined,
                            inner_pages: isBooklet ? innerPages : undefined,
                            cover_print_type: isBooklet ? coverPrintType : undefined,
                            inner_print_type: isBooklet ? innerPrintType : undefined,
                            lamination,
                            lamination_sides: laminationSides,
                            selected_extras: selectedExtras,
                            production_mode: productionMode,
                            pages: pages || undefined,
                            width: width ? parseFloat(width) : undefined,
                            height: height ? parseFloat(height) : undefined,
                            length: length ? parseFloat(length) : undefined,
                            print_type: printType,
                            manual_unit_paint_price: manualPaintPrice ? parseFloat(manualPaintPrice) : undefined,
                            client_price_list_id: clientPriceListId || undefined,
                            inkjet_counter: inkjetCounter || undefined
                        })
                    });
                    result = await res.json();
                } else {
                    result = await PricingService.calculatePrice({
                        product_id: productId,
                        quantity,
                        material_id: materialId || undefined,
                        cover_material_id: isBooklet ? coverMaterialId : undefined,
                        inner_material_id: isBooklet ? innerMaterialId : undefined,
                        inner_pages: isBooklet ? innerPages : undefined,
                        cover_print_type: isBooklet ? coverPrintType : undefined,
                        inner_print_type: isBooklet ? innerPrintType : undefined,
                        lamination,
                        lamination_sides: laminationSides,
                        selected_extras: selectedExtras,
                        production_mode: productionMode,
                        pages: pages || undefined,
                        width: width ? parseFloat(width) : undefined,
                        height: height ? parseFloat(height) : undefined,
                        print_type: printType,
                        manual_unit_paint_price: manualPaintPrice ? parseFloat(manualPaintPrice) : undefined,
                        client_price_list_id: clientPriceListId || undefined,
                        inkjet_counter: inkjetCounter || undefined
                    });
                }

                setUnitPrice(result.unit_price);
                setTotalPrice(result.total_price);
                setAppliedRules(result.applied_rules || []);
                setBreakdown(result.breakdown || null);
            } catch (err) {
                console.error("Calculation failed", err);
            } finally {
                setIsCalculating(false);
            }
        };

        const debounce = setTimeout(calculate, 400);
        return () => clearTimeout(debounce);
    }, [productId, quantity, materialId, width, height, printType, lamination, laminationSides, selectedExtras, productionMode, pages, manualPaintPrice, clientPriceListId, mode, coverMaterialId, innerMaterialId, innerPages, coverPrintType, innerPrintType, inkjetCounter]);

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
        setInkjetCounter('');
        setBreakdown(null);
        setUnitPrice(0);
        setTotalPrice(0);
        setAppliedRules([]);
    };

    const filteredMaterials = useMemo(() => {
        const selectedProduct = products.find(p => p.id === productId);
        if (!selectedProduct) return materials;

        // FIRST: Check for specific allowed material IDs (most precise filter)
        const allowedIds = selectedProduct.allowed_material_ids;
        if (allowedIds && allowedIds.length > 0) {
            return materials.filter((m: any) => allowedIds.includes(m.id));
        }

        // SECOND: Check for specific allowed categories set in Product Editor
        const allowedCats = selectedProduct.allowed_material_categories;
        if (allowedCats && allowedCats.length > 0) {
            return materials.filter((m: any) => allowedCats.includes(m.category));
        }

        // LEGACY/FALLBACK: Keep existing sticker-specific logic for now
        return materials.filter(m => {
            const pName = selectedProduct.name?.toLowerCase() || '';
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

            if (mn.includes('raflatac')) {
                return false;
            }

            return true;
        });
    }, [materials, products, productId]);

    // Force one-sided printing if Lipdukas or Siuntimas
    useEffect(() => {
        if (productId) {
            const selectedProduct = products.find(p => p.id === productId);
            const pName = selectedProduct?.name?.toLowerCase() || '';
            if (pName.includes('lipdukas') || pName.includes('siuntimas')) {
                setPrintType('4+0');
            }
            
            const pCategory = selectedProduct?.category?.toLowerCase() || '';
            const isServiceNow = pCategory === 'paslaugos' || pName.includes('siuntimas');
            setIsService(isServiceNow);
            
            if (isServiceNow && (quantity === 100 || quantity === 0)) {
                setQuantity(1);
            }
        }
    }, [productId, products]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
                <div className="card">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="section-title mb-0">Gaminio nustatymai</h3>
                        <button onClick={handleReset} className="text-gray-400 hover:text-primary transition-colors flex items-center gap-1 text-xs font-medium uppercase tracking-widest">
                            <RefreshCw size={12} /> Išvalyti
                        </button>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Gaminio tipas</label>
                            <select
                                value={productId}
                                onChange={(e) => setProductId(e.target.value)}
                                className="w-full border-2 border-gray-100 p-3 rounded-lg focus:border-accent-teal outline-none transition-all font-medium"
                            >
                                <option value="">Pasirinkite gaminį...</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>

                            {isAdmin && popularProducts.length > 0 && products.length > 0 && (
                                <div className="flex flex-wrap items-center gap-2 mt-3">
                                    <span className="text-xs text-gray-400 font-medium">Populiariausi:</span>
                                    {popularProducts.map(pName => {
                                        const p = products.find(prod => prod.name === pName);
                                        if (!p) return null;
                                        return (
                                            <button 
                                                key={p.id}
                                                onClick={() => setProductId(p.id)}
                                                className={clsx(
                                                    "text-xs px-2.5 py-1 rounded-md border transition-all",
                                                    productId === p.id 
                                                        ? 'bg-accent-teal text-white border-accent-teal shadow-md' 
                                                        : 'bg-white border-gray-200 text-gray-600 hover:border-accent-teal'
                                                )}
                                            >
                                                {p.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Kiekis</label>
                                <input
                                    type="number"
                                    min="1"
                                    step="50"
                                    value={quantity}
                                    onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                                    className="w-full border-2 border-gray-100 p-3 rounded-lg focus:border-accent-teal outline-none transition-all font-black text-primary"
                                />
                            </div>
                            <div className={clsx(isBooklet && "opacity-50 pointer-events-none")}>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Spauda</label>
                                <select 
                                    value={printType} 
                                    onChange={(e) => setPrintType(e.target.value)} 
                                    className="w-full border-2 border-gray-100 p-3 rounded-lg focus:border-accent-teal outline-none transition-all font-medium"
                                    disabled={
                                        isBooklet ||
                                        products.find(p => p.id === productId)?.name?.toLowerCase().includes('lipdukas') ||
                                        products.find(p => p.id === productId)?.name?.toLowerCase().includes('siuntimas') ||
                                        productionMode === 'cut_only'
                                    }
                                >
                                    {!isInkjet && <option value="4+4">4+4 (Dvipusė)</option>}
                                    <option value="4+0">4+0 (Vienpusė)</option>
                                    {!isInkjet && <option value="1+1">1+1 (J/B Dvipusė)</option>}
                                    <option value="1+0">1+0 (J/B Vienpusė)</option>
                                </select>
                            </div>
                            {(() => {
                                const pn = products.find(p => p.id === productId)?.name?.toLowerCase() || '';
                                const isBOM = pn.includes('dėžut') || pn.includes('dezut') || pn.includes('box') || 
                                              pn.includes('karul') || 
                                              pn.includes('įmaut') || pn.includes('imaut') || pn.includes('įdėkl') || pn.includes('idekl');
                                if (!isBOM) return null;
                                return (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Gamybos būdas</label>
                                        <select 
                                            value={productionMode} 
                                            onChange={(e) => setProductionMode(e.target.value as any)} 
                                            className="w-full border-2 border-gray-100 p-3 rounded-lg focus:border-accent-teal outline-none transition-all font-medium"
                                        >
                                            <option value="printed">Spausdintas (SRA3)</option>
                                            <option value="cut_only">Tik pjovimas (Didelis lapas)</option>
                                        </select>
                                    </div>
                                );
                            })()}

                            {!isService && (() => {
                                const pn = products.find(p => p.id === productId)?.name?.toLowerCase() || '';
                                const isPredefined = (pn.includes('lankstinukas') || pn.includes('plakatas')) && (pn.includes('a3') || pn.includes('a4'));

                                if (isPredefined) return null;
                                return (
                                    <>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Plotis (mm)</label>
                                            <input
                                                type="number"
                                                value={width}
                                                onChange={(e) => setWidth(e.target.value)}
                                                className="w-full border-2 border-gray-100 p-3 rounded-lg focus:border-accent-teal outline-none transition-all font-medium"
                                                placeholder="Pvz: 90"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Aukštis (mm)</label>
                                            <input
                                                type="number"
                                                value={height}
                                                onChange={(e) => setHeight(e.target.value)}
                                                className="w-full border-2 border-gray-100 p-3 rounded-lg focus:border-accent-teal outline-none transition-all font-medium"
                                                placeholder="Pvz: 50"
                                            />
                                        </div>
                                        {(pn.includes('dėžut') || pn.includes('dezut') || pn.includes('box') || pn.includes('mov') || pn.includes('įmaut') || pn.includes('imaut')) && (
                                            <div>
                                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Ilgis (mm)</label>
                                                <input
                                                    type="number"
                                                    value={length}
                                                    onChange={(e) => setLength(e.target.value)}
                                                    className="w-full border-2 border-gray-100 p-3 rounded-lg focus:border-accent-teal outline-none transition-all font-medium"
                                                    placeholder="Pvz: 100"
                                                />
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>

                        {!isService && !isBooklet && (
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Medžiaga / Popierius</label>
                                <select 
                                    value={materialId} 
                                    onChange={(e) => setMaterialId(e.target.value)} 
                                    className="w-full border-2 border-gray-100 p-3 rounded-lg focus:border-accent-teal outline-none transition-all font-medium"
                                >
                                    <option value="">Pasirinkite medžiagą...</option>
                                    {filteredMaterials.map((m: any) => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Inkjet Skaitiklis selector — appears when product or material uses inkjet click cost */}
                        {isInkjet && !isService && (
                            <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    <Zap size={16} className="text-cyan-600" />
                                    <label className="text-xs font-black text-cyan-800 uppercase tracking-widest">Dažų tankis (Skaitiklis)</label>
                                </div>
                                <div className="grid grid-cols-5 gap-2">
                                    {(['A','B','C','D','E'] as const).map((level, i) => {
                                        const rates = [0.0750, 0.1310, 0.1880, 0.2810, 0.4380];
                                        const isSelected = inkjetCounter === level;
                                        // Live click cost preview from current dimensions
                                        const w = parseFloat(width) || 0;
                                        const h = parseFloat(height) || 0;
                                        const areaA4 = w > 0 && h > 0 ? (w * h / 1_000_000) * 16 : null;
                                        const clickPreview = areaA4 ? areaA4 * rates[i] : null;
                                        return (
                                            <button
                                                key={level}
                                                type="button"
                                                onClick={() => setInkjetCounter(prev => prev === level ? '' : level)}
                                                className={clsx(
                                                    'p-2.5 rounded-lg border text-center transition-all flex flex-col items-center gap-0.5',
                                                    isSelected
                                                        ? 'bg-cyan-600 text-white border-cyan-600 shadow-md ring-2 ring-cyan-300'
                                                        : 'bg-white text-gray-700 border-gray-200 hover:border-cyan-400'
                                                )}
                                            >
                                                <span className="font-black text-base">{level}</span>
                                                <span className={clsx('text-[10px] font-bold', isSelected ? 'text-cyan-100' : 'text-gray-500')}>
                                                    €{rates[i]}/A4
                                                </span>
                                                {clickPreview !== null && (
                                                    <span className={clsx('text-[9px]', isSelected ? 'text-cyan-200' : 'text-cyan-600')}>
                                                        €{clickPreview.toFixed(3)}/vnt
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                                {inkjetCounter && width && height && (() => {
                                    const rateMap: Record<string, number> = { A: 0.0750, B: 0.1310, C: 0.1880, D: 0.2810, E: 0.4380 };
                                    const w = parseFloat(width), h = parseFloat(height);
                                    const areaM2 = (w * h) / 1_000_000;
                                    const areaA4 = areaM2 * 16;
                                    const clickPerUnit = areaA4 * rateMap[inkjetCounter];
                                    return (
                                        <div className="text-[11px] text-cyan-700 bg-cyan-100/60 rounded p-2 font-mono">
                                            {w}×{h}mm = {areaM2.toFixed(4)}m² = {areaA4.toFixed(3)} A4 × €{rateMap[inkjetCounter]}/A4 = <strong>€{clickPerUnit.toFixed(4)}/vnt</strong>
                                        </div>
                                    );
                                })()}
                                {!inkjetCounter && (
                                    <p className="text-[11px] text-cyan-600 italic">Pasirinkite dažų tankio lygį (A = lengviausias, E = intensyviausias)</p>
                                )}
                            </div>
                        )}

                        {!isService && isBooklet && (
                            <div className="space-y-6 pt-4 border-t border-gray-100">
                                <h4 className="text-sm font-black text-primary uppercase tracking-tighter">Knygos/Bukleto sudėtis</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4 p-5 bg-gray-50/50 rounded-2xl border border-gray-100">
                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Viršelis (4 psl.)</label>
                                        <div className="space-y-3">
                                            <select 
                                                value={coverMaterialId} 
                                                onChange={(e) => setCoverMaterialId(e.target.value)} 
                                                className="w-full border-2 border-white p-3 rounded-xl focus:border-accent-teal outline-none transition-all font-medium shadow-sm"
                                            >
                                                <option value="">Viršelio popierius...</option>
                                                {filteredMaterials.map(m => (
                                                    <option key={m.id} value={m.id}>{m.name}</option>
                                                ))}
                                            </select>
                                            <select 
                                                value={coverPrintType} 
                                                onChange={(e) => setCoverPrintType(e.target.value)} 
                                                className="w-full border-2 border-white p-3 rounded-xl focus:border-accent-teal outline-none transition-all font-medium shadow-sm"
                                            >
                                                <option value="4+4">4+4 (Dvipusė)</option>
                                                <option value="4+0">4+0 (Vienpusė)</option>
                                                <option value="1+1">1+1 (J/B Dvipusė)</option>
                                                <option value="1+0">1+0 (J/B Vienpusė)</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-4 p-5 bg-gray-50/50 rounded-2xl border border-gray-100">
                                        <div className="flex justify-between items-center">
                                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Vidus</label>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="number" 
                                                    value={innerPages} 
                                                    onChange={(e) => setInnerPages(parseInt(e.target.value) || 0)}
                                                    className="w-16 p-2 text-center border-2 border-white rounded-xl font-black text-primary shadow-sm focus:border-accent-teal outline-none transition-all"
                                                />
                                                <span className="text-[10px] text-gray-400 font-bold uppercase">psl.</span>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <select 
                                                value={innerMaterialId} 
                                                onChange={(e) => setInnerMaterialId(e.target.value)} 
                                                className="w-full border-2 border-white p-3 rounded-xl focus:border-accent-teal outline-none transition-all font-medium shadow-sm"
                                            >
                                                <option value="">Vidaus popierius...</option>
                                                {filteredMaterials.map(m => (
                                                    <option key={m.id} value={m.id}>{m.name}</option>
                                                ))}
                                            </select>
                                            <select 
                                                value={innerPrintType} 
                                                onChange={(e) => setInnerPrintType(e.target.value)} 
                                                className="w-full border-2 border-white p-3 rounded-xl focus:border-accent-teal outline-none transition-all font-medium shadow-sm"
                                            >
                                                <option value="4+4">4+4 (Dvipusė)</option>
                                                <option value="4+0">4+0 (Vienpusė)</option>
                                                <option value="1+1">1+1 (J/B Dvipusė)</option>
                                                <option value="1+0">1+0 (J/B Vienpusė)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
 
                        {!isService && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Laminavimas</label>
                                    <select 
                                        value={lamination} 
                                        onChange={(e) => setLamination(e.target.value)} 
                                        className="w-full border-2 border-gray-100 p-3 rounded-lg focus:border-accent-teal outline-none transition-all font-medium"
                                    >
                                        <option value="None">Be laminato</option>
                                        {lamExtras.map(ex => (
                                            <option key={ex.name} value={ex.name}>{ex.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Laminavimo pusės</label>
                                    <select 
                                        value={laminationSides} 
                                        onChange={(e) => setLaminationSides(parseInt(e.target.value) as 1 | 2)} 
                                        className="w-full border-2 border-gray-100 p-3 rounded-lg focus:border-accent-teal outline-none transition-all font-medium"
                                        disabled={lamination === 'None'}
                                    >
                                        <option value={1}>Vienpusis</option>
                                        <option value={2}>Dvipusis</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Post-printing Options */}
                        {!isService && otherExtras.length > 0 && (
                            <div className="pt-6 border-t border-gray-100">
                                <h4 className="text-sm font-black text-primary mb-4">Post-printing Options</h4>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-3">Extras</label>
                                    <div className="flex flex-wrap gap-3">
                                        {otherExtras.map(extra => {
                                            const isSelected = selectedExtras.includes(extra.name);
                                            const priceLabel = extra.rule_type === 'Extra Cost per unit' 
                                                ? `(€${extra.value}/vnt)` 
                                                : extra.rule_type === 'Extra Cost per 100'
                                                ? `(€${extra.value}/100vnt)`
                                                : `(€${extra.value} flat)`;
                                            
                                            return (
                                                <button
                                                    key={extra.name}
                                                    onClick={() => toggleExtra(extra.name)}
                                                    className={clsx(
                                                        "px-4 py-2.5 rounded-lg text-sm font-medium border transition-all flex items-center gap-2",
                                                        isSelected
                                                            ? 'bg-accent-teal/5 border-accent-teal text-accent-teal shadow-sm ring-1 ring-accent-teal'
                                                            : 'bg-white text-gray-600 border-gray-200 hover:border-accent-teal'
                                                    )}
                                                >
                                                    <span>{extra.name}</span>
                                                    <span className="text-[10px] opacity-60 font-bold">{priceLabel}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Results */}
            <div className="space-y-4">
                <div className="card bg-primary text-white p-8">
                    <h3 className="text-xs font-black uppercase tracking-widest text-accent-teal mb-4">Preliminari kaina</h3>
                    
                    <div className="space-y-6">
                        <div className="flex justify-between items-baseline">
                            <span className="text-gray-400 text-sm">Vieneto kaina</span>
                            {isCalculating ? (
                                <Loader2 className="animate-spin text-accent-teal" size={16} />
                            ) : (
                                <span className="text-xl font-bold">€{unitPrice.toFixed(4)}</span>
                            )}
                        </div>

                        <div className="flex justify-between items-baseline pt-6 border-t border-white/10">
                            <span className="text-lg font-bold">Iš viso</span>
                            {isCalculating ? (
                                <Loader2 className="animate-spin text-accent-teal" size={32} />
                            ) : (
                                <span className="text-4xl font-black text-accent-teal">€{totalPrice.toFixed(2)}</span>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            const product = products.find(p => p.id === productId);
                            const coverMat = materials.find(m => m.id === coverMaterialId);
                            const innerMat = materials.find(m => m.id === innerMaterialId);
                            const paperTypeStr = isBooklet
                                ? `Viršelis: ${coverMat?.name || 'Nepasirinkta'}, Vidus: ${innerPages} psl. ${innerMat?.name || 'Nepasirinkta'}`
                                : undefined;
                            const printTypeStr = isBooklet
                                ? `Viršelis: ${coverPrintType}, Vidus: ${innerPrintType}`
                                : printType;
                            onAction?.({
                                product_id: productId,
                                material_id: materialId || null,
                                quantity,
                                width,
                                height,
                                print_type: printTypeStr,
                                lamination,
                                product_name: product?.name || 'Gaminys',
                                product_category: product?.category || '',
                                unit_price: unitPrice,
                                total_price: totalPrice,
                                selected_extras: selectedExtras,
                                paper_type: paperTypeStr,
                                pages: isBooklet ? innerPages : undefined,
                            });
                        }}
                        disabled={isCalculating || totalPrice <= 0 || (isBooklet ? (!coverMaterialId || !innerMaterialId) : (!materialId && !isService))}
                        className="w-full mt-8 py-4 bg-accent-teal text-white font-black uppercase tracking-widest rounded-xl shadow-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                    >
                        {isAdmin ? 'Sukurti užsakymą' : 'Į krepšelį'}
                    </button>
                </div>

                {/* Admin Details */}
                {isAdmin && breakdown && (
                    <div className="card space-y-6">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">Techninė informacija</h4>
                            <Info size={16} className="text-gray-300" />
                        </div>
                        
                        <div className="space-y-4">
                            {breakdown.sheet_calc && (() => {
                                const isRoll = breakdown.sheet_calc.sheet_name.toLowerCase().includes('rulon') || 
                                               breakdown.sheet_calc.sheet_name.toLowerCase().includes('roll');
                                return (
                                    <div className="p-4 bg-gray-50 rounded-lg space-y-2 text-sm">
                                        <div className="flex justify-between text-gray-500">
                                            <span>{isRoll ? 'Gaminiai eilėje:' : 'Gaminiai lape:'}</span>
                                            <span className="font-bold text-primary">{breakdown.sheet_calc.items_per_sheet}</span>
                                        </div>
                                        <div className="flex justify-between text-gray-500">
                                            <span>{isRoll ? 'Reikia metrų:' : 'Reikia lapų:'}</span>
                                            <span className="font-bold text-primary">
                                                {breakdown.sheet_calc.sheets_needed}{isRoll ? ' m' : ''}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-gray-500">
                                            <span>Atraižos:</span>
                                            <span className="font-bold text-accent-teal">{breakdown.sheet_calc.waste_percent}%</span>
                                        </div>
                                        {isRoll && (
                                            <div className="text-[10px] text-gray-400 font-mono italic mt-1 pt-1 border-t border-gray-200/50">
                                                Formatas: {breakdown.sheet_calc.sheet_name}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            <div className="space-y-1">
                                {appliedRules.map((rule, idx) => (
                                    <div key={idx} className="text-[10px] text-gray-400 flex items-start gap-2">
                                        <div className="w-1 h-1 rounded-full bg-accent-teal mt-1.5 shrink-0" />
                                        {rule}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PriceCalculator;
