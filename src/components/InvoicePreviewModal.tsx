import React, { useRef, useState } from 'react';
import { X, Printer, Mail, Loader2 } from 'lucide-react';
import { InternalInvoice } from '../lib/InternalInvoiceService';
import { StorageService } from '../lib/StorageService';
import { EmailService } from '../lib/EmailService';
import { InvoiceTemplate } from './InvoiceTemplate';
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
                image:        { type: 'jpeg' as const, quality: 0.98 },
                html2canvas:  { scale: 2 },
                jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' as const }
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
                    <div className="shadow-lg mx-auto w-max bg-white">
                        <InvoiceTemplate 
                            ref={printRef}
                            order={order}
                            internalInvoice={internalInvoice}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoicePreviewModal;
