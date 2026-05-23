import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Loader2 } from 'lucide-react';

interface CreateMaterialModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    materialToEdit?: any | null;
}

const CreateMaterialModal: React.FC<CreateMaterialModalProps> = ({ isOpen, onClose, onSuccess, materialToEdit }) => {
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<string[]>(['Paper', 'Ink', 'Packaging', 'Plates', 'Other']);
    const [isCustomCategory, setIsCustomCategory] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: 'Paper',
        unit_price: '',
        current_stock: '',
        unit: 'pcs',
        click_cost_per_m2: '' as string,
        width: '',
        height: ''
    });

    useEffect(() => {
        const fetchCategories = async () => {
            const { data } = await supabase.from('materials').select('category');
            if (data) {
                const dbCategories = (data as any[]).map(item => item.category).filter(Boolean);
                const uniqueCategories = Array.from(new Set([
                    'Paper', 'Ink', 'Packaging', 'Plates', 'Other',
                    ...dbCategories
                ]));
                setCategories(uniqueCategories.sort());
            }
        };
        fetchCategories();
    }, []);

    useEffect(() => {
        if (materialToEdit) {
            setFormData({
                name: materialToEdit.name || '',
                description: materialToEdit.description || '',
                category: materialToEdit.category || 'Paper',
                unit_price: materialToEdit.unit_price?.toString() || '',
                current_stock: materialToEdit.current_stock?.toString() || '',
                unit: materialToEdit.unit || 'pcs',
                click_cost_per_m2: materialToEdit.click_cost_per_m2?.toString() || '',
                width: materialToEdit.width?.toString() || '',
                height: materialToEdit.height?.toString() || ''
            });
            setIsCustomCategory(false);
        } else {
            setFormData({
                name: '',
                description: '',
                category: 'Paper',
                unit_price: '',
                current_stock: '',
                unit: 'pcs',
                click_cost_per_m2: '',
                width: '',
                height: ''
            });
            setIsCustomCategory(false);
        }
    }, [materialToEdit, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const isRoll = formData.unit === 'm' || formData.category === 'Rulonai';
            const payload = {
                ...formData,
                unit_price: parseFloat(formData.unit_price) || 0,
                current_stock: parseInt(formData.current_stock) || 0,
                click_cost_per_m2: formData.click_cost_per_m2 ? parseFloat(formData.click_cost_per_m2) : null,
                width: formData.width ? parseInt(formData.width) : null,
                height: isRoll ? null : (formData.height ? parseInt(formData.height) : null)
            };
            let error;

            if (materialToEdit) {
                const { error: updateError } = await (supabase as any)
                    .from('materials')
                    .update(payload)
                    .eq('id', materialToEdit.id);
                error = updateError;
            } else {
                const { error: insertError } = await (supabase as any)
                    .from('materials')
                    .insert([payload]);
                error = insertError;
            }

            if (error) throw error;
            onSuccess();
        } catch (error) {
            console.error('Error saving material:', error);
            alert('Failed to save material');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/80 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-primary">
                        {materialToEdit ? 'Edit Material' : 'New Material'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors" aria-label="Close">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
                    <div className="space-y-1">
                        <label htmlFor="material-name" className="text-xs font-bold text-gray-500 uppercase">Material Name *</label>
                        <input
                            id="material-name"
                            required
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full border-b-2 border-gray-200 p-2 focus:border-accent-teal outline-none transition-colors"
                        />
                    </div>

                    <div className="space-y-1">
                        <label htmlFor="material-description" className="text-xs font-bold text-gray-500 uppercase">Description</label>
                        <textarea
                            id="material-description"
                            rows={2}
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full border-b-2 border-gray-200 p-2 focus:border-accent-teal outline-none transition-colors resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label htmlFor="material-category" className="text-xs font-bold text-gray-500 uppercase">Category</label>
                            {isCustomCategory ? (
                                <div className="flex gap-2 items-center">
                                    <input
                                        id="material-category"
                                        type="text"
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        className="flex-1 w-full border-b-2 border-gray-200 p-2 focus:border-accent-teal outline-none transition-colors"
                                        placeholder="Enter new category"
                                        autoFocus
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            setIsCustomCategory(false);
                                            setFormData({ ...formData, category: categories[0] || 'Paper' });
                                        }}
                                        className="text-xs font-bold text-gray-400 hover:text-gray-600 uppercase"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <select
                                    id="material-category"
                                    value={categories.includes(formData.category) ? formData.category : (categories[0] || 'Paper')}
                                    onChange={e => {
                                        if (e.target.value === 'ADD_NEW') {
                                            setIsCustomCategory(true);
                                            setFormData({ ...formData, category: '' });
                                        } else {
                                            setFormData({ ...formData, category: e.target.value });
                                        }
                                    }}
                                    className="w-full border-b-2 border-gray-200 p-2 focus:border-accent-teal outline-none transition-colors bg-white select-category"
                                >
                                    {categories.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                    <option value="ADD_NEW" className="font-bold text-accent-teal">+ Add New Category...</option>
                                </select>
                            )}
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="material-unit" className="text-xs font-bold text-gray-500 uppercase">Unit</label>
                            <select
                                id="material-unit"
                                value={formData.unit}
                                onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                className="w-full border-b-2 border-gray-200 p-2 focus:border-accent-teal outline-none transition-colors bg-white"
                            >
                                <option value="pcs">pcs</option>
                                <option value="m2">m²</option>
                                <option value="m">m</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 bg-gray-50 p-4 border border-gray-100">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Unit Price (€)</label>
                            <input
                                type="number"
                                step="0.0001"
                                value={formData.unit_price}
                                onChange={e => setFormData({ ...formData, unit_price: e.target.value })}
                                className="w-full border p-2 bg-white font-mono"
                                placeholder="0.00"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Current Stock</label>
                            <input
                                type="number"
                                value={formData.current_stock}
                                onChange={e => setFormData({ ...formData, current_stock: e.target.value })}
                                className="w-full border p-2 bg-white font-mono"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 bg-gray-50/50 p-4 border border-gray-100">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Width / Plotis (mm)</label>
                            <input
                                type="number"
                                value={formData.width}
                                onChange={e => setFormData({ ...formData, width: e.target.value })}
                                className="w-full border p-2 bg-white font-mono"
                                placeholder="e.g. 320 or 1067"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Height / Aukštis (mm)</label>
                            <input
                                type="number"
                                value={formData.height}
                                onChange={e => setFormData({ ...formData, height: e.target.value })}
                                className="w-full border p-2 bg-white font-mono"
                                placeholder={formData.unit === 'm' || formData.category === 'Rulonai' ? 'Continuous Roll' : 'e.g. 450'}
                                disabled={formData.unit === 'm' || formData.category === 'Rulonai'}
                            />
                        </div>
                    </div>

                    <div className="space-y-1 bg-cyan-50 border border-cyan-100 p-4">
                        <label className="text-xs font-bold text-cyan-700 uppercase flex items-center gap-2">
                            ⚡ Inkjet Click Cost (€/m²) — Reference
                        </label>
                        <input
                            type="number"
                            step="0.0001"
                            value={formData.click_cost_per_m2}
                            onChange={e => setFormData({ ...formData, click_cost_per_m2: e.target.value })}
                            className="w-full border p-2 bg-white font-mono"
                            placeholder="e.g. 3.008 (Skaitiklis C)"
                        />
                        <p className="text-[10px] text-cyan-600">Optional reference. Rates: A=€1.20 | B=€2.10 | C=€3.01 | D=€4.50 | E=€7.01 per m² (1m²=16A4)</p>
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
                        Save Material
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateMaterialModal;
