import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, TrendingUp, DollarSign, Package, BarChart3 } from 'lucide-react';

interface ProductStats {
    productName: string;
    clientName: string;
    totalQuantity: number;
    totalRevenue: number;
    averagePrice: number;
    orderCount: number;
}

const ProductPricing: React.FC = () => {
    const [stats, setStats] = useState<ProductStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [rawItems, setRawItems] = useState<any[]>([]);

    const [filteredItemsCount, setFilteredItemsCount] = useState(0);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        calculateStats();
    }, [searchTerm, rawItems]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch all order items AND client info
            const { data: items, error } = await (supabase as any)
                .from('order_items')
                .select(`
                    product_type, 
                    quantity, 
                    total_price, 
                    unit_price,
                    orders (
                        clients (
                            name
                        )
                    )
                `);

            if (error) throw error;

            if (items) {
                setRawItems(items);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = () => {
        if (!rawItems.length) {
            setStats([]);
            setTotalRevenue(0);
            setFilteredItemsCount(0);
            return;
        }

        const term = searchTerm.toLowerCase();

        // 1. Filter
        const filteredItems = rawItems.filter(item => {
            if (!term) return true;
            const productName = (item.product_type || '').toLowerCase();
            const clientName = (item.orders?.clients?.name || '').toLowerCase();
            return productName.includes(term) || clientName.includes(term);
        });

        setFilteredItemsCount(filteredItems.length);

        // 2. Aggregate
        const aggregation: Record<string, ProductStats> = {};
        let globalRev = 0;

        filteredItems.forEach((item: any) => {
            const productName = item.product_type || 'Unknown Product';
            const clientName = item.orders?.clients?.name || 'Unknown Client';
            const key = `${clientName}-${productName}`;

            if (!aggregation[key]) {
                aggregation[key] = {
                    productName,
                    clientName,
                    totalQuantity: 0,
                    totalRevenue: 0,
                    averagePrice: 0,
                    orderCount: 0
                };
            }

            aggregation[key].totalQuantity += (item.quantity || 0);
            aggregation[key].totalRevenue += (item.total_price || 0);
            aggregation[key].orderCount += 1;
            globalRev += (item.total_price || 0);
        });

        // 3. Convert to Array & Sort
        const statsArray = Object.values(aggregation).map(stat => ({
            ...stat,
            averagePrice: stat.totalQuantity > 0 ? stat.totalRevenue / stat.totalQuantity : 0
        }));

        statsArray.sort((a, b) => b.totalRevenue - a.totalRevenue);

        setStats(statsArray);
        setTotalRevenue(globalRev);
    };

    if (loading && !rawItems.length) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
                        <BarChart3 className="text-accent-teal" />
                        Product Analytics
                    </h1>
                    <p className="text-gray-500">Performance insights based on order history.</p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-64">
                    <input
                        type="text"
                        placeholder="Search Client or Product..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:border-accent-teal outline-none transition-colors"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                    </div>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card border-l-4 border-accent-teal">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Total Revenue</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">€{totalRevenue.toFixed(2)}</p>
                        </div>
                        <div className="bg-teal-50 p-3 rounded-full text-accent-teal">
                            <DollarSign size={24} />
                        </div>
                    </div>
                </div>

                <div className="card border-l-4 border-accent-lime">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Top Product</p>
                            <p className="text-xl font-bold text-gray-900 mt-1 truncate max-w-[150px]" title={stats[0]?.productName}>
                                {stats[0]?.productName || 'N/A'}
                            </p>
                        </div>
                        <div className="bg-lime-50 p-3 rounded-full text-lime-600">
                            <TrendingUp size={24} />
                        </div>
                    </div>
                </div>

                <div className="card border-l-4 border-purple-400">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Total Units Sold</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                {stats.reduce((acc, curr) => acc + curr.totalQuantity, 0)}
                            </p>
                        </div>
                        <div className="bg-purple-50 p-3 rounded-full text-purple-600">
                            <Package size={24} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Table */}
            <div className="bg-white rounded-lg shadow ring-1 ring-gray-900/5 sm:rounded-lg overflow-hidden">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Revenue Breakdown
                    </h3>
                    <span className="text-xs text-gray-400">
                        {filteredItemsCount} items analyzed
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Client
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Product Name
                                </th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Orders
                                </th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Units Sold
                                </th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Avg Price
                                </th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Total Revenue
                                </th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Share
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {stats.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                                        No data found matching your search.
                                    </td>
                                </tr>
                            ) : stats.map((stat, index) => (
                                <tr key={`${stat.clientName}-${stat.productName}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">
                                        {stat.clientName}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {stat.productName}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                        {stat.orderCount}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                        {stat.totalQuantity}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                        €{stat.averagePrice.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold text-right">
                                        €{stat.totalRevenue.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                        {totalRevenue > 0 ? ((stat.totalRevenue / totalRevenue) * 100).toFixed(1) : 0}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ProductPricing;
