import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Edit, Trash2, Box, Tag, DollarSign } from 'lucide-react';
import CreateProductModal from '../components/CreateProductModal';
import ManageProductWorksModal from '../components/ManageProductWorksModal';

const Products: React.FC = () => {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
    const [isWorksModalOpen, setIsWorksModalOpen] = useState(false);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('products')
            .select('*')
            .order('name');

        if (data) setProducts(data);
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this product?')) return;
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (!error) fetchProducts();
    };

    const handleEdit = (product: any) => {
        setSelectedProduct(product);
        setIsModalOpen(true);
    };

    const handleManageWorks = (product: any) => {
        setSelectedProduct(product);
        setIsWorksModalOpen(true);
    }

    const closeAndRefresh = () => {
        setIsModalOpen(false);
        setSelectedProduct(null);
        fetchProducts();
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-primary tracking-tight">Products</h1>
                    <p className="text-gray-500 mt-1">Manage product catalog for calculations</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="btn-accent flex items-center gap-2"
                >
                    <Plus size={18} />
                    New Product
                </button>
            </div>

            {/* Search */}
            <div className="bg-white p-4 border border-gray-100 shadow-sm">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 focus:border-accent-teal outline-none transition-colors"
                    />
                </div>
            </div>

            {/* Products Table */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-separate border-spacing-0">
                        <thead>
                            <tr className="border-b border-gray-100 text-gray-500 text-sm">
                                <th className="py-4 px-4 font-medium">Name</th>
                                <th className="py-4 px-4 font-medium">Category</th>
                                <th className="py-4 px-4 font-medium">Base Price</th>
                                <th className="py-4 px-4 font-medium">Description</th>
                                <th className="py-4 px-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-gray-500">Loading products...</td>
                                </tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-gray-400">
                                        <Box size={48} className="mx-auto mb-3 opacity-20" />
                                        <p>No products found. Create your first one!</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts.map((product) => (
                                    <tr key={product.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="py-4 px-4 font-medium text-primary">
                                            {product.name}
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                                <Tag size={12} className="text-gray-500" />
                                                {product.category || 'General'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className="font-bold text-accent-teal">€{product.base_price?.toFixed(2) || '0.00'}</span>
                                            <span className="text-xs text-gray-400 ml-1">/ pc</span>
                                        </td>
                                        <td className="py-4 px-4 text-sm text-gray-500 truncate max-w-xs" title={product.description}>
                                            {product.description || '-'}
                                        </td>
                                        <td className="py-4 px-4 text-right">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => window.location.href = `/products/${product.id}/pricing`}
                                                    className="p-1.5 text-gray-400 hover:text-accent-teal hover:bg-teal-50 rounded"
                                                    title="Manage Pricing"
                                                >
                                                    <DollarSign size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleManageWorks(product)}
                                                    className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded"
                                                    title="Default Works"
                                                >
                                                    <Box size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(product)}
                                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                    title="Edit Product"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(product.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                                                    title="Delete Product"
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
            </div>

            {!loading && filteredProducts.length === 0 && (
                <div className="text-center py-12 text-gray-500 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg">
                    <Box size={48} className="mx-auto text-gray-300 mb-4" />
                    <p>No products found. Create your first one!</p>
                </div>
            )}

            <CreateProductModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setSelectedProduct(null); }}
                onSuccess={closeAndRefresh}
                productToEdit={selectedProduct}
            />

            <ManageProductWorksModal
                isOpen={isWorksModalOpen}
                onClose={() => { setIsWorksModalOpen(false); setSelectedProduct(null); }}
                product={selectedProduct}
            />
        </div>
    );
};

export default Products;
