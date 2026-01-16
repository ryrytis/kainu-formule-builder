import React, { useEffect, useState } from 'react';
import { X, Plus, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

interface ManageProductWorksModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: any | null;
}

type Work = Database['public']['Tables']['works']['Row'];
type ProductWork = Database['public']['Tables']['product_works']['Row'] & {
    works: Work;
};

const ManageProductWorksModal: React.FC<ManageProductWorksModalProps> = ({ isOpen, onClose, product }) => {
    const [loading, setLoading] = useState(false);
    const [availableWorks, setAvailableWorks] = useState<Work[]>([]);
    const [assignedWorks, setAssignedWorks] = useState<ProductWork[]>([]);
    const [selectedWorkId, setSelectedWorkId] = useState<string>('');
    const [defaultDuration, setDefaultDuration] = useState<string>('1');

    useEffect(() => {
        if (isOpen && product) {
            fetchData();
        }
    }, [isOpen, product]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch all available works
            const { data: worksData } = await supabase.from('works').select('*').order('operation');
            if (worksData) setAvailableWorks(worksData);

            // Fetch assigned works for this product
            // Note: Join syntax depends on how supabase-js handles it or if we do two queries.
            // Simple approach: fetch product_works, then map.
            const { data: pwData, error } = await supabase
                .from('product_works')
                .select(`
                    *,
                    works (*)
                `)
                .eq('product_id', product.id);

            if (error) throw error;
            if (pwData) setAssignedWorks(pwData as any);

        } catch (error) {
            console.error('Error fetching works:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddWork = async () => {
        if (!product || !selectedWorkId) return;

        try {
            const { error } = await (supabase as any).from('product_works').insert({
                product_id: product.id,
                work_id: selectedWorkId,
                default_quantity: parseFloat(defaultDuration) || 1
            });

            if (error) throw error;

            // Refresh
            fetchData();
            setSelectedWorkId('');
            setDefaultDuration('1');
        } catch (error) {
            console.error('Error adding work:', error);
            alert('Failed to add work. It might already be assigned.');
        }
    };

    const handleRemoveWork = async (id: string) => {
        try {
            const { error } = await supabase.from('product_works').delete().eq('id', id);
            if (error) throw error;
            setAssignedWorks(prev => prev.filter(pw => pw.id !== id));
        } catch (error) {
            console.error('Error removing work:', error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto w-full h-full bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Default Works</h2>
                        <p className="text-sm text-gray-500">Assign standard operations to {product?.name}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Add New Work */}
                    <div className="bg-gray-50 p-4 rounded-lg flex gap-3 items-end border border-gray-100">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Operation</label>
                            <select
                                value={selectedWorkId}
                                onChange={(e) => setSelectedWorkId(e.target.value)}
                                className="w-full p-2 border border-gray-200 rounded text-sm focus:border-accent-teal outline-none"
                            >
                                <option value="">Select work...</option>
                                {availableWorks.map(work => (
                                    <option key={work.id} value={work.id}>
                                        {work.operation} (€{work.price}/min)
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="w-24">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Qty/Min</label>
                            <input
                                type="number"
                                step="0.1"
                                value={defaultDuration}
                                onChange={(e) => setDefaultDuration(e.target.value)}
                                className="w-full p-2 border border-gray-200 rounded text-sm focus:border-accent-teal outline-none"
                            />
                        </div>
                        <button
                            onClick={handleAddWork}
                            disabled={!selectedWorkId}
                            className="bg-accent-teal text-white p-2 rounded hover:bg-teal-600 disabled:opacity-50 transition-colors"
                        >
                            <Plus size={20} />
                        </button>
                    </div>

                    {/* Works List */}
                    <div className="space-y-2">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Assigned Works</h3>
                        {loading ? (
                            <div className="flex justify-center py-4"><Loader2 className="animate-spin text-gray-400" /></div>
                        ) : assignedWorks.length === 0 ? (
                            <p className="text-sm text-gray-400 italic text-center py-4">No default works assigned yet.</p>
                        ) : (
                            <ul className="space-y-2">
                                {assignedWorks.map((pw) => (
                                    <li key={pw.id} className="flex justify-between items-center bg-white border border-gray-100 p-3 rounded-lg shadow-sm">
                                        <div>
                                            <p className="font-medium text-gray-800">{pw.works?.operation}</p>
                                            <p className="text-xs text-gray-500">
                                                Default: {pw.default_quantity} {pw.works?.unit || 'units'}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveWork(pw.id)}
                                            className="text-red-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ManageProductWorksModal;
