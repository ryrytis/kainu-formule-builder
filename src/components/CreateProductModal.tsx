import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Loader2 } from 'lucide-react';

interface Product {
    id: string;
    name: string;
    category: string;
    description: string;
    base_price: number;
}

interface CreateProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    productToEdit?: Product | null;
}

const CreateProductModal: React.FC<CreateProductModalProps> = ({ isOpen, onClose, onSuccess, productToEdit }) => {
    const [formData, setFormData] = useState({
        name: '',
        category: '',
        description: '',
        base_price: 0
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (productToEdit) {
            setFormData({
                name: productToEdit.name || '',
                category: productToEdit.category || '',
                description: productToEdit.description || '',
                base_price: productToEdit.base_price || 0
            });
        } else {
            setFormData({
                name: '',
                category: '',
                description: '',
                base_price: 0
            });
        }
    }, [productToEdit, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (productToEdit) {
                const { error } = await (supabase as any)
                    .from('products')
                    .update(formData)
                    .eq('id', productToEdit.id);
                if (error) throw error;
            } else {
                const { error } = await (supabase as any)
                    .from('products')
                    .insert([formData]);
                if (error) throw error;
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error saving product:', error);
            alert(`Failed to save product: ${error.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/80 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-primary">
                        {productToEdit ? 'Edit Product' : 'New Product'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors" aria-label="Close">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-1">
                        <label htmlFor="product-name" className="text-xs font-bold text-gray-500 uppercase">Product Name *</label>
                        <input
                            id="product-name"
                            required
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full border-b-2 border-gray-200 p-2 focus:border-accent-teal outline-none transition-colors"
                            placeholder="e.g. Business Cards"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label htmlFor="product-category" className="text-xs font-bold text-gray-500 uppercase">Category</label>
                            <input
                                id="product-category"
                                type="text"
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                className="w-full border-b-2 border-gray-200 p-2 focus:border-accent-teal outline-none transition-colors"
                                placeholder="e.g. Printing"
                            />
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="product-price" className="text-xs font-bold text-gray-500 uppercase">Price per piece (€)</label>
                            <input
                                id="product-price"
                                type="number"
                                step="0.01"
                                value={formData.base_price}
                                onChange={e => setFormData({ ...formData, base_price: parseFloat(e.target.value) || 0 })}
                                className="w-full border-b-2 border-gray-200 p-2 focus:border-accent-teal outline-none transition-colors"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label htmlFor="product-description" className="text-xs font-bold text-gray-500 uppercase">Description</label>
                        <textarea
                            id="product-description"
                            rows={3}
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full border-2 border-gray-200 p-3 focus:border-accent-teal outline-none transition-colors resize-none"
                            placeholder="Product details..."
                        />
                    </div>


                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="px-6 py-3 text-sm font-bold uppercase text-gray-500 hover:bg-gray-200 transition-colors">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-accent flex items-center gap-2"
                        >
                            {loading && <Loader2 className="animate-spin" size={16} />}
                            Save Product
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateProductModal;
