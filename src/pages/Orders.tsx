import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Filter, ChevronDown, ChevronRight, Receipt, Copy, Truck, Loader2, Pencil, Trash2, Printer } from 'lucide-react';
import { Database } from '../lib/database.types';
import { getStatusColor } from '../lib/statusUtils';
import CreateOrderModal from '../components/CreateOrderModal';
import CreateOrderItemModal from '../components/CreateOrderItemModal';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { SaskaitaService } from '../lib/SaskaitaService';
import { VenipakService } from '../lib/VenipakService';
import { generateOrderNumber } from '../lib/orderUtils';
import { SharePointService } from '../lib/SharePointService';

type OrderItem = {
    id: string;
    product_type: string;
    quantity: number;
    total_price: number;
    width?: string;
    height?: string;
    material_id?: string;
    print_type?: string;
    unit_price?: number;
    cost_price?: number;
    margin_percent?: number;
};

type Order = Database['public']['Tables']['orders']['Row'] & {
    clients: {
        name: string;
        email: string;
        phone: string | null;
        company: string | null;
        address: string | null;
        vat_code: string | null;
        city: string | null;
        post_code: string | null;
        parcel_locker: string | null;
    } | null;
    order_items: OrderItem[];
    // Ensure these are typed even if partial
    total_cost?: number;
    profit_margin?: number;
};

const Orders: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());
    const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

    // Server-side search state
    const [debouncedSearch, setDebouncedSearch] = useState('');

    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('All');
    const [statusOptions, setStatusOptions] = useState<string[]>(['All', 'Not Invoiced', 'New', 'Draft', 'Invoiced', 'Completed', 'Cancelled']);

    // Debounce search term
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        const fetchStatuses = async () => {
            try {
                const { data } = await supabase.from('works').select('operation');
                if (data) {
                    const dbStatuses = data.map((w: any) => w.operation);
                    // Combine predefined system statuses with DB statuses
                    setStatusOptions(prev => Array.from(new Set([...prev, ...dbStatuses])));
                }
            } catch (e) {
                console.error('Error fetching statuses:', e);
            }
        };
        fetchStatuses();
    }, []);

    // Item management state
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<any | null>(null);

    const navigate = useNavigate();

    const [openStatusId, setOpenStatusId] = useState<string | null>(null);

    // Inline Editing State
    const [editingCell, setEditingCell] = useState<{ itemId: string, field: 'unit_price' | 'quantity' } | null>(null);
    const [tempValue, setTempValue] = useState<string>('');

    const handleUpdateItem = async (orderId: string, itemId: string, field: 'unit_price' | 'quantity', value: number) => {
        try {
            setEditingCell(null); // Close input immediately

            // Fetch current item to calculate new total correctly
            const { data: currentItems } = await (supabase as any).from('order_items').select('*').eq('id', itemId);
            const item = currentItems?.[0];
            if (!item) return;

            let newTotal = item.total_price;
            let updatePayload: any = {};

            if (field === 'quantity') {
                const currentUnitPrice = item.quantity ? item.total_price / item.quantity : 0;
                newTotal = currentUnitPrice * value;
                updatePayload = { quantity: value, total_price: newTotal };
            } else if (field === 'unit_price') {
                newTotal = value * item.quantity;
                updatePayload = { total_price: newTotal, unit_price: value };
            }

            // Optimistic update
            setOrders(prev => prev.map(o => {
                if (o.id === orderId) {
                    const updatedItems = o.order_items.map(i => i.id === itemId ? { ...i, ...updatePayload } : i);
                    const newOrderTotal = updatedItems.reduce((sum, i) => sum + (i.total_price || 0), 0);
                    return { ...o, total_price: newOrderTotal, order_items: updatedItems };
                }
                return o;
            }));

            const { error } = await (supabase as any).from('order_items').update(updatePayload).eq('id', itemId);
            if (error) throw error;

            // Recalculate Order Total Database Side
            const { data: allItems } = await (supabase as any)
                .from('order_items')
                .select('total_price')
                .eq('order_id', orderId);

            const dbOrderTotal = allItems?.reduce((sum: number, i: any) => sum + (i.total_price || 0), 0) || 0;
            await (supabase as any).from('orders').update({ total_price: dbOrderTotal }).eq('id', orderId);

        } catch (err) {
            console.error('Failed to update item:', err);
            alert('Failed to update item');
            fetchOrders(); // Revert on error
        }
    };

    // navigate is already defined above at line 51, but if it was removed, re-add it too.
    // Looking at previous view_file, navigate was at line 51. My previous edit started at 46.
    // So navigate might have been removed or displaced if line 51 was included in the replacement range.
    // Let's check the file content first.

    const handleStatusChange = async (orderId: string, newStatus: string) => {
        try {
            const { error } = await (supabase as any)
                .from('orders')
                .update({ status: newStatus })
                .eq('id', orderId);

            if (error) throw error;

            // Update local state
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
            setOpenStatusId(null);
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status');
        }
    };

    // ... in render ...

    // State for order status dropdown
    // fetchOrders definition starts below


    const fetchOrders = async () => {
        setLoading(true);
        try {
            let query = (supabase as any)
                .from('orders')
                .select(`
                    *,
                    clients!inner (name, email, phone, company, address, vat_code, city, post_code, parcel_locker, company_code, person_type, delivery_method),
                    order_items (*)
                `)
                .order('created_at', { ascending: false })
                .limit(50);

            if (debouncedSearch) {
                // Search by order number OR client name
                query = query.or(`order_number.ilike.%${debouncedSearch}%,clients.name.ilike.%${debouncedSearch}%`);
            }

            if (statusFilter !== 'All') {
                if (statusFilter === 'Not Invoiced') {
                    // Complex filter: not invoiced AND not Cancelled
                    query = query.eq('invoiced', false).neq('status', 'Cancelled');
                } else {
                    query = query.eq('status', statusFilter);
                }
            }

            const { data, error } = await query;

            if (error) throw error;
            setOrders(data as any);
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    // Re-fetch when search or filter changes
    useEffect(() => {
        fetchOrders();
    }, [debouncedSearch, statusFilter]);

    const toggleExpand = (e: React.MouseEvent, orderId: string) => {
        e.stopPropagation();
        setExpandedOrderIds(prev => {
            const next = new Set(prev);
            if (next.has(orderId)) {
                next.delete(orderId);
            } else {
                next.add(orderId);
            }
            return next;
        });
    };



    const handleDuplicateOrder = async (e: React.MouseEvent, order: Order) => {
        e.stopPropagation();
        if (processingIds.has(order.id)) return;
        setProcessingIds(prev => new Set(prev).add(order.id));

        try {
            const newOrderNumber = await generateOrderNumber(supabase as any);
            const { data: newOrder, error: orderError } = await (supabase as any)
                .from('orders')
                .insert([{
                    client_id: order.client_id,
                    order_number: newOrderNumber,
                    status: 'New',
                    total_price: order.total_price,
                    notes: `Copy of ${order.order_number}. ${order.notes || ''}`
                }])
                .select()
                .single();

            if (orderError) throw orderError;

            if (order.order_items && order.order_items.length > 0) {
                const itemsToInsert = order.order_items.map((item: any) => ({
                    order_id: newOrder.id,
                    product_type: item.product_type,
                    material_id: item.material_id,
                    quantity: item.quantity,
                    width: item.width,
                    height: item.height,
                    print_type: item.print_type,
                    unit_price: item.unit_price,
                    total_price: item.total_price
                }));

                await (supabase as any).from('order_items').insert(itemsToInsert);
            }

            // 3. SharePoint Workflow Trigger
            const { data: clientData } = await (supabase as any)
                .from('clients')
                .select('name')
                .eq('id', order.client_id)
                .single();

            if (clientData?.name && newOrderNumber) {
                console.log("Triggering SharePoint folder creation for duplicated order...");
                SharePointService.createOrderFolder(clientData.name, newOrderNumber, 'New')
                    .then(async (res) => {
                        if (res.success && res.folderUrl) {
                            console.log("Folder created for duplicated order:", res.folderUrl);
                            await (supabase as any)
                                .from('orders')
                                .update({ workflow_link: res.folderUrl })
                                .eq('id', newOrder.id);
                        }
                    })
                    .catch(e => console.error("SharePoint trigger failed for duplicated order", e));
            }

            fetchOrders();
            alert(`Order duplicated: ${newOrderNumber}`);
        } catch (err) {
            console.error('Failed to duplicate:', err);
            alert('Failed to duplicate order.');
        } finally {
            setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(order.id);
                return next;
            });
        }
    };

    const handleSendToSaskaita = async (e: React.MouseEvent, order: Order) => {
        e.stopPropagation();
        if (order.invoiced || processingIds.has(order.id)) return;
        setProcessingIds(prev => new Set(prev).add(order.id));

        try {
            const response = await SaskaitaService.createInvoice(order);
            if (response.success) {
                // Update Supabase
                const { error } = await (supabase as any)
                    .from('orders')
                    .update({ status: 'Invoiced', invoiced: true })
                    .eq('id', order.id);

                if (error) {
                    console.error('Failed to update order status:', error);
                    alert(`Invoice sent (ID: ${response.invoiceId}), but failed to update status locally.`);
                } else {
                    alert(`Invoice Sent! ID: ${response.invoiceId}`);
                    fetchOrders(); // Refresh UI
                }
            } else {
                alert(`Failed: ${response.message}`);
            }
        } catch (error: any) {
            console.error('Failed to send invoice:', error);
            alert(`Error: ${error.message || 'Unknown error'}`);
        } finally {
            setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(order.id);
                return next;
            });
        }
    };

    const handleSendPackage = async (e: React.MouseEvent, order: Order) => {
        e.stopPropagation();
        if (processingIds.has(order.id)) return;
        setProcessingIds(prev => new Set(prev).add(order.id));

        try {
            // 1. Fetch fresh client data to ensure we have latest address/locker settings
            const { data: freshClient } = await (supabase as any)
                .from('clients')
                .select('*')
                .eq('id', order.client_id)
                .single();

            const client = freshClient || order.clients;

            const response = await VenipakService.createShipment({
                order_number: order.order_number,
                client_name: client?.name || 'Unknown',
                client_address: client?.address || '',
                client_phone: client?.phone || '',
                client_city: client?.city || '',
                client_post_code: client?.post_code || '',
                terminal_id: client?.delivery_method === 'Locker' ? client?.parcel_locker : null
            });

            if (response.success) {
                alert(`Package Registered!\nTracking Number: ${response.tracking_number}`);

                try {
                    const tracking = response.tracking_number;
                    const orderNo = order.order_number;

                    if (tracking && orderNo) {
                        const labelRes = await VenipakService.getLabel(tracking);
                        if (labelRes.success && labelRes.url && labelRes.blob) {
                            // window.open(labelRes.url, '_blank'); // Disabled as per user request

                            const base64 = await VenipakService.blobToBase64(labelRes.blob);
                            await SharePointService.uploadShipmentLabel(
                                order.clients?.name || 'Unknown',
                                orderNo,
                                tracking,
                                base64,
                                order.workflow_link
                            );
                            console.log('Label successfully saved to SharePoint via webhook.');

                            // Update order status in database
                            const { error: updateError } = await (supabase as any)
                                .from('orders')
                                .update({
                                    shipped: true,
                                    shipment_number: tracking,
                                    status: 'Shipped'
                                })
                                .eq('id', order.id);

                            if (updateError) {
                                console.error('Error updating order shipped status:', updateError);
                            } else {
                                // Refresh local state
                                setOrders(prev => prev.map(o => o.id === order.id ? { ...o, shipped: true, shipment_number: tracking, status: 'Shipped' } : o));
                            }
                        } else {
                            console.warn('Could not auto-fetch label:', labelRes.error);
                        }
                    }
                } catch (e) {
                    console.warn('Error fetching label or saving to SharePoint:', e);
                }

            } else {
                alert(`Failed to register package: ${response.error}`);
            }
        } catch (error) {
            console.error('Venipak Error:', error);
            alert('Failed to connect to shipping service');
        } finally {
            setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(order.id);
                return next;
            });
        }
    };

    const handleEditItem = (e: React.MouseEvent, orderId: string, item: OrderItem) => {
        e.stopPropagation();
        setSelectedOrderId(orderId);
        setSelectedItem(item);
        setIsItemModalOpen(true);
    };

    const handleDeleteItem = async (e: React.MouseEvent, orderId: string, itemId: string) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this item?')) return;

        try {
            const { error } = await (supabase as any).from('order_items').delete().eq('id', itemId);
            if (error) throw error;

            // Recalculate total
            const { data: allItems } = await (supabase as any)
                .from('order_items')
                .select('total_price')
                .eq('order_id', orderId);

            const newTotal = allItems?.reduce((sum: number, i: any) => sum + (i.total_price || 0), 0) || 0;
            await (supabase as any).from('orders').update({ total_price: newTotal }).eq('id', orderId);

            fetchOrders();
        } catch (err) {
            console.error('Failed to delete item:', err);
            alert('Failed to delete item');
        }
    };

    const addItemToOrder = (e: React.MouseEvent, orderId: string) => {
        e.stopPropagation();
        setSelectedOrderId(orderId);
        setSelectedItem(null);
        setIsItemModalOpen(true);
    };


    const handleDeleteOrder = async (e: React.MouseEvent, orderId: string) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) return;

        try {
            const { error } = await (supabase as any).from('orders').delete().eq('id', orderId);
            if (error) throw error;

            setOrders(prev => prev.filter(o => o.id !== orderId));
            alert('Order deleted successfully');
        } catch (err) {
            console.error('Failed to delete order:', err);
            alert('Failed to delete order. Please try again.');
        }
    };

    // Client-side mapping alias (server-side filtering now handles the logic)
    const filteredOrders = orders;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-primary">Orders</h1>
            </div>

            <div className="card">
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search orders..."
                            className="input-field pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="relative">
                        <button
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className={`flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50 transition-colors ${statusFilter !== 'All' ? 'border-accent-teal text-accent-teal bg-teal-50' : 'border-gray-300 text-gray-700'}`}
                        >
                            <Filter size={20} />
                            {statusFilter === 'All' ? 'Filter' : statusFilter}
                        </button>

                        {isFilterOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-100 py-1 max-h-60 overflow-y-auto">
                                {statusOptions.map(status => (
                                    <button
                                        key={status}
                                        onClick={() => {
                                            setStatusFilter(status);
                                            setIsFilterOpen(false);
                                        }}
                                        className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${statusFilter === status ? 'text-accent-teal font-medium bg-teal-50' : 'text-gray-700'}`}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-separate border-spacing-0">
                        <thead>
                            <tr className="border-b border-gray-100 text-gray-500 text-sm">
                                <th className="py-4 px-4 font-medium w-10"></th>
                                <th className="py-4 px-4 font-medium">Order #</th>
                                <th className="py-4 px-4 font-medium">Client</th>
                                <th className="py-4 px-4 font-medium">Status</th>
                                <th className="py-4 px-4 font-medium">Date</th>
                                <th className="py-4 px-4 font-medium text-right">Total</th>
                                <th className="py-4 px-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="py-8 text-center text-gray-500">Loading orders...</td>
                                </tr>
                            ) : filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-8 text-center text-gray-500">No orders found.</td>
                                </tr>
                            ) : (
                                filteredOrders.map((order) => {
                                    return (
                                        <React.Fragment key={order.id}>
                                            <tr
                                                className="cursor-pointer hover:bg-gray-50 transition-colors group"
                                                onClick={(e) => toggleExpand(e, order.id)}
                                            >
                                                <td className="py-4 px-4">
                                                    {expandedOrderIds.has(order.id) ? (
                                                        <ChevronDown size={18} className="text-gray-400 group-hover:text-primary" />
                                                    ) : (
                                                        <ChevronRight size={18} className="text-gray-400 group-hover:text-primary" />
                                                    )}
                                                </td>
                                                <td className="py-4 px-4 font-medium text-primary">{order.order_number}</td>
                                                <td className="py-4 px-4">{order.clients?.name || 'Unknown Client'}</td>
                                                <td className="py-4 px-4 overflow-visible">
                                                    <div className="relative">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setOpenStatusId(openStatusId === order.id ? null : order.id);
                                                            }}
                                                            className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)} whitespace-nowrap hover:opacity-80 transition-opacity flex items-center gap-1`}
                                                        >
                                                            {order.status}
                                                        </button>
                                                        {openStatusId === order.id && (
                                                            <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-xl z-50 border border-gray-100 py-1 max-h-60 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                                                                {statusOptions.map(status => (
                                                                    <button
                                                                        key={status}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleStatusChange(order.id, status);
                                                                        }}
                                                                        className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${order.status === status ? 'text-accent-teal font-medium bg-teal-50' : 'text-gray-700'}`}
                                                                    >
                                                                        {status}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4 text-gray-500 text-sm whitespace-nowrap">
                                                    {new Date(order.created_at).toISOString().split('T')[0]}
                                                </td>
                                                <td className="py-4 px-4 text-right font-medium">
                                                    <div>€{order.total_price?.toFixed(2) || '0.00'}</div>
                                                    {(order.total_cost || 0) > 0 && (
                                                        <div className="text-[10px] text-gray-400 mt-1" title="Estimated Profit">
                                                            <span className="text-emerald-600 font-bold">
                                                                +€{((order.total_price || 0) - (order.total_cost || 0)).toFixed(2)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex justify-end gap-1">
                                                        {order.workflow_link && (
                                                            <a
                                                                href={order.workflow_link}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                                title="Open Workflow"
                                                            >
                                                                <img src="https://res-1.cdn.office.net/files/fabric-cdn-prod_20221209.001/assets/brand-icons/product/svg/sharepoint_48x1.svg" alt="SP" className="w-4 h-4" />
                                                            </a>
                                                        )}
                                                        <button
                                                            onClick={(e) => handleSendToSaskaita(e, order)}
                                                            disabled={!!order.invoiced || processingIds.has(order.id)}
                                                            className={`p-1.5 rounded-md transition-colors flex items-center gap-1 group/invoice ${order.invoiced
                                                                ? 'text-green-600 bg-green-50 cursor-not-allowed'
                                                                : 'text-orange-600 hover:bg-orange-50'
                                                                }`}
                                                            title={order.invoiced ? "Already Invoiced" : "Generate Invoice (Saskaita123)"}
                                                        >
                                                            {processingIds.has(order.id) ? <Loader2 size={16} className="animate-spin" /> : <Receipt size={16} />}
                                                            <span className="text-[10px] font-bold hidden group-hover/invoice:block transition-all">
                                                                {order.invoiced ? 'SENT' : 'INVOICE'}
                                                            </span>
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleSendPackage(e, order)}
                                                            disabled={processingIds.has(order.id)}
                                                            className={clsx(
                                                                "p-1.5 rounded-md transition-colors",
                                                                order.shipped ? "text-green-600 bg-green-50" : "text-indigo-600 hover:bg-indigo-50"
                                                            )}
                                                            title={order.shipped ? "Package Shipped" : "Send Cargo (Venipak)"}
                                                        >
                                                            <Truck size={16} />
                                                        </button>
                                                        <button
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                const tracking = prompt('Enter Venipak tracking number:');
                                                                if (!tracking) return;

                                                                const res = await VenipakService.getLabel(tracking);
                                                                if (res.success && res.url) {
                                                                    window.open(res.url, '_blank');
                                                                } else {
                                                                    alert('Error: ' + res.error);
                                                                }
                                                            }}
                                                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
                                                            title="Print Existing Label"
                                                        >
                                                            <Printer size={16} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleDuplicateOrder(e, order)}
                                                            disabled={processingIds.has(order.id)}
                                                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
                                                            title="Clone Order"
                                                        >
                                                            <Copy size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => navigate(`/orders/${order.id}`)}
                                                            className="p-1.5 text-gray-400 hover:text-primary transition-colors ml-1"
                                                            title="View Details"
                                                        >
                                                            <ChevronRight size={18} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleDeleteOrder(e, order.id)}
                                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors ml-1"
                                                            title="Delete Order"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {expandedOrderIds.has(order.id) && (
                                                <tr className="bg-gray-50/50">
                                                    <td colSpan={7} className="px-12 py-4">
                                                        <div className="border-l-2 border-accent-teal pl-6 py-2 space-y-3">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Order Items</h4>
                                                                <button
                                                                    onClick={(e) => addItemToOrder(e, order.id)}
                                                                    className="text-xs text-accent-teal hover:text-primary flex items-center gap-1 font-bold transition-colors"
                                                                >
                                                                    <Plus size={14} /> Add Item
                                                                </button>
                                                            </div>
                                                            {order.order_items && order.order_items.length > 0 ? (
                                                                <div className="grid grid-cols-1 gap-2">
                                                                    {order.order_items.map((item) => {
                                                                        const unitPrice = item.total_price && item.quantity ? item.total_price / item.quantity : 0;
                                                                        return (
                                                                            <div key={item.id} className="group relative flex justify-between items-center bg-white p-3 rounded shadow-sm border border-gray-100 hover:border-accent-teal transition-colors">
                                                                                <div className="flex flex-col">
                                                                                    {/* Left Side: Product Name + Dimensions */}
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className="text-sm font-bold text-primary text-lg">{item.product_type}</span>
                                                                                        {item.width && item.height && <span className="text-gray-400 text-sm">({item.width} x {item.height}mm)</span>}
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex items-center gap-6">
                                                                                    {/* Right Side: Details + Total + Actions */}

                                                                                    {/* Moved Details Block: Qty | Unit Price */}
                                                                                    <div className="flex items-center gap-3 text-sm text-gray-700">
                                                                                        {editingCell?.itemId === item.id && editingCell?.field === 'quantity' ? (
                                                                                            <input
                                                                                                autoFocus
                                                                                                type="number"
                                                                                                className="w-16 p-0.5 text-sm border border-accent-teal rounded outline-none font-bold text-gray-700"
                                                                                                value={tempValue}
                                                                                                onChange={e => setTempValue(e.target.value)}
                                                                                                onBlur={() => {
                                                                                                    if (tempValue) handleUpdateItem(order.id, item.id, 'quantity', parseInt(tempValue));
                                                                                                    else setEditingCell(null);
                                                                                                }}
                                                                                                onKeyDown={e => {
                                                                                                    if (e.key === 'Enter') handleUpdateItem(order.id, item.id, 'quantity', parseInt(tempValue || '0'));
                                                                                                    else if (e.key === 'Escape') setEditingCell(null);
                                                                                                }}
                                                                                                onClick={e => e.stopPropagation()}
                                                                                            />
                                                                                        ) : (
                                                                                            <span
                                                                                                className="cursor-pointer hover:bg-gray-100 px-1 rounded transition-colors hover:text-accent-teal font-medium"
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    setEditingCell({ itemId: item.id, field: 'quantity' });
                                                                                                    setTempValue(item.quantity?.toString() || '0');
                                                                                                }}
                                                                                                title="Click to edit Quantity"
                                                                                            >
                                                                                                {item.quantity} vnt
                                                                                            </span>
                                                                                        )}

                                                                                        {editingCell?.itemId === item.id && editingCell?.field === 'unit_price' ? (
                                                                                            <input
                                                                                                autoFocus
                                                                                                type="number"
                                                                                                step="0.0001"
                                                                                                className="w-24 p-0.5 text-sm border border-accent-teal rounded outline-none font-medium text-accent-teal bg-teal-50"
                                                                                                value={tempValue}
                                                                                                onChange={e => setTempValue(e.target.value)}
                                                                                                onBlur={() => {
                                                                                                    if (tempValue) handleUpdateItem(order.id, item.id, 'unit_price', parseFloat(tempValue));
                                                                                                    else setEditingCell(null);
                                                                                                }}
                                                                                                onKeyDown={e => {
                                                                                                    if (e.key === 'Enter') handleUpdateItem(order.id, item.id, 'unit_price', parseFloat(tempValue || '0'));
                                                                                                    else if (e.key === 'Escape') setEditingCell(null);
                                                                                                }}
                                                                                                onClick={e => e.stopPropagation()}
                                                                                            />
                                                                                        ) : (
                                                                                            <span
                                                                                                className="text-accent-teal font-medium bg-teal-50 px-1.5 rounded cursor-pointer hover:bg-teal-100 transition-colors"
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    setEditingCell({ itemId: item.id, field: 'unit_price' });
                                                                                                    setTempValue(unitPrice.toFixed(4));
                                                                                                }}
                                                                                                title="Click to edit Unit Price"
                                                                                            >
                                                                                                @ €{unitPrice.toFixed(4)}/vnt
                                                                                            </span>
                                                                                        )}
                                                                                    </div>

                                                                                    {/* Cost & Margin Info */}
                                                                                    <div className="flex flex-col items-end mr-4 text-xs">
                                                                                        <span className="text-gray-400" title="Unit Cost">
                                                                                            Cost: €{item.cost_price?.toFixed(2) || '0.00'}
                                                                                        </span>
                                                                                        <span className={clsx(
                                                                                            "font-bold",
                                                                                            (!item.margin_percent) ? "text-gray-400" :
                                                                                                (item.margin_percent || 0) >= 30 ? "text-emerald-600" :
                                                                                                    (item.margin_percent || 0) >= 10 ? "text-amber-600" : "text-red-600"
                                                                                        )} title="Margin">
                                                                                            {item.margin_percent?.toFixed(1) || '0.0'}%
                                                                                        </span>
                                                                                    </div>

                                                                                    <div className="text-right min-w-[80px]">
                                                                                        <div className="text-sm font-bold text-accent-teal">
                                                                                            €{item.total_price?.toFixed(2)}
                                                                                        </div>
                                                                                        <span className="text-[10px] text-gray-400">Total</span>
                                                                                    </div>
                                                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                        <button
                                                                                            onClick={(e) => handleEditItem(e, order.id, item)}
                                                                                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                                                            title="Edit Item Details"
                                                                                        >
                                                                                            <Pencil size={14} />
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={(e) => handleDeleteItem(e, order.id, item.id)}
                                                                                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                                                            title="Delete Item"
                                                                                        >
                                                                                            <Trash2 size={14} />
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}

                                                                </div>
                                                            ) : (
                                                                <div className="bg-white/50 border border-dashed border-gray-200 rounded-md p-4 text-center">
                                                                    <p className="text-sm text-gray-400 italic">No items found for this order.</p>
                                                                    <button
                                                                        onClick={(e) => addItemToOrder(e, order.id)}
                                                                        className="mt-2 text-xs text-accent-teal hover:underline font-bold"
                                                                    >
                                                                        Create first item
                                                                    </button>
                                                                </div>
                                                            )}
                                                            {order.notes && (
                                                                <div className="mt-4 pt-4 border-t border-gray-100">
                                                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Notes</h4>
                                                                    <p className="text-sm text-gray-600">{order.notes}</p>
                                                                </div>
                                                            )}

                                                            {/* Order Profitability Summary Block */}
                                                            {(order.total_cost || 0) > 0 && (
                                                                <div className="mt-2 pt-3 border-t border-gray-100 flex justify-end gap-6 text-xs">
                                                                    <div className="text-right">
                                                                        <span className="block text-gray-400">Total Cost</span>
                                                                        <span className="font-medium">€{order.total_cost?.toFixed(2)}</span>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <span className="block text-gray-400">Net Profit</span>
                                                                        <span className="font-bold text-emerald-600">€{((order.total_price || 0) - (order.total_cost || 0)).toFixed(2)}</span>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <span className="block text-gray-400">Margin</span>
                                                                        <span className={clsx("font-bold",
                                                                            ((order.total_price || 0) - (order.total_cost || 0)) / (order.total_price || 1) > 0.3 ? "text-emerald-600" : "text-amber-500"
                                                                        )}>
                                                                            {((((order.total_price || 0) - (order.total_cost || 0)) / (order.total_price || 1)) * 100).toFixed(1)}%
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <CreateOrderModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onOrderCreated={fetchOrders}
            />

            {
                selectedOrderId && (
                    <CreateOrderItemModal
                        isOpen={isItemModalOpen}
                        onClose={() => {
                            setIsItemModalOpen(false);
                            setSelectedOrderId(null);
                            setSelectedItem(null);
                        }}
                        onItemAdded={fetchOrders}
                        orderId={selectedOrderId}
                        item={selectedItem}
                    />
                )
            }
        </div >
    );
};

export default Orders;
