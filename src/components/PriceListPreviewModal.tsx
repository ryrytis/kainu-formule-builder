import React, { useRef } from 'react';
import { X, Printer } from 'lucide-react';

interface PriceListPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    priceList: {
        name: string;
        description?: string;
    } | null;
    items: any[];
}

const PriceListPreviewModal: React.FC<PriceListPreviewModalProps> = ({ isOpen, onClose, priceList, items }) => {
    const printRef = useRef<HTMLDivElement>(null);

    if (!isOpen || !priceList) return null;

    const handlePrint = () => {
        const content = printRef.current;
        if (!content) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Price List - ${priceList.name}</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <style>
                        body { font-family: sans-serif; -webkit-print-color-adjust: exact; }
                        @media print { 
                            .no-print { display: none; } 
                            body { padding: 0; }
                        }
                    </style>
                </head>
                <body class="bg-white p-8">
                    ${content.innerHTML}
                    <script>
                        window.onload = () => { 
                            setTimeout(() => {
                                window.print(); 
                                window.close(); 
                            }, 500);
                        }
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
                {/* Header Actions */}
                <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                    <h2 className="text-lg font-semibold text-gray-800">Price List Preview</h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="btn-accent flex items-center gap-2 px-3 py-1.5"
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
                        {/* Company Header */}
                        <div className="flex justify-between items-start mb-12">
                            <div>
                                <h1 className="text-4xl font-bold text-gray-900 mb-2 uppercase tracking-tight">Kainynas</h1>
                                <p className="text-accent-teal font-medium text-lg">{priceList.name}</p>
                            </div>
                            <div className="text-right">
                                <h3 className="text-xl font-bold text-gray-800">Keturi Print</h3>
                                <p className="text-gray-600 text-sm mt-1">
                                    Įmonės kodas: 304445555<br />
                                    Vilnius, Lithuania<br />
                                    info@keturiprint.lt
                                </p>
                            </div>
                        </div>

                        {/* List Info */}
                        <div className="mb-10 border-b border-gray-100 pb-8">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Informacija</h4>
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                <p className="text-gray-800 font-medium">{priceList.name}</p>
                                {priceList.description && (
                                    <p className="text-gray-600 text-sm mt-2 leading-relaxed">
                                        {priceList.description}
                                    </p>
                                )}
                                <p className="text-xs text-gray-400 mt-4 italic">
                                    Kainos galioja iki papildomo pranešimo. Visos kainos nurodytos be PVM.
                                </p>
                            </div>
                        </div>

                        {/* Product Table */}
                        <table className="w-full mb-8">
                            <thead>
                                <tr className="border-b-2 border-gray-100 bg-gray-50/50">
                                    <th className="text-left py-3 px-4 text-sm font-bold text-gray-600 uppercase">Gaminys</th>
                                    <th className="text-right py-3 px-4 text-sm font-bold text-gray-600 uppercase">Kaina už vnt.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {items.length > 0 ? (
                                    items.map((item: any) => (
                                        <tr key={item.id}>
                                            <td className="py-4 px-4 text-sm text-gray-800">
                                                <p className="font-semibold text-base">{item.products?.name || 'Gaminys'}</p>
                                            </td>
                                            <td className="py-4 px-4 text-right text-sm font-bold text-accent-teal text-lg">
                                                €{item.custom_base_price?.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={2} className="py-12 text-center text-gray-400 italic">
                                            Kainų sąrašas tuščias.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* Footer Disclaimer */}
                        <div className="mt-20 pt-8 border-t border-gray-100 text-center">
                            <p className="text-gray-500 text-sm font-medium mb-1">Dėkojame, kad renkatės mus!</p>
                            <p className="text-gray-400 text-xs">Keturi Print - Kokybiška spauda Jūsų verslui</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PriceListPreviewModal;
