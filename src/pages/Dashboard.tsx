import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Users, AlertCircle, Clock, ArrowRight } from 'lucide-react';
import { Database } from '../lib/database.types';

type Order = Database['public']['Tables']['orders']['Row'] & {
    clients: Database['public']['Tables']['clients']['Row'] | null;
};

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        activeOrders: 0,
        totalClients: 0,
        pendingActions: 0
    });
    const [recentOrders, setRecentOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            // 1. Fetch Stats
            const { count: activeCount } = await supabase
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .neq('status', 'Completed')
                .neq('status', 'Cancelled');

            const { count: clientCount } = await supabase
                .from('clients')
                .select('*', { count: 'exact', head: true });

            // "Pending Actions" could be New orders
            const { count: newCount } = await supabase
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'New');

            setStats({
                activeOrders: activeCount || 0,
                totalClients: clientCount || 0,
                pendingActions: newCount || 0
            });

            // 2. Fetch Recent Orders
            const { data: latestOrders } = await supabase
                .from('orders')
                .select('*, clients(*)')
                .order('created_at', { ascending: false })
                .limit(5);

            if (latestOrders) setRecentOrders(latestOrders as any);

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-primary tracking-tight">Dashboard</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Stat Card 1 */}
                <div
                    onClick={() => navigate('/orders')}
                    className="card flex items-center gap-4 border-l-4 border-blue-500 cursor-pointer hover:shadow-md transition-shadow group"
                >
                    <div className="p-3 bg-blue-50 rounded-full text-blue-600 group-hover:scale-110 transition-transform">
                        <ShoppingCart size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">Active Orders</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.activeOrders}</p>
                    </div>
                </div>

                {/* Stat Card 2 */}
                <div
                    onClick={() => navigate('/clients')}
                    className="card flex items-center gap-4 border-l-4 border-accent-teal cursor-pointer hover:shadow-md transition-shadow group"
                >
                    <div className="p-3 bg-teal-50 rounded-full text-accent-teal group-hover:scale-110 transition-transform">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">Total Clients</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalClients}</p>
                    </div>
                </div>

                {/* Stat Card 3 */}
                <div
                    onClick={() => navigate('/orders')}
                    className="card flex items-center gap-4 border-l-4 border-amber-400 cursor-pointer hover:shadow-md transition-shadow group"
                >
                    <div className="p-3 bg-amber-50 rounded-full text-amber-600 group-hover:scale-110 transition-transform">
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">New Orders</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.pendingActions}</p>
                    </div>
                </div>
            </div>

            {/* Recent Activity Table */}
            <div className="card min-h-[400px] overflow-hidden p-0">
                <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Clock size={18} className="text-gray-400" />
                        Recent Activity
                    </h2>
                    <Link to="/orders" className="text-sm text-accent-teal hover:text-teal-700 font-medium flex items-center hover:underline">
                        View All Orders <ArrowRight size={14} className="ml-1" />
                    </Link>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-gray-400">Loading activity...</div>
                ) : recentOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <p>No recent activity to show</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-white">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Order</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Client</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-50">
                                {recentOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Link to={`/orders/${order.id}`} className="font-mono font-bold text-accent-teal hover:underline text-sm">
                                                {order.order_number}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{order.clients?.name || 'Unknown'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                                                ${order.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                                    order.status === 'New' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-gray-100 text-gray-800'}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                                            {new Date(order.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                                            €{order.total_price?.toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
