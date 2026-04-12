import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

type Order = Database['public']['Tables']['orders']['Row'];

interface OrderSelectProps {
    clientId: string | null;
    value: string | null;
    onChange: (orderId: string) => void;
    className?: string;
}

const OrderSelect: React.FC<OrderSelectProps> = ({ clientId, value, onChange, className }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchOrders = async () => {
            setLoading(true);
            try {
                let query = (supabase as any)
                    .from('orders')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(50);

                if (clientId) {
                    query = query.eq('client_id', clientId);
                }

                // Filter for editable orders
                query = query.in('status', ['New', 'Draft', 'In Progress', 'Invoiced']);

                const { data, error } = await query;

                if (error) throw error;
                setOrders(data || []);
            } catch (error) {
                console.error('Error fetching orders:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, [clientId]);

    const filteredOrders = orders.filter(order =>
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedOrder = orders.find(o => o.id === value);

    return (
        <div className={twMerge("relative", className)}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Existing Order <span className="text-red-500">*</span>
            </label>

            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={clsx(
                        "w-full flex items-center justify-between px-3 py-2 bg-white border rounded-md shadow-sm text-sm text-left focus:outline-none focus:ring-1 focus:ring-accent-teal focus:border-accent-teal",
                        isOpen ? "border-accent-teal ring-1 ring-accent-teal" : "border-gray-300"
                    )}
                >
                    <span className={!selectedOrder ? "text-gray-400" : "text-gray-900"}>
                        {selectedOrder ? `${selectedOrder.order_number} (${selectedOrder.status})` : "Choose an order..."}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 text-gray-400" />
                </button>

                {isOpen && (
                    <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                        <div className="sticky top-0 bg-white px-2 py-1.5 border-b">
                            <input
                                type="text"
                                className="w-full border-none focus:ring-0 text-sm px-2 py-1 text-gray-600 bg-gray-50 rounded"
                                placeholder="Search orders..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoFocus
                            />
                        </div>

                        {loading ? (
                            <div className="px-4 py-2 text-gray-500 flex items-center gap-2">
                                <Loader2 className="animate-spin h-4 w-4" /> Loading...
                            </div>
                        ) : filteredOrders.length === 0 ? (
                            <div className="px-4 py-2 text-gray-500 text-center">
                                No recent orders found for this client.
                            </div>
                        ) : (
                            <>
                                {filteredOrders.map((order) => (
                                    <div
                                        key={order.id}
                                        className={clsx(
                                            "cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-100",
                                            value === order.id ? "bg-accent-teal/10" : ""
                                        )}
                                        onClick={() => {
                                            onChange(order.id);
                                            setIsOpen(false);
                                            setSearchTerm('');
                                        }}
                                    >
                                        <div className="flex flex-col">
                                            <span className="font-medium block truncate text-primary">
                                                {order.order_number}
                                            </span>
                                            <div className="flex justify-between items-center text-[10px] text-gray-400">
                                                <span>{order.status}</span>
                                                <span>{new Date(order.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        {value === order.id && (
                                            <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-accent-teal">
                                                <Check className="h-4 w-4" />
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrderSelect;
