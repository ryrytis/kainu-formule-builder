import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Edit, Trash2, Package, AlertTriangle } from 'lucide-react';
import CreateMaterialModal from '../components/CreateMaterialModal';

const Materials: React.FC = () => {
    const [materials, setMaterials] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState<any | null>(null);

    useEffect(() => {
        fetchMaterials();
    }, []);

    const fetchMaterials = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('materials')
            .select('*')
            .order('name');

        if (data) setMaterials(data);
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this material?')) return;
        const { error } = await supabase.from('materials').delete().eq('id', id);
        if (!error) fetchMaterials();
    };

    const handleEdit = (material: any) => {
        setSelectedMaterial(material);
        setIsModalOpen(true);
    };

    const closeAndRefresh = () => {
        setIsModalOpen(false);
        setSelectedMaterial(null);
        fetchMaterials();
    };

    const filteredMaterials = materials.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-primary tracking-tight">Materials</h1>
                    <p className="text-gray-500 mt-1">Manage inventory and pricing</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="btn-accent flex items-center gap-2"
                >
                    <Plus size={18} />
                    New Material
                </button>
            </div>

            {/* Search and Filters */}
            <div className="bg-white p-4 border border-gray-100 shadow-sm">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search materials..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 focus:border-accent-teal outline-none transition-colors"
                    />
                </div>
            </div>

            {/* Materials Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Name / Description</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Stock</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Unit Price</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredMaterials.map((material) => (
                            <tr key={material.id} className="hover:bg-gray-50 transition-colors group">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-gray-100 rounded-sm text-gray-400">
                                            <Package size={20} />
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-bold text-primary">{material.name}</div>
                                            <div className="text-xs text-gray-500">{material.description || '-'}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-50 text-blue-800 uppercase tracking-wide">
                                        {material.category || 'General'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center text-sm text-gray-900">
                                        {(material.current_stock || 0) < 10 && (
                                            <AlertTriangle size={16} className="text-amber-500 mr-2" />
                                        )}
                                        <span className={(material.current_stock || 0) < 10 ? 'text-amber-600 font-bold' : ''}>
                                            {material.current_stock || 0} {material.unit}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-primary">
                                    €{material.unit_price?.toFixed(4)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEdit(material)} className="text-accent-teal hover:text-teal-700 p-1" aria-label="Edit Material">
                                            <Edit size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(material.id)} className="text-gray-400 hover:text-red-600 p-1" aria-label="Delete Material">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {!loading && filteredMaterials.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                    No materials found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <CreateMaterialModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setSelectedMaterial(null); }}
                onSuccess={closeAndRefresh}
                materialToEdit={selectedMaterial}
            />
        </div>
    );
};

export default Materials;
