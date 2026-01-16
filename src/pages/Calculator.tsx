import React, { useState, useEffect } from 'react';
import { PricingService } from '../lib/PricingService';
import { supabase } from '../lib/supabase';
import { Loader2, Calculator as CalculatorIcon, RefreshCw, Plus } from 'lucide-react';
import CreateOrderModal from '../components/CreateOrderModal';

const Calculator: React.FC = () => {
    const [products, setProducts] = useState<any[]>([]);
    const [materials, setMaterials] = useState<any[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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
    const [appliedRules, setAppliedRules] = useState<string[]>([]);
    const [isCalculating, setIsCalculating] = useState(false);

    useEffect(() => {
        fetchProducts();
        fetchMaterials();
    }, []);

    // Auto-calculate price when dependencies change
    useEffect(() => {
        const calculate = async () => {
            if (!productId) {
                setUnitPrice(0);
                setTotalPrice(0);
                setAppliedRules([]);
                return;
            }

            setIsCalculating(true);
            try {
                const result = await PricingService.calculatePrice({
                    product_id: productId,
                    quantity: quantity,
                    material_id: materialId,
                    width: width ? parseFloat(width) : undefined,
                    height: height ? parseFloat(height) : undefined
                    // lamination: 'None' 
                });

                setUnitPrice(result.unit_price);
                setTotalPrice(result.total_price);
                setAppliedRules(result.applied_rules);
            } catch (err) {
                console.error("Calculation failed", err);
            } finally {
                setIsCalculating(false);
            }
        };

        const debounce = setTimeout(calculate, 500);
        return () => clearTimeout(debounce);
    }, [productId, quantity, materialId, width, height, printType]);

    const fetchProducts = async () => {
        const { data } = await (supabase as any).from('products').select('*').order('name');
        if (data) setProducts(data);
    };

    const fetchMaterials = async () => {
        const { data } = await supabase.from('materials').select('*').order('name');
        if (data) setMaterials(data);
    };

    const handleReset = () => {
        setProductId('');
        setMaterialId('');
        setQuantity(1);
        setWidth('');
        setHeight('');
        setPrintType('Vienpusis');
        setUnitPrice(0);
        setTotalPrice(0);
        setAppliedRules([]);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-primary flex items-center gap-3">
                        <CalculatorIcon className="text-accent-teal" />
                        Price Calculator
                    </h1>
                    <p className="text-gray-500 mt-1">Quickly estimate print costs without creating an order.</p>
                </div>
                <button
                    onClick={handleReset}
                    className="btn-secondary flex items-center gap-2"
                >
                    <RefreshCw size={16} /> Reset
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Configuration Form */}
                <div className="lg:col-span-2 card">
                    <h3 className="section-title mb-6">Configuration</h3>
                    <div className="space-y-6">
                        <div>
                            <label htmlFor="calculator-product" className="block text-sm font-medium text-gray-700 mb-1">
                                Product Type
                            </label>
                            <select
                                id="calculator-product"
                                value={productId}
                                onChange={(e) => setProductId(e.target.value)}
                                className="input-field"
                            >
                                <option value="">Select Product...</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="calculator-material" className="block text-sm font-medium text-gray-700 mb-1">
                                Material / Paper
                            </label>
                            <select
                                id="calculator-material"
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

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="calculator-width" className="block text-sm font-medium text-gray-700 mb-1">
                                    Width (mm)
                                </label>
                                <input
                                    id="calculator-width"
                                    type="text"
                                    value={width}
                                    onChange={(e) => setWidth(e.target.value)}
                                    className="input-field"
                                    placeholder="e.g. 210"
                                />
                            </div>
                            <div>
                                <label htmlFor="calculator-height" className="block text-sm font-medium text-gray-700 mb-1">
                                    Height (mm)
                                </label>
                                <input
                                    id="calculator-height"
                                    type="text"
                                    value={height}
                                    onChange={(e) => setHeight(e.target.value)}
                                    className="input-field"
                                    placeholder="e.g. 297"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="calculator-quantity" className="block text-sm font-medium text-gray-700 mb-1">
                                    Quantity
                                </label>
                                <input
                                    id="calculator-quantity"
                                    type="number"
                                    min="1"
                                    value={quantity}
                                    onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                                    className="input-field"
                                />
                            </div>
                            <div>
                                <label htmlFor="calculator-print-type" className="block text-sm font-medium text-gray-700 mb-1">
                                    Print Type
                                </label>
                                <select
                                    id="calculator-print-type"
                                    value={printType}
                                    onChange={(e) => setPrintType(e.target.value)}
                                    className="input-field"
                                >
                                    <option value="Vienpusis">One-sided</option>
                                    <option value="Dvipusis">Two-sided</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ... Results Panel ... */}
                <div className="card h-fit bg-gray-50 border-gray-200">
                    <h3 className="section-title mb-4 text-gray-800">Estimated Cost</h3>

                    <div className="space-y-4">
                        <div className="flex justify-between items-baseline">
                            <span className="text-gray-500">Unit Price</span>
                            {isCalculating ? (
                                <Loader2 className="animate-spin text-accent-teal" size={16} />
                            ) : (
                                <span className="text-lg font-medium text-gray-900">€{unitPrice.toFixed(4)}</span>
                            )}
                        </div>

                        <div className="flex justify-between items-baseline pt-4 border-t border-gray-200">
                            <span className="text-lg font-bold text-gray-700">Total</span>
                            {isCalculating ? (
                                <Loader2 className="animate-spin text-accent-teal" size={24} />
                            ) : (
                                <span className="text-3xl font-bold text-accent-teal">€{totalPrice.toFixed(2)}</span>
                            )}
                        </div>
                    </div>

                    {/* ... Applied Rules ... */}
                    {appliedRules.length > 0 && (
                        <div className="mt-8 pt-4 border-t border-gray-200">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Applied Rules</p>
                            <ul className="space-y-2">
                                {appliedRules.map((rule, idx) => (
                                    <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent-lime shrink-0"></span>
                                        {rule}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Create Order Button */}
                    <div className="mt-8 pt-4 border-t border-gray-200">
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            disabled={isCalculating || totalPrice <= 0}
                            className="w-full btn-primary flex items-center justify-center gap-2 py-3"
                        >
                            <Plus size={20} />
                            Create Order
                        </button>
                    </div>

                    {!productId && (
                        <div className="mt-6 p-3 bg-amber-50 text-amber-700 text-sm rounded-md border border-amber-100">
                            Select a product to see pricing.
                        </div>
                    )}
                </div>
            </div>

            <CreateOrderModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onOrderCreated={() => { }} // No list refresh needed here
                initialItem={
                    productId ? {
                        product_id: productId, // Added product_id
                        product_type: products.find(p => p.id === productId)?.name || '',
                        material_id: materialId,
                        width: width ? parseFloat(width) : 0,
                        height: height ? parseFloat(height) : 0,
                        quantity: quantity,
                        print_type: printType,
                        unit_price: unitPrice,
                        total_price: totalPrice
                    } : undefined
                }
            />
        </div>
    );
};

// ... imports need to include CreateOrderModal and Plus ...
// I will need to verify imports in a separate step or assume I can add them.
// Wait, I can't easily add top-level imports with replace_file_content if I don't target them.
// I should confirm imports first.

export default Calculator;
