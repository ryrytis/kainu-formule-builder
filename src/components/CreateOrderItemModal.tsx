import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { PricingService } from '../lib/PricingService';
import { supabase } from '../lib/supabase';
import { X, Loader2, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

interface CreateOrderItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onItemAdded: () => void;
    orderId: string;
    item?: any; // Optional item for editing
}

const CreateOrderItemModal: React.FC<CreateOrderItemModalProps> = ({ isOpen, onClose, onItemAdded, orderId, item }) => {
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState<any[]>([]);
    const [materials, setMaterials] = useState<any[]>([]);
    const [works, setWorks] = useState<any[]>([]); // Available works from DB

    // Form State
    const [productId, setProductId] = useState('');
    const [materialId, setMaterialId] = useState('');
    const [quantity, setQuantity] = useState<number>(1);
    const [width, setWidth] = useState('');
    const [height, setHeight] = useState('');
    const [printType, setPrintType] = useState('Vienpusis');

    // Pricing State
    const [unitPrice, setUnitPrice] = useState(0);
    const [totalPrice, setTotalPrice] = useState(0);
    const [totalCost, setTotalCost] = useState(0); // Cost Price
    const [marginPercent, setMarginPercent] = useState(0);
    const [selectedWorks, setSelectedWorks] = useState<{ name: string, duration: number }[]>([]);

    const [appliedRules, setAppliedRules] = useState<string[]>([]);
    const [isManualPrice, setIsManualPrice] = useState(false);
    const [showCostDetails, setShowCostDetails] = useState(false);

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchProducts();
            fetchMaterials();
            fetchWorks();

            if (item) {
                // If editing, fill form
                setQuantity(item.quantity);
                setWidth(item.width || '');
                setHeight(item.height || '');
                setPrintType(item.print_type || 'Vienpusis');
                setMaterialId(item.material_id || '');
                setUnitPrice(item.unit_price || 0);
                setTotalPrice(item.total_price || 0);
                setIsManualPrice(true); // Default to manual if it has saved price
            } else {
                // Reset form for create
                setQuantity(1);
                setProductId('');
                setMaterialId('');
                setWidth('');
                setHeight('');
                setUnitPrice(0);
                setTotalPrice(0);
                setTotalCost(0);
                setMarginPercent(0);
                setSelectedWorks([]);
                setAppliedRules([]);
                setIsManualPrice(false);
            }
        }
    }, [isOpen, item]);

    useEffect(() => {
        if (item && products.length > 0) {
            const found = products.find(p => p.name === item.product_type);
            if (found) setProductId(found.id);
        }
    }, [products, item]);

    // Auto-calculate price when dependencies change
    useEffect(() => {
        const calculate = async () => {
            if (!productId || isManualPrice) return;

            const result = await PricingService.calculatePrice({
                product_id: productId,
                quantity: quantity,
                material_id: materialId,
                width: width ? parseFloat(width) : undefined,
                height: height ? parseFloat(height) : undefined,
                extra_works: selectedWorks,
            });

            setUnitPrice(result.unit_price);
            setTotalPrice(result.total_price);
            setTotalCost(result.total_cost || 0);
            setMarginPercent(result.margin_percent || 0);
            setAppliedRules(result.applied_rules);
        };

        const debounce = setTimeout(calculate, 500);
        return () => clearTimeout(debounce);
    }, [productId, quantity, materialId, width, height, printType, isManualPrice, selectedWorks]);

    // Recalculate total if manual price changes
    useEffect(() => {
        if (isManualPrice) {
            setTotalPrice(unitPrice * quantity);
        }
    }, [unitPrice, quantity, isManualPrice]);

    // Auto-load default works when product changes
    useEffect(() => {
        const loadDefaultWorks = async () => {
            if (!productId) return;

            // Get product default works
            const { data: defaults } = await supabase
                .from('product_works')
                .select(`
                    default_quantity,
                    works (operation)
                `)
                .eq('product_id', productId);

            if (defaults && defaults.length > 0) {
                const mapped = defaults.map((d: any) => ({
                    name: d.works?.operation || 'Unknown',
                    duration: d.default_quantity
                }));
                setSelectedWorks(mapped);
            } else {
                setSelectedWorks([]);
            }
        };

        if (!item) { // Only load defaults for new items
            loadDefaultWorks();
        }
    }, [productId]);

    const fetchProducts = async () => {
        const { data } = await (supabase as any).from('products').select('*').order('name');
        if (data) setProducts(data);
    };

    const fetchMaterials = async () => {
        const { data } = await supabase.from('materials').select('*').order('name');
        if (data) setMaterials(data);
    };

    const fetchWorks = async () => {
        const { data } = await supabase.from('works').select('*').order('operation');
        if (data) setWorks(data);
    };



    const addWork = (workName: string) => {
        if (!workName) return;
        // Check if already added? Maybe allow multiples (e.g. 2x Cutting).
        setSelectedWorks([...selectedWorks, { name: workName, duration: 1 }]);
    };

    const removeWork = (index: number) => {
        const newWorks = [...selectedWorks];
        newWorks.splice(index, 1);
        setSelectedWorks(newWorks);
    };

    const updateWorkDuration = (index: number, val: number) => {
        const newWorks = [...selectedWorks];
        newWorks[index].duration = val;
        setSelectedWorks(newWorks);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const selectedProduct = products.find(p => p.id === productId);
            const itemData = {
                order_id: orderId,
                product_type: selectedProduct?.name || 'Unknown',
                material_id: materialId || null,
                quantity: quantity,
                width: width ? parseFloat(width) : null,
                height: height ? parseFloat(height) : null,
                print_type: printType,
                unit_price: unitPrice,
                total_price: totalPrice,
                cost_price: totalCost,
                margin_percent: marginPercent,
                item_works: selectedWorks
            };

            if (item?.id) {
                // UPDATE
                const { error: updateError } = await (supabase as any)
                    .from('order_items')
                    .update(itemData)
                    .eq('id', item.id);
                if (updateError) throw updateError;
            } else {
                // INSERT
                const { error: insertError } = await (supabase as any)
                    .from('order_items')
                    .insert([itemData]);
                if (insertError) throw insertError;
            }

            // Recalculate Order Total Price
            const { data: allItems } = await (supabase as any)
                .from('order_items')
                .select('total_price')
                .eq('order_id', orderId);

            const newOrderTotal = allItems?.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0) || 0;

            await (supabase as any)
                .from('orders')
                .update({ total_price: newOrderTotal })
                .eq('id', orderId);

            onItemAdded();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to save item');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                    <h2 className="text-lg font-semibold text-gray-800">
                        {item ? 'Edit Order Item' : 'Add Order Item'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded text-sm mb-4">
                            {error}
                        </div>
                    )}

                    <div>
                        <label htmlFor="order-product-type" className="block text-sm font-medium text-gray-700 mb-1">
                            Product Type
                        </label>
                        <select
                            id="order-product-type"
                            value={productId}
                            onChange={(e) => setProductId(e.target.value)}
                            className="input-field"
                            required
                        >
                            <option value="">Select Product...</option>
                            {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="order-material" className="block text-sm font-medium text-gray-700 mb-1">
                            Material / Paper
                        </label>
                        <select
                            id="order-material"
                            value={materialId}
                            onChange={(e) => setMaterialId(e.target.value)}
                            className="input-field"
                        >
                            <option value="">Select Material...</option>
                            {materials.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="order-width" className="block text-sm font-medium text-gray-700 mb-1">
                                Width (mm)
                            </label>
                            <input
                                id="order-width"
                                type="text"
                                value={width}
                                onChange={(e) => setWidth(e.target.value)}
                                className="input-field"
                                placeholder="e.g. 210"
                            />
                        </div>
                        <div>
                            <label htmlFor="order-height" className="block text-sm font-medium text-gray-700 mb-1">
                                Height (mm)
                            </label>
                            <input
                                id="order-height"
                                type="text"
                                value={height}
                                onChange={(e) => setHeight(e.target.value)}
                                className="input-field"
                                placeholder="e.g. 297"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="order-quantity" className="block text-sm font-medium text-gray-700 mb-1">
                                Quantity
                            </label>
                            <input
                                id="order-quantity"
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) => setQuantity(parseInt(e.target.value))}
                                className="input-field"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="order-print-type" className="block text-sm font-medium text-gray-700 mb-1">
                                Print Type
                            </label>
                            <select
                                id="order-print-type"
                                value={printType}
                                onChange={(e) => setPrintType(e.target.value)}
                                className="input-field"
                            >
                                <option value="Vienpusis">One-sided</option>
                                <option value="Dvipusis">Two-sided</option>
                            </select>
                        </div>
                    </div>

                    {/* Additional Works Section */}
                    <div className="bg-gray-50 p-4 rounded-md border border-gray-200 space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700">Additional Works</label>
                            <div className="flex items-center gap-2">
                                <select
                                    className="text-xs border rounded p-1 max-w-[150px]"
                                    onChange={(e) => {
                                        addWork(e.target.value);
                                        e.target.value = '';
                                    }}
                                >
                                    <option value="">+ Add Work</option>
                                    {works.map((w) => (
                                        <option key={w.id} value={w.operation}>{w.operation} (€{w.cost_price}/u)</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {selectedWorks.length > 0 ? (
                            <div className="space-y-2">
                                {selectedWorks.map((work, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-sm bg-white p-2 rounded border border-gray-100">
                                        <span className="flex-1 font-medium text-gray-700">{work.name}</span>
                                        <div className="flex items-center gap-1">
                                            <label className="text-[10px] text-gray-400">Qty/Min:</label>
                                            <input
                                                type="number"
                                                value={work.duration}
                                                onChange={(e) => updateWorkDuration(idx, parseFloat(e.target.value))}
                                                className="w-16 border rounded px-1 py-0.5 text-right"
                                                step="0.1"
                                            />
                                        </div>
                                        <button type="button" onClick={() => removeWork(idx)} className="text-red-400 hover:text-red-600">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400 italic">No additional works selected.</p>
                        )}
                    </div>

                    {/* Price Preview & Adjustment Section */}
                    <div className="bg-gray-50 p-4 rounded-md border border-gray-200 mt-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={isManualPrice}
                                    onChange={(e) => setIsManualPrice(e.target.checked)}
                                    className="rounded border-gray-300 text-accent-teal focus:ring-accent-teal"
                                    aria-label="Toggle custom price override"
                                    title="Toggle custom price override"
                                />
                                Custom Price Override
                            </label>
                            {isManualPrice && (
                                <button
                                    type="button"
                                    onClick={() => setIsManualPrice(false)}
                                    className="text-[10px] text-accent-teal hover:underline font-bold"
                                >
                                    Reset to Auto
                                </button>
                            )}
                        </div>

                        <div className="flex justify-between items-center gap-4">
                            <div className="flex-1">
                                <label htmlFor="unit-price" className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Unit Price (€)</label>
                                <input
                                    id="unit-price"
                                    type="number"
                                    step="0.0001"
                                    value={unitPrice}
                                    onChange={(e) => {
                                        setUnitPrice(parseFloat(e.target.value) || 0);
                                        if (!isManualPrice) setIsManualPrice(true);
                                    }}
                                    placeholder="0.00"
                                    className={clsx(
                                        "w-full bg-white border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1",
                                        isManualPrice ? "border-accent-teal ring-accent-teal" : "border-gray-200"
                                    )}
                                />
                            </div>
                            <div className="text-right">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Total</label>
                                <span className="block text-2xl font-bold text-primary">€{totalPrice.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Margin Guard Warning */}
                        {marginPercent < 20 && marginPercent > -100 && totalPrice > 0 && (
                            <div className="flex items-start gap-2 text-xs bg-amber-50 text-amber-800 p-2 rounded border border-amber-200 mt-2 animate-in fade-in slide-in-from-top-1">
                                <div className="mt-0.5 text-amber-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                                </div>
                                <div>
                                    <span className="font-bold">Low Margin Warning:</span>
                                    <span className="ml-1">Current margin is only {marginPercent.toFixed(1)}%. Check if setup fees or extra works are missing.</span>
                                </div>
                            </div>
                        )}

                        {!isManualPrice && appliedRules.length > 0 && (
                            <div className="text-xs text-gray-500 border-t border-gray-200 pt-3">
                                <p className="font-semibold mb-1">Calculated via Rules:</p>
                                <ul className="list-disc pl-4 space-y-0.5 opacity-70">
                                    {appliedRules.map((rule: string, idx: number) => (
                                        <li key={idx}>{rule}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {isManualPrice && (
                            <div className="text-[10px] text-amber-600 font-medium bg-amber-50 p-2 rounded border border-amber-100 italic">
                                Manual price override active. Rules are ignored.
                            </div>
                        )}
                    </div>

                    {/* Cost Analysis toggle */}
                    <div className="mt-2 text-center">
                        <button
                            type="button"
                            onClick={() => setShowCostDetails(!showCostDetails)}
                            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 border border-transparent hover:border-gray-200 rounded px-2 py-1 transition-colors"
                        >
                            {showCostDetails ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            {showCostDetails ? 'Hide Cost Breakdown' : 'Show Profitability Analysis'}
                        </button>

                        {showCostDetails && (
                            <div className="mt-2 p-3 bg-slate-50 rounded border border-slate-200 text-xs text-slate-700 space-y-2 text-left animate-in fade-in zoom-in-95 duration-200">
                                <div className="flex justify-between font-medium">
                                    <span>Total Revenue:</span>
                                    <span>€{totalPrice.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-gray-500">
                                    <span>Total Cost:</span>
                                    <span>€{totalCost.toFixed(2)}</span>
                                </div>
                                <div className="border-t border-slate-200 my-1"></div>
                                <div className="flex justify-between font-bold text-emerald-700">
                                    <span>Profit:</span>
                                    <span>€{(totalPrice - totalCost).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span>Margin:</span>
                                    <span className={clsx(
                                        "font-bold px-1.5 py-0.5 rounded text-[10px]",
                                        marginPercent >= 30 ? "bg-emerald-100 text-emerald-800" :
                                            marginPercent >= 15 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"
                                    )}>
                                        {marginPercent}%
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || totalPrice === 0}
                            className="btn-accent flex items-center gap-2"
                        >
                            {loading && <Loader2 className="animate-spin" size={16} />}
                            {item ? 'Save Changes' : 'Add Item'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateOrderItemModal;
