import React, { useEffect, useState } from 'react';

import { Activity, BarChart, DollarSign, Cpu, Table as TableIcon } from 'lucide-react';
import { Database } from '../lib/database.types';

type UsageLog = Database['public']['Tables']['ai_usage_logs']['Row'];

const AiUsage: React.FC = () => {
    const [logs, setLogs] = useState<UsageLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            try {
                // Fetch from the serverless endpoint to bypass RLS policies
                const response = await fetch('/api/portal?action=ai_usage');
                if (!response.ok) {
                    throw new Error(`Error: ${response.statusText}`);
                }
                const data = await response.json();
                if (data) setLogs(data);
            } catch (err) {
                console.error("Failed to fetch usage logs", err);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, []);

    // Derived statistics
    const totalCost = logs.reduce((acc, log) => acc + Number(log.estimated_cost_usd), 0);
    const totalTokens = logs.reduce((acc, log) => acc + log.total_tokens, 0);
    const webChatTokens = logs.filter(l => l.agent_type === 'web_chat').reduce((acc, log) => acc + log.total_tokens, 0);
    const emailTokens = logs.filter(l => l.agent_type === 'email_draft').reduce((acc, log) => acc + log.total_tokens, 0);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
                    <Activity className="text-accent-purple" />
                    AI Token Usage & Costs
                </h1>
                <p className="text-gray-500">Track your OpenAI API consumption and estimated costs.</p>
            </div>

            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card bg-gradient-to-br from-white to-gray-50 border border-gray-100 flex items-center gap-4">
                    <div className="bg-green-100 p-3 rounded-full text-green-600">
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Total Est. Cost</p>
                        <p className="text-2xl font-bold text-gray-800">${totalCost.toFixed(4)}</p>
                    </div>
                </div>

                <div className="card bg-gradient-to-br from-white to-gray-50 border border-gray-100 flex items-center gap-4">
                    <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                        <Cpu size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Total Tokens</p>
                        <p className="text-2xl font-bold text-gray-800">{totalTokens.toLocaleString()}</p>
                    </div>
                </div>

                <div className="card bg-gradient-to-br from-white to-gray-50 border border-gray-100 flex items-center gap-4">
                    <div className="bg-purple-100 p-3 rounded-full text-purple-600">
                        <BarChart size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Web Chat Tokens</p>
                        <p className="text-2xl font-bold text-gray-800">{webChatTokens.toLocaleString()}</p>
                    </div>
                </div>

                <div className="card bg-gradient-to-br from-white to-gray-50 border border-gray-100 flex items-center gap-4">
                    <div className="bg-orange-100 p-3 rounded-full text-orange-600">
                        <TableIcon size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Email Draft Tokens</p>
                        <p className="text-2xl font-bold text-gray-800">{emailTokens.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {/* Data Table */}
            <div className="card">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Recent API Calls</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-separate border-spacing-0">
                        <thead>
                            <tr className="border-b border-gray-100 text-gray-500 text-sm">
                                <th className="py-3 px-4 font-medium">Date / Time</th>
                                <th className="py-3 px-4 font-medium">Agent Type</th>
                                <th className="py-3 px-4 font-medium">Model</th>
                                <th className="py-3 px-4 font-medium text-right">Prompt Tokens</th>
                                <th className="py-3 px-4 font-medium text-right">Completion Tokens</th>
                                <th className="py-3 px-4 font-medium text-right">Total Tokens</th>
                                <th className="py-3 px-4 font-medium text-right text-green-700">Cost (USD)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan={7} className="py-8 text-center text-gray-500">Loading usage data...</td></tr>
                            ) : logs.length === 0 ? (
                                <tr><td colSpan={7} className="py-8 text-center text-gray-500">No usage logged yet.</td></tr>
                            ) : (
                                logs.map(log => (
                                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="py-3 px-4 text-sm text-gray-600">{new Date(log.created_at).toLocaleString()}</td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${log.agent_type === 'web_chat' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                                                {log.agent_type === 'web_chat' ? 'Web Chat' : 'Email Draft'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600 font-mono">{log.model_name}</td>
                                        <td className="py-3 px-4 text-sm text-right text-gray-500">{log.prompt_tokens.toLocaleString()}</td>
                                        <td className="py-3 px-4 text-sm text-right text-gray-500">{log.completion_tokens.toLocaleString()}</td>
                                        <td className="py-3 px-4 text-sm text-right font-medium text-gray-800">{log.total_tokens.toLocaleString()}</td>
                                        <td className="py-3 px-4 text-sm text-right font-bold text-green-700">${Number(log.estimated_cost_usd).toFixed(5)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AiUsage;
