import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2, TrendingUp, TrendingDown, DollarSign, Package } from 'lucide-react';
import { clsx } from 'clsx';

const Reporting: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState({
        totalRevenue: 0,
        totalCost: 0,
        totalProfit: 0,
        avgMargin: 0,
        orderCount: 0
    });
    const [monthlyData, setMonthlyData] = useState<any[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Orders (last 12 months)
            const { data: orders } = await (supabase as any)
                .from('orders')
                .select('*')
                .neq('status', 'Cancelled')
                .order('created_at', { ascending: true });

            if (!orders) return;

            // Calculate KPIs
            let revenue = 0;
            let cost = 0;
            let count = 0;

            const monthlyStats: Record<string, { name: string, revenue: number, cost: number, profit: number }> = {};
            // Init last 6 months
            for (let i = 5; i >= 0; i--) {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
                const name = d.toLocaleString('default', { month: 'short' });
                monthlyStats[key] = { name, revenue: 0, cost: 0, profit: 0 };
            }

            orders.forEach((o: any) => {
                const date = new Date(o.created_at);
                const key = `${date.getFullYear()}-${date.getMonth() + 1}`;

                // Only consider recent orders for the chart, but all for total? 
                // Let's filter totals to current year or all time? User likely wants all time or YTD.
                // For now, All Time KPIs, 6 Month Chart.

                const oRev = o.total_price || 0;
                const oCost = o.total_cost || 0;

                revenue += oRev;
                cost += oCost;
                count++;

                if (monthlyStats[key]) {
                    monthlyStats[key].revenue += oRev;
                    monthlyStats[key].cost += oCost;
                    monthlyStats[key].profit += (oRev - oCost);
                }
            });

            const profit = revenue - cost;
            const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

            setMetrics({
                totalRevenue: revenue,
                totalCost: cost,
                totalProfit: profit,
                avgMargin: margin,
                orderCount: count
            });

            setMonthlyData(Object.values(monthlyStats));

            setLoading(false);
        } catch (error) {
            console.error('Error loading reports:', error);
            setLoading(false);
        }
    };




    // --- Product Stats Logic (Merged from ProductPricing) ---
    const [stats, setStats] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        calculateProductStats();
    }, [searchTerm, monthlyData]); // Recalc when data loaded

    const calculateProductStats = async () => {
        // Fetch all order items with client info
        const { data: items } = await (supabase as any)
            .from('order_items')
            .select(`
             product_type,
             quantity,
             total_price,
             unit_price,
             cost_price,
             orders (
                 status,
                 clients (name)
             )
         `)
            .neq('orders.status', 'Cancelled');

        if (!items) return;

        const term = searchTerm.toLowerCase();

        // 1. Filter
        const filtered = items.filter((item: any) => {
            if (!term) return true;
            const pName = (item.product_type || '').toLowerCase();
            const cName = (item.orders?.clients?.name || '').toLowerCase();
            return pName.includes(term) || cName.includes(term);
        });

        // 2. Aggregate
        const aggregation: Record<string, any> = {};

        filtered.forEach((item: any) => {
            const description = item.product_type || 'Unknown Product';
            const client = item.orders?.clients?.name || 'Unknown Client';
            const key = `${client}-${description}`;

            if (!aggregation[key]) {
                aggregation[key] = {
                    clientName: client,
                    productName: description,
                    totalQuantity: 0,
                    totalRevenue: 0,
                    totalCost: 0,
                    orderCount: 0
                };
            }

            aggregation[key].totalQuantity += (item.quantity || 0);
            aggregation[key].totalRevenue += (item.total_price || 0);
            aggregation[key].totalCost += (item.cost_price || 0); // aggregated cost
            aggregation[key].orderCount += 1;
        });

        // 3. Array & Sort
        const arr = Object.values(aggregation).map(stat => ({
            ...stat,
            avgPrice: stat.totalQuantity > 0 ? stat.totalRevenue / stat.totalQuantity : 0,
            avgMargin: stat.totalRevenue > 0 ? ((stat.totalRevenue - stat.totalCost) / stat.totalRevenue) * 100 : 0
        }));

        arr.sort((a, b) => b.totalRevenue - a.totalRevenue);
        setStats(arr);
    };


    if (loading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            <h1 className="text-3xl font-bold text-primary">Profitability & Reporting</h1>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card p-4 flex items-center gap-4 border-l-4 border-emerald-500">
                    <div className="p-3 bg-emerald-100 rounded-full text-emerald-600">
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold">Total Revenue</p>
                        <p className="text-2xl font-bold text-gray-800">€{metrics.totalRevenue.toFixed(2)}</p>
                    </div>
                </div>

                <div className="card p-4 flex items-center gap-4 border-l-4 border-blue-500">
                    <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold">Gross Profit</p>
                        <p className="text-2xl font-bold text-gray-800">€{metrics.totalProfit.toFixed(2)}</p>
                    </div>
                </div>

                <div className="card p-4 flex items-center gap-4 border-l-4 border-amber-500">
                    <div className="p-3 bg-amber-100 rounded-full text-amber-600">
                        <TrendingDown size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold">Total Cost</p>
                        <p className="text-2xl font-bold text-gray-800">€{metrics.totalCost.toFixed(2)}</p>
                    </div>
                </div>

                <div className="card p-4 flex items-center gap-4 border-l-4 border-purple-500">
                    <div className="p-3 bg-purple-100 rounded-full text-purple-600">
                        <Package size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold">Avg Margin</p>
                        <p className={clsx("text-2xl font-bold", metrics.avgMargin >= 30 ? "text-emerald-600" : "text-amber-600")}>
                            {metrics.avgMargin.toFixed(1)}%
                        </p>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="flex gap-4 mb-6">
                <button
                    className={clsx("px-4 py-2 rounded-lg font-medium transition-colors", searchTerm === 'general' ? "bg-primary text-white" : "bg-white text-gray-600 hover:bg-gray-50")}
                    onClick={() => setSearchTerm('general')}
                >
                    General Profitability
                </button>
                <button
                    className={clsx("px-4 py-2 rounded-lg font-medium transition-colors", searchTerm === 'materials' ? "bg-primary text-white" : "bg-white text-gray-600 hover:bg-gray-50")}
                    onClick={() => setSearchTerm('materials')}
                >
                    Material Usage
                </button>
            </div>

            {searchTerm === 'materials' ? (
                <MaterialUsageReport />
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="card p-6">
                        <h3 className="text-lg font-bold text-gray-700 mb-4">Revenue vs Cost (Last 6 Months)</h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlyData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip formatter={(value: any) => `€${Number(value).toFixed(2)}`} />
                                    <Legend />
                                    <Bar dataKey="revenue" name="Revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="cost" name="Cost" fill="#EF4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="card p-6">
                        <h3 className="text-lg font-bold text-gray-700 mb-4">Profit Trend</h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={monthlyData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip formatter={(value: any) => `€${Number(value).toFixed(2)}`} />
                                    <Legend />
                                    <Line type="monotone" dataKey="profit" name="Net Profit" stroke="#8884d8" strokeWidth={3} dot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* Product Analytics Table */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">Product Analytics</h2>
                        <p className="text-sm text-gray-500">Breakdown by Client and Product</p>
                    </div>

                    {/* Search */}
                    <div className="relative w-full sm:w-64">
                        <input
                            type="text"
                            placeholder="Search Client or Product..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:border-accent-teal outline-none transition-colors text-sm"
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-6 py-3">Client</th>
                                <th className="px-6 py-3">Product</th>
                                <th className="px-6 py-3 text-right">Orders</th>
                                <th className="px-6 py-3 text-right">Qty</th>
                                <th className="px-6 py-3 text-right">Revenue</th>
                                <th className="px-6 py-3 text-right">Cost</th>
                                <th className="px-6 py-3 text-right">Profit</th>
                                <th className="px-6 py-3 text-right">Margin</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {stats.map((stat, i) => (
                                <tr key={i} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-3 font-medium text-gray-700">{stat.clientName}</td>
                                    <td className="px-6 py-3 text-gray-600">{stat.productName}</td>
                                    <td className="px-6 py-3 text-right text-gray-600">{stat.orderCount}</td>
                                    <td className="px-6 py-3 text-right text-gray-600">{stat.totalQuantity}</td>
                                    <td className="px-6 py-3 text-right font-medium text-gray-800">€{stat.totalRevenue.toFixed(2)}</td>
                                    <td className="px-6 py-3 text-right text-gray-500">€{stat.totalCost.toFixed(2)}</td>
                                    <td className="px-6 py-3 text-right font-medium text-green-600">€{(stat.totalRevenue - stat.totalCost).toFixed(2)}</td>
                                    <td className="px-6 py-3 text-right">
                                        <span className={clsx(
                                            "px-2 py-1 rounded-full text-xs font-bold",
                                            stat.avgMargin >= 30 ? "bg-green-100 text-green-700" :
                                                stat.avgMargin >= 10 ? "bg-amber-100 text-amber-700" :
                                                    "bg-red-100 text-red-700"
                                        )}>
                                            {stat.avgMargin.toFixed(1)}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {stats.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-6 py-8 text-center text-gray-400 italic">
                                        No data found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const MaterialUsageReport = () => {
    const [usageData, setUsageData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUsage();
    }, []);

    const fetchUsage = async () => {
        setLoading(true);
        // Default to current month
        const { data, error } = await supabase.rpc('get_monthly_material_usage');
        if (data) {
            setUsageData(data);
        } else {
            console.error(error);
        }
        setLoading(false);
    };

    if (loading) return <div className="p-10 text-center text-gray-500">Loading usage data...</div>;

    const exportCsv = () => {
        const header = ['Material', 'Total Used', 'Unit', 'Usage Count'];
        const rows = usageData.map(r => [r.material_name, r.total_used, r.unit, r.usage_count]);
        const csvContent = "data:text/csv;charset=utf-8," + [header, ...rows].map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `material_usage_${new Date().toISOString().slice(0, 7)}.csv`);
        document.body.appendChild(link);
        link.click();
    };

    return (
        <div className="card p-6 animate-in fade-in">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-xl font-bold text-gray-800">Monthly Material Usage</h3>
                    <p className="text-sm text-gray-500">Aggregated usage for current month (auto-deducted).</p>
                </div>
                <button onClick={exportCsv} className="btn-secondary flex items-center gap-2">
                    <Package size={16} /> Export CSV
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
                        <tr>
                            <th className="px-4 py-3">Material Name</th>
                            <th className="px-4 py-3 text-right">Total Used</th>
                            <th className="px-4 py-3 text-right">Orders</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {usageData.map((row, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium text-gray-700">{row.material_name}</td>
                                <td className="px-4 py-3 text-right font-bold text-primary">
                                    {Number(row.total_used).toFixed(2)} <span className="text-gray-400 text-xs font-normal ml-1">{row.unit}</span>
                                </td>
                                <td className="px-4 py-3 text-right text-gray-600">{row.usage_count}</td>
                            </tr>
                        ))}
                        {usageData.length === 0 && (
                            <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">No usage recorded this month yet.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Reporting;
