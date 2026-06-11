import React, { useRef, useState } from 'react';
import { X, Printer, Mail, Loader2 } from 'lucide-react';
import { InternalInvoice } from '../lib/InternalInvoiceService';
import { StorageService } from '../lib/StorageService';
import { EmailService } from '../lib/EmailService';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface InvoicePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: any; // Full order object with clients and items
    internalInvoice?: InternalInvoice; // Optional frozen invoice data
}

const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({ isOpen, onClose, order, internalInvoice }) => {
    const printRef = useRef<HTMLDivElement>(null);
    const [isEmailing, setIsEmailing] = useState(false);

    if (!isOpen || !order) return null;

    const invoiceNumber = internalInvoice ? internalInvoice.invoice_number : order.order_number;
    const clientData = internalInvoice ? internalInvoice.client_snapshot : order.clients;
    const itemsData = internalInvoice ? internalInvoice.items_snapshot : order.order_items;

    const invoiceDate = internalInvoice ? new Date(internalInvoice.issue_date).toLocaleDateString() : new Date().toLocaleDateString();
    const dueDate = internalInvoice && internalInvoice.due_date 
        ? new Date(internalInvoice.due_date).toLocaleDateString() 
        : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString();

    const subtotal = internalInvoice ? internalInvoice.subtotal : (order.total_price || 0);
    const vat = internalInvoice ? internalInvoice.vat_amount : (subtotal * 0.21);
    const total = internalInvoice ? internalInvoice.total : (subtotal + vat);

    const handlePrint = () => {
        const content = printRef.current;
        if (!content) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Invoice - ${invoiceNumber}</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <style>
                        body { font-family: sans-serif; -webkit-print-color-adjust: exact; }
                        @media print { .no-print { display: none; } }
                    </style>
                </head>
                <body class="bg-white p-8">
                    ${content.innerHTML}
                    <script>
                        window.onload = () => { window.print(); window.close(); }
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.document.close();
    };

    const handleEmail = async () => {
        const content = printRef.current;
        if (!content) return;
        
        setIsEmailing(true);
        try {
            const opt = {
                margin:       0.5,
                filename:     `invoice_${invoiceNumber}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2 },
                jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
            };

            const pdfBlob = await html2pdf().set(opt).from(content).output('blob');
            const file = new File([pdfBlob], `invoice_${invoiceNumber}.pdf`, { type: 'application/pdf' });
            
            // Upload to Supabase 'order-files' bucket
            await StorageService.uploadFile(order.id, file);
            
            const url = StorageService.getDownloadUrl(order.id, file.name);
            
            // Send webhook
            const res = await EmailService.sendInvoiceEmail(clientData?.name || 'Client', invoiceNumber, url, invoiceNumber);
            
            if (res.success) {
                alert('Invoice sent successfully via email!');
            } else {
                alert('Failed to send invoice via webhook: ' + res.error);
            }
        } catch(err) {
            console.error('Email error:', err);
            alert('An error occurred while generating or sending the PDF.');
        } finally {
            setIsEmailing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
                {/* Header Actions */}
                <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                    <h2 className="text-lg font-semibold text-gray-800">
                        {internalInvoice ? 'Internal Invoice View' : 'Invoice Preview'}
                    </h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleEmail}
                            disabled={isEmailing}
                            className="btn-accent flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {isEmailing ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />} 
                            Email Invoice
                        </button>
                        <button
                            onClick={handlePrint}
                            className="btn-secondary flex items-center gap-2 px-3 py-1.5"
                        >
                            <Printer size={16} /> Print / Save PDF
                        </button>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors ml-2" aria-label="Close">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Scrollable Preview Area */}
                <div className="flex-1 overflow-y-auto p-8 bg-gray-100">
                    <div ref={printRef} className="bg-white shadow-lg max-w-3xl mx-auto p-12 min-h-[1000px]">
                        {/* Invoice Header */}
                        <div className="flex justify-between items-start mb-12">
                            <div>
                                <h1 className="text-4xl font-bold text-gray-900 mb-2">INVOICE</h1>
                                <p className="text-gray-500">#{invoiceNumber}</p>
                                {internalInvoice && (
                                    <p className="text-xs text-gray-400 mt-1">Ref Order: #{order.order_number}</p>
                                )}
                            </div>
                            <div className="text-right">
                                <h3 className="text-xl font-bold text-gray-800">Keturi Print</h3>
                                <p className="text-gray-600 text-sm mt-1">
                                    Įmonės kodas: 304445555<br />
                                    PVM kodas: LT100010000<br />
                                    Vilnius, Lithuania<br />
                                    info@keturiprint.lt
                                </p>
                            </div>
                        </div>

                        {/* Client & Dates */}
                        <div className="flex justify-between mb-12 border-b border-gray-100 pb-8">
                            <div>
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Bill To</h4>
                                <p className="font-bold text-gray-800">{clientData?.name}</p>
                                <p className="text-gray-600 text-sm mt-1">
                                    {clientData?.company && <span className="block">{clientData.company}</span>}
                                    {clientData?.address && <span className="block">{clientData.address}</span>}
                                    {clientData?.email}
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="mb-2">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Invoice Date</span>
                                    <span className="font-semibold text-gray-800">{invoiceDate}</span>
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Due Date</span>
                                    <span className="font-semibold text-gray-800">{dueDate}</span>
                                </div>
                            </div>
                        </div>

                        {/* Line Items */}
                        <table className="w-full mb-8">
                            <thead>
                                <tr className="border-b-2 border-gray-100">
                                    <th className="text-left py-3 text-sm font-bold text-gray-600 uppercase">Item</th>
                                    <th className="text-right py-3 text-sm font-bold text-gray-600 uppercase">Qty</th>
                                    <th className="text-right py-3 text-sm font-bold text-gray-600 uppercase">Price</th>
                                    <th className="text-right py-3 text-sm font-bold text-gray-600 uppercase">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {itemsData?.map((item: any) => (
                                    <tr key={item.id}>
                                        <td className="py-4 text-sm text-gray-800">
                                            <p className="font-medium">{item.product_type}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {item.width && item.height ? `${item.width}x${item.height}mm` : ''}
                                                {item.print_type ? `, ${item.print_type}` : ''}
                                            </p>
                                        </td>
                                        <td className="py-4 text-right text-sm text-gray-600">{item.quantity}</td>
                                        <td className="py-4 text-right text-sm text-gray-600">€{item.unit_price}</td>
                                        <td className="py-4 text-right text-sm font-medium text-gray-800">€{item.total_price?.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Totals */}
                        <div className="flex justify-end">
                            <div className="w-64">
                                <div className="flex justify-between py-2 text-sm text-gray-600">
                                    <span>Subtotal:</span>
                                    <span>€{Number(subtotal).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between py-2 text-sm text-gray-600">
                                    <span>VAT (21%):</span>
                                    <span>€{Number(vat).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between py-3 border-t-2 border-gray-100 text-lg font-bold text-gray-900 mt-2">
                                    <span>Total:</span>
                                    <span>€{Number(total).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="mt-16 pt-8 border-t border-gray-100 text-center text-xs text-gray-400">
                            Thank you for your business. Please pay within 14 days.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoicePreviewModal;
