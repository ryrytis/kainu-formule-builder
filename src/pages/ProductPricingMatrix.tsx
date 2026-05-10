import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Save, ArrowLeft, Loader2, Edit, Calculator, Tag } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { Database } from '../lib/database.types';
import CreateRuleModal, { RULE_TYPE_OPTIONS } from '../components/CreateRuleModal';

type PricingMatrixRow = Database['public']['Tables']['product_pricing_matrices']['Row'];
type PricingMatrixInsert = Database['public']['Tables']['product_pricing_matrices']['Insert'];

const ProductPricingMatrix: React.FC = () => {
    const { id: productId } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // State
    const [productName, setProductName] = useState('Loading...');
    const [productCategory, setProductCategory] = useState('');
    const [rows, setRows] = useState<PricingMatrixRow[]>([]);
    const [rules, setRules] = useState<any[]>([]);
    const [materials, setMaterials] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Modal State
    const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
    const [selectedRule, setSelectedRule] = useState<any | null>(null);

    // New Row State
    const [newRow, setNewRow] = useState<Partial<PricingMatrixInsert>>({
        quantity_from: 100,
        price: 0,
        print_type: '4+0',
        lamination: 'None',
        material_id: '',
        extra_works: []
    });

    useEffect(() => {
        if (productId) {
            fetchInitialData();
        }
    }, [productId]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Product
            const { data: prod } = await supabase
                .from('products')
                .select('name, category')
                .eq('id', productId || '')
                .single();

            if (prod) {
                setProductName((prod as any).name);
                setProductCategory((prod as any).category || '');
            }

            // 2. Fetch Materials
            const { data: mats } = await supabase.from('materials').select('id, name').order('name');
            if (mats) setMaterials(mats);

            // 3. Fetch Existing Matrix Rows
            await fetchMatrixRows();

            // 4. Fetch Rules
            if (prod) {
                await fetchRules((prod as any).category);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMatrixRows = async () => {
        if (!productId) return;
        const { data } = await supabase
            .from('product_pricing_matrices')
            .select(`
                *,
                materials (name)
            `)
            .eq('product_id', productId)
            .order('quantity_from', { ascending: true });

        if (data) setRows(data as any[]);
    };

    const fetchRules = async (category?: string) => {
        if (!productId) return;
        
        const { data } = await supabase
            .from('calculation_rules')
            .select('*')
            .or(`product_id.eq.${productId},product_ids.cs.{${productId}}${category ? `,product_category.eq.${category},product_categories.cs.{${category}}` : ''}`)
            .eq('is_active', true)
            .order('priority', { ascending: false });

        if (data) setRules(data);
    };

    const handleAddRow = async () => {
        if (!productId) return;
        setSaving(true);
        try {
            const payload: any = {
                product_id: productId,
                quantity_from: newRow.quantity_from || 0,
                quantity_to: newRow.quantity_to || null,
                price: newRow.price || 0,
                print_type: newRow.print_type,
                lamination: newRow.lamination,
                material_id: newRow.material_id || null,
                extra_works: newRow.extra_works || []
            };

            const { error } = await supabase.from('product_pricing_matrices').insert([payload] as any);

            if (error) throw error;

            // Reset and Refresh
            fetchMatrixRows();
            setNewRow({
                ...newRow,
                price: 0 // Reset price but keep settings for easier bulk entry
            });
        } catch (error) {
            console.error('Error adding row:', error);
            alert('Failed to add pricing rule');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteRow = async (rowId: string) => {
        if (!window.confirm('Delete this pricing rule?')) return;
        const { error } = await supabase.from('product_pricing_matrices').delete().eq('id', rowId);
        if (!error) fetchMatrixRows();
    };

    const handleDeleteRule = async (ruleId: string) => {
        if (!window.confirm('Delete this calculation rule?')) return;
        const { error } = await supabase.from('calculation_rules').delete().eq('id', ruleId);
        if (!error) fetchRules(productCategory);
    };

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-accent-teal" size={32} /></div>;

    return (
        <div className="space-y-10 animate-in fade-in duration-300 pb-20">
            {/* Header */}
            <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                <button onClick={() => navigate('/products')} className="p-2 hover:bg-gray-100 rounded-full transition-colors" title="Back to Products">
                    <ArrowLeft size={20} className="text-gray-500" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-primary">Pricing & Rules: {productName}</h1>
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                        Configure fixed price points and automated BOM calculation logic.
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-[10px] font-bold text-gray-600 uppercase tracking-wider border border-gray-200">
                            Category: {productCategory || 'Uncategorized'}
                        </span>
                    </p>
                </div>
            </div>

            {/* Section 1: Fixed Matrix Pricing */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-primary flex items-center gap-2 uppercase tracking-wide">
                        <Save size={18} className="text-blue-500" />
                        Fixed Pricing Matrix
                    </h2>
                    <span className="text-xs text-gray-400">Overrides all automatic rules for these specific quantities</span>
                </div>

                {/* Quick Add Form */}
                <div className="card p-6 border-l-4 border-blue-500 bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-end">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Min Qty</label>
                            <input
                                type="number"
                                className="w-full border p-2 rounded focus:border-blue-500 outline-none text-sm"
                                value={newRow.quantity_from}
                                onChange={e => setNewRow({ ...newRow, quantity_from: parseInt(e.target.value) })}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Max Qty</label>
                            <input
                                type="number"
                                className="w-full border p-2 rounded focus:border-blue-500 outline-none text-sm"
                                placeholder="∞"
                                value={newRow.quantity_to || ''}
                                onChange={e => setNewRow({ ...newRow, quantity_to: e.target.value ? parseInt(e.target.value) : null })}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Print</label>
                            <select
                                className="w-full border p-2 rounded focus:border-blue-500 outline-none text-sm"
                                value={newRow.print_type || ''}
                                onChange={e => setNewRow({ ...newRow, print_type: e.target.value })}
                            >
                                <option value="4+0">4+0</option>
                                <option value="4+4">4+4</option>
                                <option value="1+0">1+0</option>
                                <option value="1+1">1+1</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Lamination</label>
                            <select
                                className="w-full border p-2 rounded focus:border-blue-500 outline-none text-sm"
                                value={newRow.lamination || ''}
                                onChange={e => setNewRow({ ...newRow, lamination: e.target.value })}
                            >
                                <option value="None">None</option>
                                <option value="Matte">Matte</option>
                                <option value="Gloss">Gloss</option>
                                <option value="SoftTouch">SoftTouch</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Material</label>
                            <select
                                className="w-full border p-2 rounded focus:border-blue-500 outline-none text-sm"
                                value={newRow.material_id || ''}
                                onChange={e => setNewRow({ ...newRow, material_id: e.target.value })}
                            >
                                <option value="">-- Any --</option>
                                {materials.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Total Price (€)</label>
                            <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">€</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="w-full border p-2 pl-5 rounded focus:border-blue-500 outline-none font-bold text-gray-800 text-sm"
                                    value={newRow.price}
                                    onChange={e => setNewRow({ ...newRow, price: parseFloat(e.target.value) })}
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleAddRow}
                            disabled={saving}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded font-bold py-2 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                            <span>Add</span>
                        </button>
                    </div>
                </div>

                {/* Matrix Table */}
                <div className="card overflow-hidden bg-white shadow-sm border border-gray-100">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                            <tr>
                                <th className="p-4 border-b">Qty Range</th>
                                <th className="p-4 border-b">Config</th>
                                <th className="p-4 border-b text-right">Fixed Price</th>
                                <th className="p-4 border-b text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-sm">
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-12 text-center text-gray-400 italic bg-gray-50/50">
                                        No manual price points. Automatic rules will be used.
                                    </td>
                                </tr>
                            ) : (
                                rows.map(row => (
                                    <tr key={row.id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="p-4 font-bold text-gray-700">
                                            {row.quantity_from}{row.quantity_to ? ` - ${row.quantity_to}` : '+'} units
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                                                    {row.print_type || 'Any Print'}
                                                </span>
                                                {row.lamination && row.lamination !== 'None' && (
                                                    <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 text-xs font-medium border border-purple-100">
                                                        {row.lamination}
                                                    </span>
                                                )}
                                                {(row as any).materials?.name && (
                                                    <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100">
                                                        {(row as any).materials.name}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right font-bold text-blue-600">
                                            €{row.price.toFixed(2)}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => handleDeleteRow(row.id)}
                                                className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Section 2: Automated BOM & Adjustments */}
            <section className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-primary flex items-center gap-2 uppercase tracking-wide">
                        <Calculator size={18} className="text-accent-teal" />
                        Active Calculation Rules (BOM)
                    </h2>
                    <button 
                        onClick={() => { setSelectedRule(null); setIsRuleModalOpen(true); }}
                        className="btn-accent py-1.5 px-3 text-xs flex items-center gap-2"
                    >
                        <Plus size={14} /> New Rule
                    </button>
                </div>

                <div className="card overflow-hidden bg-white shadow-sm border border-gray-100">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                            <tr>
                                <th className="p-4 border-b">Scope</th>
                                <th className="p-4 border-b">Rule Type</th>
                                <th className="p-4 border-b">Name</th>
                                <th className="p-4 border-b text-right">Value</th>
                                <th className="p-4 border-b text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-sm">
                            {rules.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-gray-400 italic bg-gray-50/50">
                                        No active BOM or adjustment rules for this product.
                                    </td>
                                </tr>
                            ) : (
                                rules.map(rule => (
                                    <tr key={rule.id} className="hover:bg-teal-50/30 transition-colors group">
                                        <td className="p-4">
                                            {rule.product_id ? (
                                                <span className="flex items-center gap-1.5 text-blue-600 font-bold">
                                                    <Save size={12} /> Product
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-purple-600 font-bold">
                                                    <Tag size={12} /> Category
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-xs font-medium text-gray-500">
                                            {RULE_TYPE_OPTIONS.find(o => o.value === rule.rule_type)?.label || rule.rule_type}
                                        </td>
                                        <td className="p-4 font-medium text-gray-700">
                                            {rule.name}
                                            {rule.min_quantity && (
                                                <span className="ml-2 text-[10px] text-gray-400 bg-gray-100 px-1 rounded">
                                                    {rule.min_quantity}+ units
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right font-mono font-bold text-accent-teal">
                                            {rule.value % 1 === 0 ? rule.value : rule.value.toFixed(4)}
                                            <span className="text-[10px] ml-0.5">
                                                {rule.rule_type.includes('%') || rule.rule_type.includes('Adjustment') ? '%' : 
                                                 rule.rule_type.includes('multiplier') || rule.rule_type.includes('Margin') ? '×' : '€'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => { setSelectedRule(rule); setIsRuleModalOpen(true); }}
                                                    className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteRule(rule.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <CreateRuleModal 
                isOpen={isRuleModalOpen}
                onClose={() => { setIsRuleModalOpen(false); setSelectedRule(null); }}
                onSuccess={() => fetchRules(productCategory)}
                ruleToEdit={selectedRule}
                initialProductId={productId}
                initialCategory={productCategory}
            />
        </div>
    );
};

export default ProductPricingMatrix;

