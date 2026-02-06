import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Edit, Trash2, Loader2, Save, X, Lightbulb, ToggleLeft, ToggleRight } from 'lucide-react';
import { Database } from '../lib/database.types';

type KnowledgeC = Database['public']['Tables']['ai_knowledge']['Row'];

const AiSettings: React.FC = () => {
    const [rules, setRules] = useState<KnowledgeC[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        topic: '',
        content: '',
        category: 'General',
        priority: '5',
        is_active: true
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchRules();
    }, []);

    const fetchRules = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('ai_knowledge')
                .select('*')
                .order('category')
                .order('priority', { ascending: false });

            if (error) throw error;
            if (data) setRules(data);
        } catch (error) {
            console.error('Error fetching knowledge:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (rule: KnowledgeC) => {
        setEditingId(rule.id);
        setFormData({
            topic: rule.topic,
            content: rule.content,
            category: rule.category,
            priority: rule.priority.toString(),
            is_active: rule.is_active
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this knowledge rule?')) return;

        try {
            const { error } = await supabase.from('ai_knowledge').delete().eq('id', id);
            if (error) throw error;
            setRules(prev => prev.filter(r => r.id !== id));
        } catch (error) {
            console.error('Error deleting rule:', error);
            alert('Failed to delete rule');
        }
    };

    const handleToggleActive = async (rule: KnowledgeC) => {
        try {
            const { error } = await (supabase as any)
                .from('ai_knowledge')
                .update({ is_active: !rule.is_active })
                .eq('id', rule.id);
            if (error) throw error;
            setRules(prev => prev.map(r => r.id === rule.id ? { ...r, is_active: !r.is_active } : r));
        } catch (error) {
            console.error('Error toggling rule:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const payload = {
                topic: formData.topic,
                content: formData.content,
                category: formData.category,
                priority: parseInt(formData.priority) || 0,
                is_active: formData.is_active
            };

            if (editingId) {
                const { error } = await (supabase as any)
                    .from('ai_knowledge')
                    .update(payload)
                    .eq('id', editingId);
                if (error) throw error;
            } else {
                const { error } = await (supabase as any)
                    .from('ai_knowledge')
                    .insert([payload]);
                if (error) throw error;
            }

            setIsModalOpen(false);
            resetForm();
            fetchRules();
        } catch (error) {
            console.error('Error saving rule:', error);
            alert('Failed to save rule');
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({
            topic: '',
            content: '',
            category: 'General',
            priority: '5',
            is_active: true
        });
    };

    const systemPromptRule = rules.find(r => r.category === 'SYSTEM');
    const generalRules = rules.filter(r => r.category !== 'SYSTEM');

    const filteredRules = generalRules.filter(r =>
        r.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
                        <Lightbulb className="text-accent-purple" />
                        AI Settings & Knowledge
                    </h1>
                    <p className="text-gray-500">Manage what the AI knows and how it behaves.</p>
                </div>
                <button
                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus size={20} />
                    Add Knowledge
                </button>
            </div>

            {/* System Prompt Section */}
            <div className="card border-l-4 border-accent-purple">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <Lightbulb size={20} className="text-accent-purple" />
                            System Personality & Core Rules
                        </h2>
                        <p className="text-sm text-gray-500">This defines who the AI is and how it should behave globally.</p>
                    </div>
                    {systemPromptRule ? (
                        <button
                            onClick={() => handleEdit(systemPromptRule)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                        >
                            <Edit size={16} /> Edit Identity
                        </button>
                    ) : (
                        <button
                            onClick={() => {
                                resetForm();
                                setFormData(prev => ({ ...prev, category: 'SYSTEM', topic: 'System Identity', priority: '10' }));
                                setIsModalOpen(true);
                            }}
                            className="text-accent-purple hover:text-purple-700 text-sm font-medium flex items-center gap-1"
                        >
                            <Plus size={16} /> Create Identity
                        </button>
                    )}
                </div>

                {systemPromptRule ? (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700">{systemPromptRule.content}</pre>
                    </div>
                ) : (
                    <div className="text-sm text-gray-400 italic">No system identity defined yet. The AI uses default hardcoded behavior.</div>
                )}
            </div>

            <div className="card">
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search rules..."
                        className="input-field pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-separate border-spacing-0">
                        <thead>
                            <tr className="border-b border-gray-100 text-gray-500 text-sm">
                                <th className="py-4 px-4 font-medium">Topic</th>
                                <th className="py-4 px-4 font-medium">Content (Rule)</th>
                                <th className="py-4 px-4 font-medium">Category</th>
                                <th className="py-4 px-4 font-medium text-center">Priority</th>
                                <th className="py-4 px-4 font-medium text-center">Status</th>
                                <th className="py-4 px-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan={6} className="py-8 text-center text-gray-500">Loading knowledge...</td></tr>
                            ) : filteredRules.length === 0 ? (
                                <tr><td colSpan={6} className="py-8 text-center text-gray-500">No rules found.</td></tr>
                            ) : (
                                filteredRules.map((rule) => (
                                    <tr key={rule.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="py-4 px-4 font-medium text-gray-900 align-top max-w-[150px]">{rule.topic}</td>
                                        <td className="py-4 px-4 text-gray-600 align-top max-w-[400px] text-sm whitespace-pre-wrap">{rule.content}</td>
                                        <td className="py-4 px-4 align-top">
                                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                                                {rule.category}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 text-center align-top">{rule.priority}</td>
                                        <td className="py-4 px-4 text-center align-top">
                                            <button onClick={() => handleToggleActive(rule)} className="text-gray-400 hover:text-primary transition-colors">
                                                {rule.is_active ? <ToggleRight size={24} className="text-green-500" /> : <ToggleLeft size={24} />}
                                            </button>
                                        </td>
                                        <td className="py-4 px-4 text-right align-top">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(rule)}
                                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                    title="Edit"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(rule.id)}
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
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-800">
                                {editingId ? 'Edit Knowledge' : 'Add Knowledge'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Topic / Title</label>
                                <input
                                    type="text"
                                    required
                                    className="input-field"
                                    value={formData.topic}
                                    onChange={e => setFormData({ ...formData, topic: e.target.value })}
                                    placeholder="e.g. Opening Hours, Pricing"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Category</label>
                                    <input
                                        type="text"
                                        required
                                        className="input-field"
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        placeholder="General"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Priority (1-10)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="10"
                                        className="input-field"
                                        value={formData.priority}
                                        onChange={e => setFormData({ ...formData, priority: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Content ( The Rule )</label>
                                <textarea
                                    required
                                    rows={5}
                                    className="input-field min-h-[100px]"
                                    value={formData.content}
                                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                                    placeholder="Type the information the AI should know..."
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <label className="text-sm font-bold text-gray-700">Active?</label>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                                    className="text-gray-500 hover:text-primary"
                                >
                                    {formData.is_active ? <ToggleRight size={28} className="text-green-500" /> : <ToggleLeft size={28} />}
                                </button>
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
                                    Save Rule
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AiSettings;
