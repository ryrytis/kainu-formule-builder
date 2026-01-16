import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Save, ArrowLeft, Loader2 } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { Database } from '../lib/database.types';

type PricingMatrixRow = Database['public']['Tables']['product_pricing_matrices']['Row'];
type PricingMatrixInsert = Database['public']['Tables']['product_pricing_matrices']['Insert'];

const ProductPricingMatrix: React.FC = () => {
    const { id: productId } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // State
    const [productName, setProductName] = useState('Loading...');
    const [rows, setRows] = useState<PricingMatrixRow[]>([]);
    const [materials, setMaterials] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

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
            // 1. Fetch Product Name
            const { data: prod } = await supabase
                .from('products')
                .select('name')
                .eq('id', productId || '')
                .single();

            if (prod) setProductName((prod as any).name);

            // 2. Fetch Materials
            const { data: mats } = await supabase.from('materials').select('id, name').order('name');
            if (mats) setMaterials(mats);

            // 3. Fetch Existing Matrix Rows
            fetchMatrixRows();
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

    if (loading) return <div className="p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                <button onClick={() => navigate('/products')} className="p-2 hover:bg-gray-100 rounded-full transition-colors" title="Back to Products">
                    <ArrowLeft size={20} className="text-gray-500" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-primary">Pricing Matrix: {productName}</h1>
                    <p className="text-sm text-gray-500">Define specific price points for {productName} based on configuration.</p>
                </div>
            </div>

            {/* Quick Add Form */}
            <div className="card p-6 border-l-4 border-accent-teal">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Plus size={18} className="text-accent-teal" />
                    Add New Price Point
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">

                    {/* Quantity From */}
                    <div className="space-y-1">
                        <label htmlFor="qty-from-input" className="text-xs font-bold text-gray-500 uppercase">Min Qty</label>
                        <input
                            id="qty-from-input"
                            type="number"
                            className="w-full border p-2 rounded focus:border-accent-teal outline-none"
                            placeholder="e.g. 100"
                            value={newRow.quantity_from}
                            onChange={e => setNewRow({ ...newRow, quantity_from: parseInt(e.target.value) })}
                        />
                    </div>

                    {/* Quantity To */}
                    <div className="space-y-1">
                        <label htmlFor="qty-to-input" className="text-xs font-bold text-gray-500 uppercase">Max Qty</label>
                        <input
                            id="qty-to-input"
                            type="number"
                            className="w-full border p-2 rounded focus:border-accent-teal outline-none"
                            placeholder="empty = ∞"
                            value={newRow.quantity_to || ''}
                            onChange={e => setNewRow({ ...newRow, quantity_to: e.target.value ? parseInt(e.target.value) : null })}
                        />
                    </div>

                    {/* Print Type */}
                    <div className="space-y-1">
                        <label htmlFor="print-type-select" className="text-xs font-bold text-gray-500 uppercase">Print Side</label>
                        <select
                            id="print-type-select"
                            className="w-full border p-2 rounded focus:border-accent-teal outline-none"
                            value={newRow.print_type || ''}
                            onChange={e => setNewRow({ ...newRow, print_type: e.target.value })}
                        >
                            <option value="4+0">4+0 (One Side)</option>
                            <option value="4+4">4+4 (Two Sided)</option>
                            <option value="1+0">1+0 (B&W One Side)</option>
                            <option value="1+1">1+1 (B&W Two Sided)</option>
                        </select>
                    </div>

                    {/* Lamination */}
                    <div className="space-y-1">
                        <label htmlFor="lamination-select" className="text-xs font-bold text-gray-500 uppercase">Lamination</label>
                        <select
                            id="lamination-select"
                            className="w-full border p-2 rounded focus:border-accent-teal outline-none"
                            value={newRow.lamination || ''}
                            onChange={e => setNewRow({ ...newRow, lamination: e.target.value })}
                        >
                            <option value="None">None</option>
                            <option value="Matte">Matte</option>
                            <option value="Gloss">Gloss</option>
                            <option value="SoftTouch">SoftTouch</option>
                        </select>
                    </div>

                    {/* Material */}
                    <div className="space-y-1 col-span-1 md:col-span-1">
                        <label htmlFor="material-select" className="text-xs font-bold text-gray-500 uppercase">Material</label>
                        <select
                            id="material-select"
                            className="w-full border p-2 rounded focus:border-accent-teal outline-none text-sm"
                            value={newRow.material_id || ''}
                            onChange={e => setNewRow({ ...newRow, material_id: e.target.value })}
                        >
                            <option value="">-- Any --</option>
                            {materials.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Price */}
                    <div className="space-y-1">
                        <label htmlFor="price-input" className="text-xs font-bold text-gray-500 uppercase">Total Price (€)</label>
                        <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                            <input
                                id="price-input"
                                type="number"
                                step="0.01"
                                className="w-full border p-2 pl-6 rounded focus:border-accent-teal outline-none font-bold text-gray-800"
                                placeholder="0.00"
                                value={newRow.price}
                                onChange={e => setNewRow({ ...newRow, price: parseFloat(e.target.value) })}
                            />
                        </div>
                    </div>

                    {/* Add Button */}
                    <div className="md:col-span-1 col-span-1">
                        <button
                            onClick={handleAddRow}
                            disabled={saving}
                            className="w-full btn-accent flex items-center justify-center gap-2 h-[42px]"
                            title="Save Pricing Rule"
                        >
                            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            <span>Add</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Matrix Table */}
            <div className="card overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
                        <tr>
                            <th className="p-4">Qty</th>
                            <th className="p-4">Configuration</th>
                            <th className="p-4">Material</th>
                            <th className="p-4 text-right">Price</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-400">
                                    No pricing rules defined yet. Add one above!
                                </td>
                            </tr>
                        ) : (
                            rows.map(row => (
                                <tr key={row.id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="p-4 font-bold text-gray-700">
                                        {row.quantity_from}
                                        {row.quantity_to ? ` - ${row.quantity_to}` : '+'}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="badge bg-blue-50 text-blue-700 border-blue-100">
                                                {row.print_type || 'Any Print'}
                                            </span>
                                            {row.lamination && row.lamination !== 'None' && (
                                                <span className="badge bg-purple-50 text-purple-700 border-purple-100">
                                                    {row.lamination}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-gray-600">
                                        {(row as any).materials?.name || <span className="text-gray-400 italic">Any Material</span>}
                                    </td>
                                    <td className="p-4 text-right font-bold text-lg text-accent-teal font-mono">
                                        €{row.price.toFixed(2)}
                                    </td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => handleDeleteRow(row.id)}
                                            className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Delete Rule"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ProductPricingMatrix;
