import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Loader2 } from 'lucide-react';

interface Product {
    id: string;
    name: string;
    category: string;
    description: string;
    base_price: number;
    image_url?: string;
    allowed_material_categories?: string[];
    allowed_material_ids?: string[];
    item_spacing?: number;
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
        base_price: 0,
        image_url: '',
        allowed_material_categories: [] as string[],
        allowed_material_ids: [] as string[],
        item_spacing: 0
    });
    const [availableCategories, setAvailableCategories] = useState<string[]>([]);
    const [availableMaterials, setAvailableMaterials] = useState<{ id: string; name: string; category: string }[]>([]);
    const [materialSearch, setMaterialSearch] = useState('');
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (productToEdit) {
            setFormData({
                name: productToEdit.name || '',
                category: productToEdit.category || '',
                description: productToEdit.description || '',
                base_price: productToEdit.base_price || 0,
                image_url: productToEdit.image_url || '',
                allowed_material_categories: productToEdit.allowed_material_categories || [],
                allowed_material_ids: (productToEdit as any).allowed_material_ids || [],
                item_spacing: productToEdit.item_spacing || 0
            });
        } else {
            setFormData({
                name: '',
                category: '',
                description: '',
                base_price: 0,
                image_url: '',
                allowed_material_categories: [],
                allowed_material_ids: [],
                item_spacing: 0
            });
        }
        fetchCategories();
    }, [productToEdit, isOpen]);

    const fetchCategories = async () => {
        const { data } = await supabase
            .from('materials')
            .select('id, name, category')
            .order('name');
        if (data) {
            const cats = Array.from(new Set((data as any[]).map(m => m.category).filter(Boolean)));
            setAvailableCategories(cats as string[]);
            setAvailableMaterials(data as any);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `product-images/${fileName}`;

            // Create bucket if it doesnt exist (swallow error as it might already exist)
            await supabase.storage.createBucket('product-images', { public: true }).catch(() => {});

            const { error: uploadError } = await supabase.storage
                .from('product-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('product-images')
                .getPublicUrl(filePath);

            setFormData({ ...formData, image_url: data.publicUrl });
        } catch (error: any) {
            console.error('Error uploading image:', error);
            alert('Upload failed: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

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
            <div className="bg-white w-full max-w-lg max-h-[90vh] shadow-2xl animate-in fade-in zoom-in duration-200 rounded-lg overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
                    <h2 className="text-xl font-bold text-primary">
                        {productToEdit ? 'Edit Product' : 'New Product'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors" aria-label="Close">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="p-8 space-y-6 overflow-y-auto flex-1">
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
                        <label htmlFor="product-spacing" className="text-xs font-bold text-gray-500 uppercase">Item Spacing (mm)</label>
                        <input
                            id="product-spacing"
                            type="number"
                            step="0.1"
                            value={formData.item_spacing}
                            onChange={e => setFormData({ ...formData, item_spacing: parseFloat(e.target.value) || 0 })}
                            className="w-full border-b-2 border-gray-200 p-3 bg-gray-50 rounded-lg focus:border-accent-teal outline-none transition-colors"
                            placeholder="0"
                        />
                        <p className="text-[10px] text-gray-400 font-medium">Extra gap between items on the SRA3 sheet (for bleeds or cutting).</p>
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

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Allowed Material Categories</label>
                        <div className="flex flex-wrap gap-2 p-3 border-2 border-gray-100 bg-gray-50 rounded min-h-[44px]">
                            {availableCategories.length === 0 ? (
                                <p className="text-xs text-gray-400">No material categories found in database.</p>
                            ) : (
                                availableCategories.map(cat => (
                                    <label key={cat} className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-gray-200 cursor-pointer hover:border-accent-teal transition-colors">
                                        <input 
                                            type="checkbox" 
                                            checked={formData.allowed_material_categories.includes(cat)}
                                            onChange={e => {
                                                const newCats = e.target.checked 
                                                    ? [...formData.allowed_material_categories, cat]
                                                    : formData.allowed_material_categories.filter(c => c !== cat);
                                                setFormData({ ...formData, allowed_material_categories: newCats });
                                            }}
                                            className="w-3 h-3 accent-accent-teal"
                                        />
                                        <span className="text-xs font-bold text-gray-600">{cat}</span>
                                    </label>
                                ))
                            )}
                        </div>
                        <p className="text-[10px] text-gray-400 italic">If none selected, all materials will be shown.</p>
                    </div>

                    {/* Specific Materials — takes priority over categories */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase flex items-center justify-between">
                            <span>Specific Materials (Overrides Categories)</span>
                            {formData.allowed_material_ids.length > 0 && (
                                <span className="bg-cyan-100 text-cyan-800 text-[10px] px-2 py-0.5 rounded-full font-black">
                                    {formData.allowed_material_ids.length} selected
                                </span>
                            )}
                        </label>
                        <input
                            type="text"
                            placeholder="Search materials..."
                            value={materialSearch}
                            onChange={e => setMaterialSearch(e.target.value)}
                            className="w-full border border-gray-200 px-3 py-1.5 text-sm rounded focus:border-accent-teal outline-none"
                        />
                        <div className="border-2 border-gray-100 rounded overflow-y-auto max-h-40 bg-gray-50">
                            {availableMaterials
                                .filter(m => m.name.toLowerCase().includes(materialSearch.toLowerCase()))
                                .map(m => (
                                    <label
                                        key={m.id}
                                        className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-white transition-colors border-b border-gray-100 last:border-0 ${
                                            formData.allowed_material_ids.includes(m.id) ? 'bg-cyan-50' : ''
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={formData.allowed_material_ids.includes(m.id)}
                                            onChange={e => {
                                                const newIds = e.target.checked
                                                    ? [...formData.allowed_material_ids, m.id]
                                                    : formData.allowed_material_ids.filter(id => id !== m.id);
                                                setFormData({ ...formData, allowed_material_ids: newIds });
                                            }}
                                            className="w-3 h-3 accent-accent-teal flex-shrink-0"
                                        />
                                        <span className="text-xs font-medium text-gray-700 leading-tight">{m.name}</span>
                                        <span className="ml-auto text-[10px] text-gray-400 flex-shrink-0">{m.category}</span>
                                    </label>
                                ))
                            }
                            {availableMaterials.filter(m => m.name.toLowerCase().includes(materialSearch.toLowerCase())).length === 0 && (
                                <p className="text-xs text-gray-400 p-3">No materials match.</p>
                            )}
                        </div>
                        <p className="text-[10px] text-gray-400 italic">If specific materials are selected, only those will appear in the calculator (e.g. Canon Premium Coated for Plakatas A1).</p>
                    </div>


                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Product Image</label>
                        <div className="flex items-center gap-4 p-4 border-2 border-dashed border-gray-100 bg-gray-50 hover:bg-white transition-colors group">
                            {formData.image_url ? (
                                <div className="relative w-24 h-24 bg-white border border-gray-100 flex-shrink-0">
                                    <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                                    <button 
                                        type="button"
                                        onClick={() => setFormData({...formData, image_url: ''})}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:scale-110 transition-transform"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ) : (
                                <div className="w-24 h-24 border-2 border-gray-100 border-dashed flex items-center justify-center text-gray-300">
                                    <X size={24} />
                                </div>
                            )}
                            
                            <div className="flex-1">
                                <label className="block p-2 text-center text-xs font-black uppercase text-accent-teal border-2 border-accent-teal hover:bg-accent-teal hover:text-primary transition-all cursor-pointer">
                                    {uploading ? 'Iškeliama...' : 'Pasirinkti Nuotrauką'}
                                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                                </label>
                                <p className="text-[10px] text-gray-400 mt-2">Iki 2MB, JPG, PNG arba WEBP</p>
                            </div>
                        </div>
                    </div>

                    </div>

                    <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50 shrink-0">
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
