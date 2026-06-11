import { supabase } from './supabase';
import { Database } from './database.types';

export interface InternalInvoice {
    id: string;
    order_id: string;
    invoice_number: string;
    issue_date: string;
    due_date: string;
    status: 'Draft' | 'Issued' | 'Paid' | 'Cancelled';
    subtotal: number;
    vat_amount: number;
    total: number;
    client_snapshot: any;
    items_snapshot: any[];
    pdf_url: string | null;
    created_at: string;
}

export const InternalInvoiceService = {
    /**
     * Generates an internal invoice for an order.
     */
    generateInvoice: async (order: any): Promise<{ success: boolean; data?: InternalInvoice; error?: string }> => {
        try {
            if (!order || !order.clients || !order.order_items) {
                return { success: false, error: 'Order is missing required data (clients or items).' };
            }

            // 1. Get the next invoice number using the Postgres function
            const { data: invoiceNumber, error: seqError } = await supabase.rpc('generate_next_invoice_number');
            
            if (seqError) {
                console.error('Error generating invoice number:', seqError);
                return { success: false, error: 'Failed to generate invoice number.' };
            }

            // 2. Calculate totals
            const subtotal = order.total_price || 0;
            const vat_amount = subtotal * 0.21;
            const total = subtotal + vat_amount;

            // 3. Prepare snapshots
            const client_snapshot = { ...order.clients };
            const items_snapshot = [...order.order_items];

            // 4. Calculate Dates
            const issue_date = new Date().toISOString();
            const due_date = new Date();
            due_date.setDate(due_date.getDate() + 14); // 14 days payment term

            // 5. Insert the invoice
            const { data: invoice, error: insertError } = await supabase
                .from('internal_invoices')
                .insert([{
                    order_id: order.id,
                    invoice_number: invoiceNumber,
                    issue_date: issue_date,
                    due_date: due_date.toISOString(),
                    status: 'Issued',
                    subtotal: subtotal,
                    vat_amount: vat_amount,
                    total: total,
                    client_snapshot: client_snapshot,
                    items_snapshot: items_snapshot
                }])
                .select()
                .single();

            if (insertError) {
                console.error('Error inserting internal invoice:', insertError);
                return { success: false, error: 'Failed to save invoice record.' };
            }

            // Also mark the order as internally invoiced if needed (we can just rely on the table existing though)
            // But let's keep order status updated
            await supabase.from('orders').update({ status: 'Invoiced' }).eq('id', order.id);

            return { success: true, data: invoice as InternalInvoice };

        } catch (error: any) {
            console.error('InternalInvoiceService Error:', error);
            return { success: false, error: error.message || 'Unknown error occurred.' };
        }
    },

    /**
     * Gets all internal invoices for a specific order.
     */
    getInvoicesForOrder: async (orderId: string): Promise<InternalInvoice[]> => {
        try {
            const { data, error } = await supabase
                .from('internal_invoices')
                .select('*')
                .eq('order_id', orderId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as InternalInvoice[];
        } catch (error) {
            console.error('Error fetching internal invoices:', error);
            return [];
        }
    },

    /**
     * Updates the status of an internal invoice
     */
    updateInvoiceStatus: async (invoiceId: string, status: 'Draft' | 'Issued' | 'Paid' | 'Cancelled'): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('internal_invoices')
                .update({ status })
                .eq('id', invoiceId);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error updating invoice status:', error);
            return false;
        }
    }
};
