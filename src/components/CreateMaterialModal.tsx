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
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: '',
        unit_price: '',
        current_stock: '',
        unit: 'pcs'
    });

    useEffect(() => {
        if (materialToEdit) {
            setFormData({
                name: materialToEdit.name || '',
                description: materialToEdit.description || '',
                category: materialToEdit.category || '',
                unit_price: materialToEdit.unit_price?.toString() || '',
                current_stock: materialToEdit.current_stock?.toString() || '',
                unit: materialToEdit.unit || 'pcs'
            });
        } else {
            setFormData({
                name: '',
                description: '',
                category: '',
                unit_price: '',
                current_stock: '',
                unit: 'pcs'
            });
        }
    }, [materialToEdit, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                ...formData,
                unit_price: parseFloat(formData.unit_price) || 0,
                current_stock: parseInt(formData.current_stock) || 0
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
                            <label className="text-xs font-bold text-gray-500 uppercase">Category</label>
                            <input
                                type="text"
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                className="w-full border-b-2 border-gray-200 p-2 focus:border-accent-teal outline-none transition-colors"
                                placeholder="e.g. Paper, Ink"
                            />
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="material-unit" className="text-xs font-bold text-gray-500 uppercase">Unit</label>
                            <select
                                id="material-unit"
                                value={formData.unit}
                                onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                className="w-full border-b-2 border-gray-200 p-2 focus:border-accent-teal outline-none transition-colors"
                            >
                                <option value="pcs">pcs</option>
                                <option value="m2">m²</option>
                                <option value="kg">kg</option>
                                <option value="l">l</option>
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
