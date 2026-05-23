import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Edit, Trash2, List, Save, X, Package, Share2 } from 'lucide-react';
import PriceListPreviewModal from '../components/PriceListPreviewModal';

const PriceLists: React.FC = () => {
    const [priceLists, setPriceLists] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Selection state
    const [selectedList, setSelectedList] = useState<any | null>(null);
    const [listItems, setListItems] = useState<any[]>([]);
    
    // Modal state for Price List
    const [isListModalOpen, setIsListModalOpen] = useState(false);
    const [editingList, setEditingList] = useState<any | null>(null);
    const [listFormData, setListFormData] = useState({ name: '', description: '' });

    const [newItemProductId, setNewItemProductId] = useState('');
    const [newItemPrice, setNewItemPrice] = useState('');

    // Preview Modal
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

    useEffect(() => {
        fetchPriceLists();
        fetchProducts();
    }, []);

    useEffect(() => {
        if (selectedList) {
            fetchListItems(selectedList.id);
        } else {
            setListItems([]);
        }
    }, [selectedList]);

    const fetchPriceLists = async () => {
        setLoading(true);
        const { data } = await (supabase as any).from('price_lists').select('*').order('name');
        if (data) setPriceLists(data);
        setLoading(false);
    };

    const fetchProducts = async () => {
        const { data } = await supabase.from('products').select('id, name, base_price').order('name');
        if (data) setProducts(data);
    };

    const fetchListItems = async (listId: string) => {
        const { data } = await (supabase as any)
            .from('price_list_items')
            .select(`
                id,
                product_id,
                custom_base_price,
                products (name)
            `)
            .eq('price_list_id', listId);
        if (data) setListItems(data);
    };

    // --- Price List CRUD ---
    const handleSaveList = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingList) {
            await (supabase as any).from('price_lists').update(listFormData).eq('id', editingList.id);
        } else {
            const { data } = await (supabase as any).from('price_lists').insert([listFormData]).select();
            if (data && data[0] && !selectedList) setSelectedList(data[0]);
        }
        setIsListModalOpen(false);
        fetchPriceLists();
    };

    const handleDeleteList = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this price list?')) return;
        await (supabase as any).from('price_lists').delete().eq('id', id);
        if (selectedList?.id === id) setSelectedList(null);
        fetchPriceLists();
    };

    const openListModal = (list: any = null) => {
        if (list) {
            setEditingList(list);
            setListFormData({ name: list.name, description: list.description || '' });
        } else {
            setEditingList(null);
            setListFormData({ name: '', description: '' });
        }
        setIsListModalOpen(true);
    };

    // --- Price List Items CRUD ---
    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedList || !newItemProductId || !newItemPrice) return;
        
        await (supabase as any).from('price_list_items').insert([{
            price_list_id: selectedList.id,
            product_id: newItemProductId,
            custom_base_price: parseFloat(newItemPrice)
        }]);
        
        setNewItemProductId('');
        setNewItemPrice('');
        fetchListItems(selectedList.id);
    };

    const handleDeleteItem = async (id: string) => {
        await (supabase as any).from('price_list_items').delete().eq('id', id);
        fetchListItems(selectedList.id);
    };

    const filteredLists = priceLists.filter(l => 
        l.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-primary tracking-tight">Price Lists</h1>
                    <p className="text-gray-500 mt-1">Manage custom product pricing for specific clients</p>
                </div>
                <button
                    onClick={() => openListModal()}
                    className="btn-accent flex items-center gap-2"
                >
                    <Plus size={18} />
                    New Price List
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left side: Lists */}
                <div className="md:col-span-1 space-y-4">
                    <div className="bg-white p-4 border border-gray-100 shadow-sm">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search lists..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 border border-gray-200 text-sm focus:border-accent-teal outline-none transition-colors"
                            />
                        </div>
                    </div>

                    <div className="bg-white border border-gray-100 shadow-sm overflow-hidden flex flex-col max-h-[600px]">
                        <div className="overflow-y-auto p-2 space-y-1">
                            {loading ? (
                                <p className="text-center text-gray-500 py-4 text-sm">Loading...</p>
                            ) : filteredLists.length === 0 ? (
                                <p className="text-center text-gray-400 py-4 text-sm">No price lists found.</p>
                            ) : (
                                filteredLists.map(list => (
                                    <div 
                                        key={list.id}
                                        onClick={() => setSelectedList(list)}
                                        className={`p-3 cursor-pointer rounded border transition-colors flex justify-between items-center group
                                            ${selectedList?.id === list.id 
                                                ? 'bg-teal-50 border-accent-teal text-accent-teal' 
                                                : 'border-transparent hover:bg-gray-50 text-gray-700'}`}
                                    >
                                        <div className="truncate pr-2">
                                            <div className="font-medium truncate">{list.name}</div>
                                            {list.description && <div className="text-xs text-gray-400 truncate mt-0.5">{list.description}</div>}
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); openListModal(list); }}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
                                            ><Edit size={14} /></button>
                                            <button 
                                                onClick={(e) => handleDeleteList(list.id, e)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                                            ><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Right side: Items */}
                <div className="md:col-span-2">
                    {selectedList ? (
                        <div className="bg-white border border-gray-100 shadow-sm flex flex-col">
                            <div className="p-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
                                <List className="text-accent-teal" size={20} />
                                <h2 className="text-lg font-semibold text-primary">{selectedList.name} Items</h2>
                                <button
                                    onClick={() => setIsPreviewModalOpen(true)}
                                    className="ml-auto flex items-center gap-2 text-sm text-accent-teal hover:text-accent-teal/80 font-medium transition-colors"
                                >
                                    <Share2 size={16} /> Share / Preview
                                </button>
                            </div>
                            
                            <div className="p-4">
                                <form onSubmit={handleAddItem} className="flex gap-3 items-end mb-6 bg-gray-50 p-4 border border-gray-100 rounded">
                                    <div className="flex-1">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Product</label>
                                        <select 
                                            required
                                            value={newItemProductId}
                                            onChange={e => setNewItemProductId(e.target.value)}
                                            className="w-full border-gray-200 border p-2 text-sm focus:border-accent-teal outline-none"
                                        >
                                            <option value="">Select a product...</option>
                                            {products.filter(p => !listItems.some(li => li.product_id === p.id)).map(p => (
                                                <option key={p.id} value={p.id}>{p.name} (Base: €{p.base_price})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="w-32">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Custom Price (€)</label>
                                        <input 
                                            type="number" step="0.01" min="0" required
                                            value={newItemPrice}
                                            onChange={e => setNewItemPrice(e.target.value)}
                                            className="w-full border-gray-200 border p-2 text-sm focus:border-accent-teal outline-none"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <button type="submit" className="btn-accent px-4 py-2 flex items-center gap-2 text-sm h-[38px]">
                                        <Plus size={16} /> Add
                                    </button>
                                </form>

                                {listItems.length === 0 ? (
                                    <div className="text-center py-12 text-gray-400">
                                        <Package size={40} className="mx-auto mb-3 opacity-20" />
                                        <p>No custom prices defined for this list.</p>
                                    </div>
                                ) : (
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-gray-100 text-gray-500">
                                                <th className="py-3 px-2 font-medium">Product</th>
                                                <th className="py-3 px-2 font-medium w-32 text-right">Custom Price</th>
                                                <th className="py-3 px-2 w-16"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {listItems.map(item => {
                                                const originalProd = products.find(p => p.id === item.product_id);
                                                return (
                                                    <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                                                        <td className="py-3 px-2 font-medium text-gray-800">
                                                            {item.products?.name || 'Unknown Product'}
                                                            <div className="text-xs text-gray-400 font-normal">Original: €{originalProd?.base_price || 0}</div>
                                                        </td>
                                                        <td className="py-3 px-2 text-right">
                                                            <span className="font-bold text-accent-teal">€{item.custom_base_price.toFixed(2)}</span>
                                                        </td>
                                                        <td className="py-3 px-2 text-right">
                                                            <button 
                                                                onClick={() => handleDeleteItem(item.id)}
                                                                className="p-1.5 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            ><Trash2 size={16} /></button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg min-h-[400px]">
                            <List size={48} className="mb-4 opacity-20" />
                            <p>Select a price list from the sidebar to view or edit items.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* List Modal */}
            {isListModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-none shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-xl font-bold text-primary tracking-tight">
                                {editingList ? 'Edit Price List' : 'Create Price List'}
                            </h2>
                            <button onClick={() => setIsListModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSaveList} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
                                <input
                                    type="text" required
                                    value={listFormData.name}
                                    onChange={e => setListFormData({...listFormData, name: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-200 focus:border-accent-teal outline-none transition-colors"
                                    placeholder="e.g., VIP Partners"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description (Optional)</label>
                                <textarea
                                    value={listFormData.description}
                                    onChange={e => setListFormData({...listFormData, description: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-200 focus:border-accent-teal outline-none transition-colors h-24 resize-none"
                                    placeholder="Brief note about who gets this pricing"
                                />
                            </div>
                            
                            <div className="pt-4 flex gap-3 justify-end">
                                <button type="button" onClick={() => setIsListModalOpen(false)} className="btn-secondary">
                                    Cancel
                                </button>
                                <button type="submit" className="btn-accent flex items-center gap-2">
                                    <Save size={18} />
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <PriceListPreviewModal 
                isOpen={isPreviewModalOpen}
                onClose={() => setIsPreviewModalOpen(false)}
                priceList={selectedList}
                items={listItems}
            />
        </div>
    );
};

export default PriceLists;
