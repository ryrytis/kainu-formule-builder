import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Loader2, UserCircle2 } from 'lucide-react';
import ClientSelect from './ClientSelect';

interface ChangeClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentClientId: string;
    orderId: string;
    onClientChanged: () => void;
}

const ChangeClientModal: React.FC<ChangeClientModalProps> = ({ 
    isOpen, 
    onClose, 
    currentClientId, 
    orderId, 
    onClientChanged 
}) => {
    const [selectedClientId, setSelectedClientId] = useState<string | null>(currentClientId);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClientId) {
            setError('Please select a client');
            return;
        }

        if (selectedClientId === currentClientId) {
            onClose();
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { error: updateError } = await (supabase as any)
                .from('orders')
                .update({ client_id: selectedClientId })
                .eq('id', orderId);

            if (updateError) throw updateError;

            onClientChanged();
            onClose();
        } catch (err: any) {
            console.error('Error updating order client:', err);
            setError(err.message || 'Failed to update client');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                    <div className="flex items-center gap-2">
                        <UserCircle2 className="text-accent-teal" size={20} />
                        <h2 className="text-lg font-semibold text-gray-800">Change Order Client</h2>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title="Close"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <p className="text-sm text-gray-500">
                            Select a new client to associate with this order. This will update the client information displayed on the order details and invoices.
                        </p>
                        
                        <ClientSelect 
                            value={selectedClientId}
                            onChange={setSelectedClientId}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !selectedClientId}
                            className="btn-accent flex items-center gap-2"
                        >
                            {loading && <Loader2 className="animate-spin" size={16} />}
                            Update Client
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ChangeClientModal;
