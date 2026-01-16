import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Edit, Trash2, Loader2, Save, X, Hammer } from 'lucide-react';
import { Database } from '../lib/database.types';

type Work = Database['public']['Tables']['works']['Row'];

const Works: React.FC = () => {
    const [works, setWorks] = useState<Work[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        operation: '',
        price: '',
        cost_price: '',
        unit: 'vnt'
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchWorks();
    }, []);

    const fetchWorks = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('works')
                .select('*')
                .order('operation');

            if (error) throw error;
            if (data) setWorks(data);
        } catch (error) {
            console.error('Error fetching works:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (work: Work) => {
        setEditingId(work.id);
        setFormData({
            operation: work.operation,
            price: work.price.toString(),
            cost_price: work.cost_price ? work.cost_price.toString() : '0',
            unit: work.unit || 'vnt'
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this work operation?')) return;

        try {
            const { error } = await supabase.from('works').delete().eq('id', id);
            if (error) throw error;
            setWorks(prev => prev.filter(w => w.id !== id));
        } catch (error) {
            console.error('Error deleting work:', error);
            alert('Failed to delete work');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const payload = {
                operation: formData.operation,
                price: parseFloat(formData.price) || 0,
                cost_price: parseFloat(formData.cost_price) || 0,
                unit: formData.unit
            };

            if (editingId) {
                const { error } = await (supabase as any)
                    .from('works')
                    .update(payload)
                    .eq('id', editingId);
                if (error) throw error;
            } else {
                const { error } = await (supabase as any)
                    .from('works')
                    .insert([payload]);
                if (error) throw error;
            }

            setIsModalOpen(false);
            resetForm();
            fetchWorks();
        } catch (error) {
            console.error('Error saving work:', error);
            alert('Failed to save work');
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({
            operation: '',
            price: '',
            cost_price: '',
            unit: 'vnt'
        });
    };

    const filteredWorks = works.filter(w =>
        w.operation.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
                        <Hammer className="text-accent-teal" />
                        Works & Operations
                    </h1>
                    <p className="text-gray-500">Manage standard labor costs and prices.</p>
                </div>
                <button
                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus size={20} />
                    Add Work
                </button>
            </div>

            <div className="card">
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search operations..."
                        className="input-field pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-separate border-spacing-0">
                        <thead>
                            <tr className="border-b border-gray-100 text-gray-500 text-sm">
                                <th className="py-4 px-4 font-medium">Operation</th>
                                <th className="py-4 px-4 font-medium">Unit</th>
                                <th className="py-4 px-4 font-medium text-right">Sales Price</th>
                                <th className="py-4 px-4 font-medium text-right">Cost Price</th>
                                <th className="py-4 px-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan={5} className="py-8 text-center text-gray-500">Loading works...</td></tr>
                            ) : filteredWorks.length === 0 ? (
                                <tr><td colSpan={5} className="py-8 text-center text-gray-500">No works found.</td></tr>
                            ) : (
                                filteredWorks.map((work) => (
                                    <tr key={work.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="py-4 px-4 font-medium text-gray-900">{work.operation}</td>
                                        <td className="py-4 px-4 text-gray-500">{work.unit}</td>
                                        <td className="py-4 px-4 text-right font-medium text-accent-teal">
                                            €{work.price.toFixed(4)}
                                        </td>
                                        <td className="py-4 px-4 text-right text-gray-500">
                                            €{(work.cost_price || 0).toFixed(4)}
                                        </td>
                                        <td className="py-4 px-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(work)}
                                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                    title="Edit"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(work.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                    title="Delete"
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

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto w-full h-full bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-800">
                                {editingId ? 'Edit Work' : 'New Work'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Operation Name</label>
                                <input
                                    type="text"
                                    required
                                    className="input-field"
                                    value={formData.operation}
                                    onChange={e => setFormData({ ...formData, operation: e.target.value })}
                                    placeholder="e.g. Cutting"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Sales Price</label>
                                    <input
                                        type="number"
                                        step="0.0001"
                                        required
                                        className="input-field"
                                        value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: e.target.value })}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Cost Price</label>
                                    <input
                                        type="number"
                                        step="0.0001"
                                        className="input-field"
                                        value={formData.cost_price}
                                        onChange={e => setFormData({ ...formData, cost_price: e.target.value })}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Unit</label>
                                <select
                                    className="input-field"
                                    value={formData.unit}
                                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                >
                                    <option value="vnt">vnt (items)</option>
                                    <option value="min">min (minutes)</option>
                                    <option value="m2">m² (area)</option>
                                    <option value="val">val (hours)</option>
                                </select>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="btn-primary flex items-center gap-2"
                                >
                                    {submitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                    Save Work
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Works;
