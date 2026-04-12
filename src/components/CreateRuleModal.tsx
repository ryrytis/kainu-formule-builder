import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Loader2, Info } from 'lucide-react';
import { RULE_TYPES } from '../lib/PricingService';

interface Rule {
    id: string;
    rule_type: string;
    name: string;
    description: string;
    priority: number;
    is_active: boolean;
    value: number;
    product_id: string | null;
    lamination: string | null;
    extra_name: string | null;
    min_quantity: number | null;
    max_quantity: number | null;
}

interface Product {
    id: string;
    name: string;
}

interface CreateRuleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    ruleToEdit?: Rule | null;
}

const RULE_TYPE_OPTIONS = [
    { value: RULE_TYPES.BASE_PRICE_100, label: 'Base Price (€ per 100 pcs)', hint: 'E.g. €9 per 100 business cards' },
    { value: RULE_TYPES.EXTRA_COST_UNIT, label: 'Extra Cost (€ per unit)', hint: 'Lamination, foil, embossing — priced per piece' },
    { value: RULE_TYPES.EXTRA_COST_FLAT, label: 'Extra Cost (flat fee €)', hint: 'Setup fees, design — fixed amount' },
    { value: RULE_TYPES.EXTRA_COST_SHEET, label: 'Extra Cost (€ per sheet)', hint: 'Divided by items per sheet (e.g. cliché cost)' },
    { value: RULE_TYPES.QTY_ADJUSTMENT, label: 'Qty Adjustment (± %)', hint: '+10 = surcharge for small qty, -5 = discount for large' },
    { value: RULE_TYPES.CLIENT_DISCOUNT, label: 'Client Discount (multiplier)', hint: '0.9 = 10% off for this client' },
    { value: RULE_TYPES.SHEET_SETUP_WASTE, label: 'Sheet Setup Waste (%)', hint: 'Default is 20 if not set. Enter 15 for 15% etc.' },
];

const CreateRuleModal: React.FC<CreateRuleModalProps> = ({ isOpen, onClose, onSuccess, ruleToEdit }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [formData, setFormData] = useState({
        rule_type: RULE_TYPES.BASE_PRICE_100 as string,
        name: '',
        description: '',
        priority: 10,
        is_active: true,
        value: 0,
        product_ids: [] as string[],
        lamination: '',
        extra_name: '',
        min_quantity: '' as any,
        max_quantity: '' as any
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        const { data } = await supabase.from('products' as any).select('id, name').order('name');
        if (data) setProducts(data);
    };

    useEffect(() => {
        if (ruleToEdit) {
            setFormData({
                rule_type: ruleToEdit.rule_type || RULE_TYPES.BASE_PRICE_100,
                name: ruleToEdit.name || '',
                description: ruleToEdit.description || '',
                priority: ruleToEdit.priority || 10,
                is_active: ruleToEdit.is_active ?? true,
                value: ruleToEdit.value || 0,
                product_ids: ruleToEdit.product_id ? [ruleToEdit.product_id] : [],
                lamination: ruleToEdit.lamination || '',
                extra_name: ruleToEdit.extra_name || '',
                min_quantity: ruleToEdit.min_quantity || '',
                max_quantity: ruleToEdit.max_quantity || ''
            });
        } else {
            setFormData({
                rule_type: RULE_TYPES.BASE_PRICE_100,
                name: '',
                description: '',
                priority: 10,
                is_active: true,
                value: 0,
                product_ids: [],
                lamination: '',
                extra_name: '',
                min_quantity: '',
                max_quantity: ''
            });
        }
    }, [ruleToEdit, isOpen]);

    const isExtraType = formData.rule_type === RULE_TYPES.EXTRA_COST_UNIT ||
        formData.rule_type === RULE_TYPES.EXTRA_COST_SHEET ||
        formData.rule_type === RULE_TYPES.EXTRA_COST_FLAT;
    const isQtyAdj = formData.rule_type === RULE_TYPES.QTY_ADJUSTMENT;
    const isSetupWaste = formData.rule_type === RULE_TYPES.SHEET_SETUP_WASTE;
    const needsQtyRange = isQtyAdj || isSetupWaste || formData.rule_type === RULE_TYPES.BASE_PRICE_100;

    const getValueLabel = () => {
        switch (formData.rule_type) {
            case RULE_TYPES.QTY_ADJUSTMENT:
                return 'Adjustment (%) — use + for surcharge, - for discount';
            case RULE_TYPES.CLIENT_DISCOUNT:
                return 'Multiplier (e.g. 0.9 = 10% off)';
            case RULE_TYPES.EXTRA_COST_FLAT:
                return 'Flat Fee (€)';
            case RULE_TYPES.SHEET_SETUP_WASTE:
                return 'Setup Waste (%)';
            case RULE_TYPES.EXTRA_COST_SHEET:
                return 'Price per sheet (€)';
            case RULE_TYPES.EXTRA_COST_UNIT:
                return 'Price per unit (€)';
            default:
                return 'Price per 100 pcs (€)';
        }
    };

    const getValueHint = () => {
        switch (formData.rule_type) {
            case RULE_TYPES.QTY_ADJUSTMENT:
                return 'E.g.: +10 for 50 pcs means 10% surcharge. -5 for 200 pcs means 5% discount.';
            case RULE_TYPES.EXTRA_COST_UNIT:
                return 'E.g.: 0.03 = €0.03 per piece for lamination';
            case RULE_TYPES.SHEET_SETUP_WASTE:
                return 'E.g.: 15 = 15% setup waste added for sheets';
            case RULE_TYPES.EXTRA_COST_SHEET:
                return 'E.g.: 5.00 = €5 per sheet (divided by items on sheet)';
            default:
                return '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const basePayload: any = { ...formData };
            delete basePayload.product_ids;

            if (!basePayload.lamination) basePayload.lamination = null;
            if (!basePayload.extra_name) basePayload.extra_name = null;
            if (basePayload.min_quantity === '') basePayload.min_quantity = null;
            if (basePayload.max_quantity === '') basePayload.max_quantity = null;

            if (ruleToEdit) {
                const payload = { ...basePayload, product_id: formData.product_ids[0] || null };
                const { error } = await (supabase as any)
                    .from('calculation_rules')
                    .update(payload)
                    .eq('id', ruleToEdit.id);
                if (error) throw error;
            } else {
                const productsToInsert = formData.product_ids.length > 0 ? formData.product_ids : [null];
                const payloads = productsToInsert.map(pid => ({
                    ...basePayload,
                    product_id: pid
                }));

                const { error } = await (supabase as any)
                    .from('calculation_rules')
                    .insert(payloads);
                if (error) throw error;
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving rule:', error);
            alert('Failed to save rule');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/80 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-primary">
                        {ruleToEdit ? 'Edit Rule' : 'New Calculation Rule'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors" aria-label="Close">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
                    {/* Rule Type */}
                    <div className="space-y-1">
                        <label htmlFor="rule-type" className="text-xs font-bold text-gray-500 uppercase">Rule Type</label>
                        <select
                            id="rule-type"
                            value={formData.rule_type}
                            onChange={e => setFormData({ ...formData, rule_type: e.target.value })}
                            className="w-full border-b-2 border-gray-200 p-2 focus:border-accent-teal outline-none transition-colors"
                        >
                            {RULE_TYPE_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-400 mt-1">
                            {RULE_TYPE_OPTIONS.find(o => o.value === formData.rule_type)?.hint}
                        </p>
                    </div>

                    {/* Value + Name */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label htmlFor="rule-value" className="text-xs font-bold text-gray-500 uppercase">
                                {getValueLabel()}
                            </label>
                            <input
                                id="rule-value"
                                required
                                type="number"
                                step="0.0001"
                                value={formData.value}
                                onChange={e => setFormData({ ...formData, value: parseFloat(e.target.value) })}
                                className="w-full border-b-2 border-gray-200 p-2 focus:border-accent-teal outline-none transition-colors font-mono"
                            />
                            {getValueHint() && <p className="text-xs text-amber-600 mt-1">{getValueHint()}</p>}
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Rule Name</label>
                            <input
                                required
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full border-b-2 border-gray-200 p-2 focus:border-accent-teal outline-none transition-colors"
                                placeholder="e.g. Business Cards Base Price"
                            />
                        </div>
                    </div>

                    {/* Extra Name — only for Extra Cost types */}
                    {isExtraType && (
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">
                                Extra Name
                                <span className="text-gray-400 normal-case ml-1">(shown in calculator as toggle)</span>
                            </label>
                            <input
                                required
                                type="text"
                                value={formData.extra_name}
                                onChange={e => setFormData({ ...formData, extra_name: e.target.value })}
                                className="w-full border-b-2 border-gray-200 p-2 focus:border-accent-teal outline-none transition-colors"
                                placeholder="e.g. Matt Lamination, Foil, Rounded Corners, Embossing"
                            />
                        </div>
                    )}

                    {/* Conditions */}
                    <div className="bg-gray-50 p-4 border border-gray-200 rounded-sm space-y-4">
                        <h3 className="font-bold text-sm text-primary uppercase flex items-center gap-2">
                            <Info size={16} /> Conditions (Optional)
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label htmlFor="rule-product" className="text-xs font-bold text-gray-500 uppercase">Product(s)</label>
                                <select
                                    id="rule-product"
                                    multiple
                                    size={4}
                                    value={formData.product_ids}
                                    onChange={e => {
                                        const options = Array.from(e.target.selectedOptions, option => option.value);
                                        // If "All Products" is selected, clear other selections
                                        if (options.includes("")) {
                                            setFormData({ ...formData, product_ids: [] });
                                        } else {
                                            setFormData({ ...formData, product_ids: options });
                                        }
                                    }}
                                    className="w-full border p-2 bg-white form-multiselect rounded transition-colors"
                                >
                                    <option value="" className="font-bold border-b mb-1 pb-1">-- Apply to All Products --</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id} className="py-0.5">{p.name}</option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-gray-400">Ctrl+Click (Cmd+Click) to select multiple</p>
                            </div>
                            {isExtraType && (
                                <div className="space-y-1">
                                    <label htmlFor="rule-lamination" className="text-xs font-bold text-gray-500 uppercase">Lamination Match</label>
                                    <select
                                        id="rule-lamination"
                                        value={formData.lamination}
                                        onChange={e => setFormData({ ...formData, lamination: e.target.value })}
                                        className="w-full border p-2 bg-white"
                                    >
                                        <option value="">-- Any --</option>
                                        <option value="Matt">Matt</option>
                                        <option value="Gloss">Gloss</option>
                                        <option value="SoftTouch">SoftTouch</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        {needsQtyRange && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Min Quantity</label>
                                    <input
                                        type="number"
                                        value={formData.min_quantity}
                                        onChange={e => setFormData({ ...formData, min_quantity: e.target.value as any })}
                                        className="w-full border p-2 bg-white"
                                        placeholder="e.g. 50"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Max Quantity</label>
                                    <input
                                        type="number"
                                        value={formData.max_quantity}
                                        onChange={e => setFormData({ ...formData, max_quantity: e.target.value as any })}
                                        className="w-full border p-2 bg-white"
                                        placeholder="e.g. 99"
                                    />
                                </div>
                            </div>
                        )}

                        {isQtyAdj && (
                            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800">
                                <strong>Tip:</strong> Create multiple Qty Adjustment rules for different ranges.
                                E.g.: 1–99 → <code>+10</code>, 100–199 → <code>0</code>, 200–499 → <code>-5</code>, 500+ → <code>-10</code>
                            </div>
                        )}
                    </div>

                    {/* Priority + Active */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label htmlFor="rule-priority" className="text-xs font-bold text-gray-500 uppercase">Priority (Higher = first)</label>
                            <input
                                id="rule-priority"
                                required
                                type="number"
                                value={formData.priority}
                                onChange={e => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                                className="w-full border-b-2 border-gray-200 p-2 focus:border-accent-teal outline-none transition-colors"
                            />
                        </div>
                        <div className="flex items-center pt-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.is_active}
                                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="w-5 h-5 text-accent-teal rounded focus:ring-accent-teal"
                                />
                                <span className="font-bold text-gray-700">Rule Active</span>
                            </label>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Internal Note</label>
                        <textarea
                            rows={2}
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full border-2 border-gray-200 p-3 focus:border-accent-teal outline-none transition-colors resize-none"
                            placeholder="Why does this rule exist..."
                        />
                    </div>
                </form>

                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-3 text-sm font-bold uppercase text-gray-500 hover:bg-gray-200 transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="btn-accent flex items-center gap-2"
                    >
                        {loading && <Loader2 className="animate-spin" size={16} />}
                        Save Rule
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateRuleModal;
