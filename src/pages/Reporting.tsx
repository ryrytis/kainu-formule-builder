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



    if (loading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="space-y-6">
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
        </div>
    );
};

export default Reporting;
