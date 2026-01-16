import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { ArrowLeft, Plus, Loader2, Copy, FileText, Share2, Pencil, Trash2, Truck } from 'lucide-react';
import { clsx } from 'clsx';
import { getStatusColor } from '../lib/statusUtils';
import CreateOrderItemModal from '../components/CreateOrderItemModal';
import InvoicePreviewModal from '../components/InvoicePreviewModal';
import { SaskaitaService } from '../lib/SaskaitaService';
import { VenipakService } from '../lib/VenipakService';
import OrderFiles from '../components/OrderFiles';
import { SharePointService } from '../lib/SharePointService';
import { generateOrderNumber } from '../lib/orderUtils';
import TaskList, { Task } from '../components/TaskList';
import CreateTaskModal from '../components/CreateTaskModal';

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
    } | null;
    order_items: any[];
    workflow_link?: string | null;
};

const OrderDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [sendingInvoice, setSendingInvoice] = useState(false);
    const [sendingPackage, setSendingPackage] = useState(false);
    const [activeTab, setActiveTab] = useState<'items' | 'files' | 'invoices' | 'tasks'>('items');
    const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any | null>(null);

    // Tasks State
    const [tasks, setTasks] = useState<Task[]>([]);
    const [users, setUsers] = useState<{ id: string, email: string }[]>([]);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

    const fetchOrderDetails = React.useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const { data, error } = await (supabase as any)
                .from('orders')
                .select(`
          *,
          clients (name, email, phone, company, address, vat_code, city, post_code, company_code, person_type, parcel_locker, delivery_method),
          order_items (*)
        `)
                .eq('id', id)
                .single();

            if (error) throw error;
            setOrder(data);
        } catch (error) {
            console.error('Error fetching order details:', error);
        } finally {
            setLoading(false);
        }
    }, [id]);

    const fetchTasks = React.useCallback(async () => {
        if (!id) return;
        try {
            const { data, error } = await (supabase as any)
                .from('tasks')
                .select(`
                    *,
                    assignee:users!assigned_to(email),
                    creator:users!created_by(email),
                    order:orders(order_number)
                `)
                .eq('order_id', id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTasks(data || []);
        } catch (error) {
            console.error('Error fetching tasks:', error);
        }
    }, [id]);

    const fetchUsers = async () => {
        const { data } = await supabase.from('users').select('id, email');
        setUsers(data || []);
    };

    useEffect(() => {
        fetchOrderDetails();
        fetchTasks();
        fetchUsers();
    }, [fetchOrderDetails, fetchTasks]);

    const handleDuplicateOrder = async () => {
        if (!order) return;

        try {
            // 1. Create New Order
            const newOrderNumber = await generateOrderNumber(supabase as any);

            const { data: newOrder, error: orderError } = await (supabase as any)
                .from('orders')
                .insert([{
                    client_id: order.client_id,
                    order_number: newOrderNumber,
                    status: 'New',
                    total_price: 0, // Will update after items
                    notes: `Copy of ${order.order_number}. ${order.notes || ''}`
                }])
                .select()
                .single();

            if (orderError) throw orderError;

            // 2. Duplicate Items
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

                const { error: itemsError } = await (supabase as any)
                    .from('order_items')
                    .insert(itemsToInsert);

                if (itemsError) throw itemsError;

                // Update total price from original
                await (supabase as any)
                    .from('orders')
                    .update({ total_price: order.total_price })
                    .eq('id', newOrder.id);
            }

            // 3. SharePoint Workflow Trigger
            if (order.clients?.name && newOrderNumber) {
                console.log("Triggering SharePoint folder creation for duplicated order...");
                SharePointService.createOrderFolder(order.clients.name, newOrderNumber, 'New')
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

            // 4. Navigate to new order
            navigate(`/orders/${newOrder.id}`);
            window.location.reload();

        } catch (err) {
            console.error('Failed to duplicate:', err);
            alert('Failed to duplicate order.');
        }
    };

    const handleSendToSaskaita = async () => {
        if (!order || order.invoiced) return;
        setSendingInvoice(true);
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
                    // Refresh order details
                    fetchOrderDetails();
                }
            } else {
                alert(`Failed: ${response.message}`);
            }
        } catch (error: any) {
            console.error('Failed to send invoice:', error);
            alert(`Error: ${error.message || 'Unknown error'}`);
        } finally {
            setSendingInvoice(false);
        }
    };

    const handleSendPackage = async () => {
        if (!order) return;
        setSendingPackage(true);
        try {
            const response = await VenipakService.createShipment({
                order_number: order.order_number,
                client_name: order.clients?.name || 'Unknown',
                client_address: order.clients?.address || '',
                client_phone: order.clients?.phone || '',
                client_city: order.clients?.city || '',
                client_post_code: order.clients?.post_code || '',
                terminal_id: (order.clients as any)?.delivery_method === 'Locker' ? (order.clients as any)?.parcel_locker : null
            });

            if (response.success) {
                alert(`Package Registered!\nTracking Number: ${response.tracking_number}`);

                // --- Automation: Fetch Label and Save to SharePoint ---
                try {
                    console.log('Automating label save to SharePoint...');
                    const tracking = response.tracking_number;
                    const orderNo = order.order_number;

                    if (tracking && orderNo) {
                        const labelRes = await VenipakService.getLabel(tracking);
                        if (labelRes.success && labelRes.blob && labelRes.url) {
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
                                setOrder({ ...order, shipped: true, shipment_number: tracking, status: 'Shipped' });
                            }
                        }
                    }
                } catch (spError) {
                    console.error('SharePoint Automation Error:', spError);
                }
                // ------------------------------------------------------
            } else {
                alert(`Failed to register package: ${response.error}`);
            }
        } catch (error) {
            console.error('Venipak Error:', error);
            alert('Failed to connect to shipping service');
        } finally {
            setSendingPackage(false);
        }
    };

    const handleEditItem = (item: any) => {
        setSelectedItem(item);
        setIsAddItemModalOpen(true);
    };

    const handleDeleteItem = async (itemId: string) => {
        if (!confirm('Are you sure you want to delete this item?')) return;
        try {
            const { error } = await supabase.from('order_items').delete().eq('id', itemId);
            if (error) throw error;

            // Recalculate Order Total Price
            const { data: allItems } = await (supabase as any)
                .from('order_items')
                .select('total_price')
                .eq('order_id', id);

            const newOrderTotal = allItems?.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0) || 0;

            await (supabase as any)
                .from('orders')
                .update({ total_price: newOrderTotal })
                .eq('id', id);

            fetchOrderDetails();
        } catch (err: any) {
            console.error('Error deleting item:', err);
            alert('Failed to delete item');
        }
    };


    const [statusOptions, setStatusOptions] = useState<string[]>(['New', 'Draft', 'Invoiced', 'Completed', 'Cancelled']);
    const [isStatusOpen, setIsStatusOpen] = useState(false);

    useEffect(() => {
        const fetchStatuses = async () => {
            try {
                const { data } = await supabase.from('works').select('operation');
                if (data) {
                    const dbStatuses = data.map((w: any) => w.operation);
                    setStatusOptions(prev => Array.from(new Set([...prev, ...dbStatuses])));
                }
            } catch (e) {
                console.error('Error fetching statuses:', e);
            }
        };
        fetchStatuses();
    }, []);

    const handleStatusChange = async (newStatus: string) => {
        if (!order) return;
        try {
            const { error } = await (supabase as any)
                .from('orders')
                .update({ status: newStatus })
                .eq('id', order.id);

            if (error) throw error;

            setOrder({ ...order, status: newStatus });
            setIsStatusOpen(false);
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="text-center py-12">
                <h2 className="text-xl font-semibold text-gray-700">Order not found</h2>
                <button onClick={() => navigate('/')} className="mt-4 text-accent-teal hover:underline">
                    Return to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/orders')}
                        className="flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                    >
                        <ArrowLeft size={20} />
                        <span className="font-medium">Back to Orders</span>
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-primary flex items-center gap-3">
                            {order.order_number}
                            <div className="relative">
                                <button
                                    onClick={() => setIsStatusOpen(!isStatusOpen)}
                                    className={clsx(
                                        "text-sm px-3 py-1 rounded-full font-medium cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1",
                                        getStatusColor(order.status)
                                    )}
                                >
                                    {order.status}
                                </button>
                                {isStatusOpen && (
                                    <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-md shadow-lg z-20 border border-gray-100 py-1 max-h-60 overflow-y-auto">
                                        {statusOptions.map(status => (
                                            <button
                                                key={status}
                                                onClick={() => handleStatusChange(status)}
                                                className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${order.status === status ? 'text-accent-teal font-medium bg-teal-50' : 'text-gray-700'}`}
                                            >
                                                {status}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </h1>
                        <p className="text-gray-500 text-sm">
                            Created on {new Date(order.created_at).toLocaleDateString()}
                        </p>
                    </div>
                </div>

                <div className="flex gap-2">
                    {order.workflow_link && (
                        <a
                            href={order.workflow_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary flex items-center gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                            title="Open in SharePoint"
                        >
                            <img src="https://res-1.cdn.office.net/files/fabric-cdn-prod_20221209.001/assets/brand-icons/product/svg/sharepoint_48x1.svg" alt="SP" className="w-4 h-4" />
                            Workflow
                        </a>
                    )}

                    <div className="flex bg-white rounded-md border border-gray-200 divide-x divide-gray-200">
                        <button
                            className={clsx("px-4 py-2 text-sm font-medium transition-colors", order.invoiced ? "bg-green-50 text-green-700" : "text-gray-500 hover:bg-gray-50")}
                            // TODO: Add toggle logic
                            title="Toggle Invoiced Status"
                        >
                            Invoiced
                        </button>
                        <button
                            className={clsx("px-4 py-2 text-sm font-medium transition-colors", order.shipped ? "bg-green-50 text-green-700" : "text-gray-500 hover:bg-gray-50")}
                            // TODO: Add toggle logic
                            title="Toggle Shipped Status"
                        >
                            Shipped
                        </button>
                    </div>

                    <button
                        onClick={() => setIsInvoiceModalOpen(true)}
                        className="btn-secondary flex items-center gap-2"
                        title="Preview Invoice"
                    >
                        <FileText size={18} />
                    </button>

                    <button
                        onClick={handleSendToSaskaita}
                        disabled={sendingInvoice || !!order.invoiced}
                        className={`flex items-center gap-2 ${order.invoiced ? 'btn-secondary text-green-700 bg-green-50 pointer-events-none' : 'btn-accent'}`}
                        title={order.invoiced ? "Invoice Already Sent" : "Send to Saskaita123"}
                    >
                        {sendingInvoice ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />}
                        {order.invoiced ? 'Invoice Sent' : 'Send to Saskaita123'}
                    </button>

                    <button
                        onClick={handleDuplicateOrder}
                        className="btn-secondary flex items-center gap-2 px-3"
                        title="Duplicate Order"
                    >
                        <Copy size={18} />
                    </button>

                    <button
                        onClick={handleSendPackage}
                        disabled={sendingPackage}
                        className={clsx(
                            "btn-secondary flex items-center gap-2",
                            order.shipped ? "text-green-600 border-green-200 bg-green-50" : "text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                        )}
                        title={order.shipped ? "Package Shipped" : "Book Delivery"}
                    >
                        {sendingPackage ? <Loader2 size={18} className="animate-spin" /> : <Truck size={18} />}
                        {order.shipped ? 'Shipped' : 'Send'}
                    </button>
                </div>
            </div>

            {/* Client Info Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card md:col-span-2">
                    <h3 className="section-title">Client Information</h3>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                            <p className="label">Client Name</p>
                            <p className="font-medium text-gray-900">{order.clients?.name}</p>
                            {order.clients?.company && <p className="text-sm text-gray-500">{order.clients.company}</p>}
                        </div>
                        <div>
                            <p className="label">Contact Info</p>
                            <p className="text-gray-900">{order.clients?.email}</p>
                            <p className="text-gray-900">{order.clients?.phone}</p>
                        </div>
                        <div className="col-span-2">
                            <p className="label">Order Notes</p>
                            <p className="text-gray-700 bg-gray-50 p-3 rounded-md text-sm min-h-[60px]">
                                {order.notes || "No notes provided."}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <h3 className="section-title">Summary</h3>
                    <div className="space-y-3 mt-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Subtotal</span>
                            <span className="font-medium">€{(order.total_price || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">VAT (21%)</span>
                            <span className="font-medium">€{((order.total_price || 0) * 0.21).toFixed(2)}</span>
                        </div>
                        <div className="border-t pt-3 flex justify-between items-center">
                            <span className="font-bold text-gray-900">Total</span>
                            <span className="font-bold text-xl text-primary">
                                €{((order.total_price || 0) * 1.21).toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    {['items', 'files', 'invoices', 'tasks'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={clsx(
                                "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize",
                                activeTab === tab
                                    ? "border-accent-teal text-accent-teal"
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            )}
                        >
                            Order {tab}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="min-h-[300px]">
                {activeTab === 'items' && (
                    <div className="bg-white rounded-lg shadow ring-1 ring-gray-900/5 sm:rounded-lg">
                        <div className="flex items-center justify-between p-4 border-b border-gray-100">
                            <h3 className="text-base font-semibold leading-6 text-gray-900">Items List</h3>
                            <button
                                onClick={() => setIsAddItemModalOpen(true)}
                                className="btn-accent px-3 py-1.5 text-sm flex items-center gap-2"
                            >
                                <Plus size={16} /> Add Item
                            </button>
                        </div>
                        <table className="min-w-full divide-y divide-gray-300">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Product</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Details</th>
                                    <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Qty</th>
                                    <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Price</th>
                                    <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Total</th>
                                    <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {order.order_items && order.order_items.length > 0 ? (
                                    order.order_items.map((item: any) => (
                                        <tr key={item.id}>
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                                                {item.product_type}
                                            </td>
                                            <td className="px-3 py-4 text-sm text-gray-500">
                                                <div className="flex flex-col">
                                                    <span>{item.paper_type || item.material_id}</span>
                                                    <span className="text-xs text-gray-400">{item.print_type}</span>
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-right">
                                                {item.quantity}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-right">
                                                €{item.unit_price}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 font-medium text-right">
                                                €{(item.total_price || 0)}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleEditItem(item)}
                                                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                        title="Edit Item"
                                                    >
                                                        <Pencil size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteItem(item.id)}
                                                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                        title="Delete Item"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-gray-500">
                                            No items added yet. Click "Add Item" to start.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'files' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {order.id && <OrderFiles orderId={order.id} />}
                    </div>
                )}

                {
                    activeTab === 'invoices' && (
                        <div className="bg-white rounded-lg shadow ring-1 ring-gray-900/5 sm:rounded-lg divide-y divide-gray-200">
                            <div className="p-4 flex items-center justify-between bg-gray-50">
                                <h3 className="text-base font-semibold text-gray-900">Invoices</h3>
                                <button
                                    onClick={handleSendToSaskaita}
                                    disabled={sendingInvoice}
                                    className="btn-accent text-sm flex items-center gap-2"
                                >
                                    {sendingInvoice ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
                                    Send to Saskaita123
                                </button>
                            </div>
                            <div className="p-8 text-center text-gray-500">
                                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                                <p>No invoices generated yet.</p>
                            </div>
                        </div>
                    )
                }

                {activeTab === 'tasks' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-white rounded-lg shadow ring-1 ring-gray-900/5 sm:rounded-lg">
                            <div className="flex items-center justify-between p-4 border-b border-gray-100">
                                <h3 className="text-base font-semibold leading-6 text-gray-900">Task List</h3>
                                <button
                                    onClick={() => setIsTaskModalOpen(true)}
                                    className="btn-accent px-3 py-1.5 text-sm flex items-center gap-2"
                                >
                                    <Plus size={16} /> Add Task
                                </button>
                            </div>
                            <div className="p-4">
                                <TaskList
                                    tasks={tasks}
                                    onTaskUpdated={fetchTasks}
                                    emptyMessage="No tasks for this order."
                                    hideOrderLink={true}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div >

            <CreateOrderItemModal
                isOpen={isAddItemModalOpen}
                onClose={() => {
                    setIsAddItemModalOpen(false);
                    setSelectedItem(null);
                }}
                onItemAdded={fetchOrderDetails}
                orderId={order.id}
                item={selectedItem}
            />

            <CreateTaskModal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                onTaskCreated={fetchTasks}
                users={users}
                orders={order ? [order as any] : []}
                initialOrderId={order.id}
            />

            <InvoicePreviewModal
                isOpen={isInvoiceModalOpen}
                onClose={() => setIsInvoiceModalOpen(false)}
                order={order}
            />
        </div >
    );
};

export default OrderDetails;
