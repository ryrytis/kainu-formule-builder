import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Edit, Trash2, Copy } from 'lucide-react';
import CreateRuleModal from '../components/CreateRuleModal';

const RULE_TYPE_COLORS: Record<string, string> = {
    'Base Price per 100': 'bg-blue-50 text-blue-800',
    'Base Price per unit': 'bg-blue-50 text-blue-800',
    'Extra Cost per unit': 'bg-emerald-50 text-emerald-800',
    'Extra Cost per 100': 'bg-emerald-50 text-emerald-800',
    'Extra Cost Flat': 'bg-amber-50 text-amber-800',
    'Qty Adjustment': 'bg-orange-50 text-orange-800',
    'Qty Discount': 'bg-purple-50 text-purple-800',
    'Qty Multiplier': 'bg-purple-50 text-purple-800',
    'Client Discount': 'bg-rose-50 text-rose-800',
    'Lamination Cost': 'bg-emerald-50 text-emerald-800',
    'Inkjet Click Cost': 'bg-cyan-50 text-cyan-800',
};

const CalculationRules: React.FC = () => {
    const [rules, setRules] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRule, setSelectedRule] = useState<any | null>(null);

    useEffect(() => {
        fetchRules();
    }, []);

    const fetchRules = async () => {
        const { data } = await (supabase as any)
            .from('calculation_rules')
            .select(`
                *,
                products (name)
            `)
            .order('priority', { ascending: false });

        if (data) setRules(data);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this rule?')) return;
        const { error } = await (supabase as any).from('calculation_rules').delete().eq('id', id);
        if (!error) fetchRules();
    };

    const handleDuplicate = async (rule: any) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, created_at, updated_at, products, ...duplicateData } = rule;
        const newRule = {
            ...duplicateData,
            name: `${rule.name} (Copy)`,
            is_active: false
        };

        const { error } = await (supabase as any).from('calculation_rules').insert([newRule]);
        if (error) {
            console.error('Error duplicating rule:', error);
            alert('Failed to duplicate rule');
        } else {
            fetchRules();
        }
    };

    const handleEdit = (rule: any) => {
        setSelectedRule(rule);
        setIsModalOpen(true);
    };

    const closeAndRefresh = () => {
        setIsModalOpen(false);
        setSelectedRule(null);
        fetchRules();
    };

    const filteredRules = rules.filter(r => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            (r.name?.toLowerCase() || '').includes(term) ||
            (r.description?.toLowerCase() || '').includes(term) ||
            (r.extra_name?.toLowerCase() || '').includes(term) ||
            (r.rule_type?.toLowerCase() || '').includes(term)
        );
    });

    const formatValue = (rule: any) => {
        if (rule.rule_type === 'Qty Discount') return `-${rule.value}%`;
        if (rule.rule_type === 'Client Discount' || rule.rule_type === 'Qty Multiplier') return `×${rule.value}`;
        return `€${rule.value}`;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-primary tracking-tight">Calculation Rules</h1>
                    <p className="text-gray-500 mt-1">Define pricing logic: base prices, extras, and discounts</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="btn-accent flex items-center gap-2"
                >
                    <Plus size={18} />
                    New Rule
                </button>
            </div>

            <div className="bg-white p-4 border border-gray-100 shadow-sm">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search rules..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 focus:border-accent-teal outline-none transition-colors"
                    />
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Priority</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Rule Name</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Value</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Conditions</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredRules.map((rule) => (
                            <tr key={rule.id} className="hover:bg-gray-50 transition-colors group">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="font-mono font-bold text-primary bg-gray-100 px-2 py-1 rounded">
                                        {rule.priority}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm font-bold text-primary">{rule.name}</div>
                                    {rule.extra_name && (
                                        <div className="text-xs text-emerald-600 font-medium">⚙ {rule.extra_name}</div>
                                    )}
                                    <div className="text-xs text-gray-500">{rule.description || '-'}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded ${RULE_TYPE_COLORS[rule.rule_type] || 'bg-gray-100 text-gray-700'}`}>
                                        {rule.rule_type}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="text-lg font-bold text-accent-teal font-mono">
                                        {formatValue(rule)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    <div className="flex flex-col gap-1">
                                        {rule.product_ids && rule.product_ids.length > 1 ? (
                                            <span className="bg-blue-50 text-blue-800 text-xs px-2 py-0.5 rounded w-fit font-bold border border-blue-100">
                                                📦 {rule.product_ids.length} Products
                                            </span>
                                        ) : rule.products ? (
                                            <span className="bg-blue-50 text-blue-800 text-xs px-2 py-0.5 rounded w-fit">
                                                Prod: {rule.products.name}
                                            </span>
                                        ) : rule.product_ids && rule.product_ids.length === 1 ? (
                                            <span className="bg-blue-50 text-blue-800 text-xs px-2 py-0.5 rounded w-fit">
                                                1 Product
                                            </span>
                                        ) : rule.product_categories && rule.product_categories.length > 0 ? (
                                            <span className="bg-indigo-50 text-indigo-800 text-xs px-2 py-0.5 rounded w-fit font-bold border border-indigo-100">
                                                📁 {rule.product_categories.length} Categories
                                            </span>
                                        ) : rule.product_category ? (
                                            <span className="bg-indigo-50 text-indigo-800 text-xs px-2 py-0.5 rounded w-fit font-bold">
                                                Cat: {rule.product_category}
                                            </span>
                                        ) : <span className="text-gray-400 text-xs italic">All Products (Global)</span>}

                                        {rule.lamination && (
                                            <span className="bg-purple-50 text-purple-800 text-xs px-2 py-0.5 rounded w-fit">
                                                Lam: {rule.lamination}
                                            </span>
                                        )}

                                        {rule.print_type && (
                                            <span className="bg-teal-50 text-teal-800 text-xs px-2 py-0.5 rounded w-fit font-black border border-teal-100">
                                                Mode: {rule.print_type}
                                            </span>
                                        )}

                                        {(rule as any).inkjet_counter && (
                                            <span className="bg-cyan-50 text-cyan-800 text-xs px-2 py-0.5 rounded w-fit font-black border border-cyan-200 flex items-center gap-1">
                                                ⚡ Skaitiklis {(rule as any).inkjet_counter}
                                            </span>
                                        )}

                                        {(rule as any).material_ids && (rule as any).material_ids.length > 0 && (
                                            <span className="bg-lime-50 text-lime-800 text-xs px-2 py-0.5 rounded w-fit border border-lime-200">
                                                🗂 {(rule as any).material_ids.length} Material{(rule as any).material_ids.length > 1 ? 's' : ''}
                                            </span>
                                        )}

                                        {(rule.min_quantity || rule.max_quantity) && (
                                            <span className="bg-orange-50 text-orange-800 text-xs px-2 py-0.5 rounded w-fit">
                                                Qty: {rule.min_quantity || 0} - {rule.max_quantity || '∞'}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${rule.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {rule.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleDuplicate(rule)} className="text-gray-400 hover:text-accent-teal p-1" title="Duplicate Rule" aria-label="Duplicate Rule">
                                            <Copy size={16} />
                                        </button>
                                        <button onClick={() => handleEdit(rule)} className="text-accent-teal hover:text-teal-700 p-1" aria-label="Edit Rule">
                                            <Edit size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(rule.id)} className="text-gray-400 hover:text-red-600 p-1" aria-label="Delete Rule">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <CreateRuleModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setSelectedRule(null); }}
                onSuccess={closeAndRefresh}
                ruleToEdit={selectedRule}
            />
        </div>
    );
};

export default CalculationRules;
