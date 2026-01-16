import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { X, Loader2 } from 'lucide-react';
import ClientSelect from './ClientSelect';
import { SharePointService } from '../lib/SharePointService';
import { generateOrderNumber } from '../lib/orderUtils';
import { EmailService } from '../lib/EmailService';

interface CreateOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onOrderCreated: () => void;
    initialItem?: {
        product_id?: string;
        product_type: string;
        material_id: string; // Name or ID
        width: number;
        height: number;
        quantity: number;
        print_type: string;
        unit_price: number;
        total_price: number;
    };
}

const CreateOrderModal: React.FC<CreateOrderModalProps> = ({ isOpen, onClose, onOrderCreated, initialItem }) => {
    const navigate = useNavigate();
    const [clientId, setClientId] = useState<string | null>(null);
    const [isNewClientMode, setIsNewClientMode] = useState(false);
    const [newClientName, setNewClientName] = useState('');
    const [newClientEmail, setNewClientEmail] = useState('');

    const [orderNumber, setOrderNumber] = useState('');
    const [status, setStatus] = useState('New');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchNextOrderNumber();
            if (initialItem) {
                // Optional: Pre-fill notes or other fields if needed
            } else {
                // Reset fields if standard open
                setClientId(null);
                setIsNewClientMode(false);
                setNewClientName('');
                setNewClientEmail('');
                setNotes('');
                setStatus('New');
            }
        }
    }, [isOpen, initialItem]);

    if (!isOpen) return null;

    const fetchNextOrderNumber = async () => {
        setLoading(true); // reusing loading state briefly or just background
        try {
            const nextNumber = await generateOrderNumber(supabase as any);
            setOrderNumber(nextNumber);
        } catch (err) {
            console.error('Failed to generate order number:', err);
            // Fallback is handled in utility, but if error bubbles up:
            const yearShort = new Date().getFullYear().toString().substr(2);
            setOrderNumber(`ORD-${yearShort}-1001`);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isNewClientMode && !clientId) {
            setError('Please select a client');
            return;
        }

        if (isNewClientMode && (!newClientName || !newClientEmail)) {
            setError('Please fill in client name and email');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            let finalClientId = clientId;

            // 1. Handle New Client Creation
            if (isNewClientMode) {
                const { data: newClient, error: clientError } = await (supabase as any)
                    .from('clients')
                    .insert([{
                        name: newClientName,
                        email: newClientEmail,
                        form_link_status: 'pending'
                    }])
                    .select('id')
                    .single();

                if (clientError) throw clientError;
                finalClientId = newClient.id;

                // Send Welcome Email
                if (finalClientId) {
                    console.log("Sending welcome email to:", newClientEmail);
                    await EmailService.sendWelcomeEmail(finalClientId, newClientName, newClientEmail);
                }

            } else if (clientId && clientId.includes('@') && !clientId.match(/^[0-9a-f]{8}-/)) {
                // Legacy support for email-only selection (if any remains)
                // This block might be redundant if we force the new UI, but keeping for safety
                const email = clientId;
                const { data: newClient, error: clientError } = await (supabase as any)
                    .from('clients')
                    .insert([{
                        name: email,
                        email: email,
                        form_link_status: 'pending'
                    }])
                    .select('id')
                    .single();

                if (clientError) throw clientError;
                finalClientId = newClient.id;
            }

            // 2. Create Order
            // Calculate initial total price
            const initialTotal = initialItem ? initialItem.total_price : 0;

            const { data, error } = await (supabase as any)
                .from('orders')
                .insert([
                    {
                        client_id: finalClientId,
                        order_number: orderNumber,
                        status: status,
                        notes: notes,
                        total_price: initialTotal
                    }
                ])
                .select(`*, clients(name)`) // Select client name for SharePoint
                .single();

            if (error) throw error;

            // 2. Insert Initial Item if exists
            if (initialItem && data) {
                const { error: itemError } = await (supabase as any)
                    .from('order_items')
                    .insert([{
                        order_id: data.id,
                        product_type: initialItem.product_type,
                        material_id: initialItem.material_id || null,
                        width: initialItem.width,
                        height: initialItem.height,
                        quantity: initialItem.quantity,
                        print_type: initialItem.print_type,
                        unit_price: initialItem.unit_price,
                        total_price: initialItem.total_price
                    }]);

                if (itemError) {
                    console.error("Failed to add initial item", itemError);
                    // We continue even if item fails, user can add manually
                }
            }

            // 3. SharePoint Workflow Trigger
            if (data?.clients?.name && data?.order_number) {
                console.log("Triggering SharePoint folder creation...");
                SharePointService.createOrderFolder(data.clients.name, data.order_number, data.status)
                    .then(async (res) => {
                        if (res.success && res.folderUrl) {
                            console.log("Folder created:", res.folderUrl);
                            // SAVE URL TO DATABASE
                            await (supabase as any)
                                .from('orders')
                                .update({ workflow_link: res.folderUrl })
                                .eq('id', data.id);
                        }
                    })
                    .catch(e => console.error("SharePoint trigger failed", e));
            }

            onOrderCreated(); // Refresh list callback
            onClose(); // Close modal

            // 4. Redirect to the new order
            if (data?.id) {
                navigate(`/orders/${data.id}`);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to create order');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                    <h2 className="text-lg font-semibold text-gray-800">
                        {initialItem ? 'Create Order from Calculation' : 'Create New Order'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded text-sm mb-4">
                            {error}
                        </div>
                    )}

                    {initialItem && (
                        <div className="bg-blue-50 p-3 rounded text-sm text-blue-800 mb-4 flex justify-between items-center">
                            <span>
                                <strong>Item:</strong> {initialItem.product_type} ({initialItem.width}x{initialItem.height}mm, Qty: {initialItem.quantity})
                            </span>
                            <span className="font-bold">€{initialItem.total_price.toFixed(2)}</span>
                        </div>
                    )}

                    {isNewClientMode ? (
                        <div className="bg-gray-50 p-4 rounded-md border border-gray-200 relative animate-in fade-in slide-in-from-top-2">
                            <button
                                type="button"
                                onClick={() => setIsNewClientMode(false)}
                                className="absolute top-2 right-2 text-xs text-gray-400 hover:text-gray-600"
                            >
                                Cancel
                            </button>
                            <h3 className="text-sm font-bold text-accent-teal uppercase mb-3">New Client Details</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Company / Client Name <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={newClientName}
                                        onChange={(e) => setNewClientName(e.target.value)}
                                        className="w-full border rounded p-2 text-sm focus:border-accent-teal outline-none"
                                        placeholder="e.g. UAB Keturi"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address <span className="text-red-500">*</span></label>
                                    <input
                                        type="email"
                                        value={newClientEmail}
                                        onChange={(e) => setNewClientEmail(e.target.value)}
                                        className="w-full border rounded p-2 text-sm focus:border-accent-teal outline-none"
                                        placeholder="client@example.com"
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <ClientSelect
                            value={clientId}
                            onChange={setClientId}
                            onAddNew={(name) => {
                                setIsNewClientMode(true);
                                setNewClientName(name);
                            }}
                        />
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label htmlFor="order-number" className="text-xs font-bold text-gray-500 uppercase">
                                Order Number <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="order-number"
                                type="text"
                                value={orderNumber}
                                onChange={(e) => setOrderNumber(e.target.value)}
                                className="w-full border-b-2 border-gray-200 p-2 focus:border-accent-teal outline-none transition-colors font-mono text-lg bg-white"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="order-status" className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                                Status
                            </label>
                            <select
                                id="order-status"
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full border-b-2 border-gray-200 p-2 focus:border-accent-teal outline-none transition-colors bg-white mt-1"
                            >
                                <option value="New">New</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Ready">Ready</option>
                                <option value="Completed">Completed</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label htmlFor="order-notes" className="text-xs font-bold text-gray-500 uppercase">
                            Notes
                        </label>
                        <textarea
                            id="order-notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full border-2 border-gray-200 p-3 focus:border-accent-teal outline-none transition-colors resize-none min-h-[100px]"
                            placeholder="Add detailed instructions..."
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 text-sm font-bold uppercase text-gray-500 hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-accent flex items-center gap-2"
                        >
                            {loading && <Loader2 className="animate-spin" size={16} />}
                            {initialItem ? 'Create Order & Item' : 'Create Order'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateOrderModal;
