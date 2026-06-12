import React from 'react';
import { InternalInvoice } from '../lib/InternalInvoiceService';

interface InvoiceTemplateProps {
    order: any;
    internalInvoice?: InternalInvoice | null;
}

const numberToLithuanianWords = (num: number) => {
    const vienetai = ['', 'vienas', 'du', 'trys', 'keturi', 'penki', 'šeši', 'septyni', 'aštuoni', 'devyni'];
    const dešimtys = ['', 'dešimt', 'dvidešimt', 'trisdešimt', 'keturiasdešimt', 'penkiasdešimt', 'šešiasdešimt', 'septyniasdešimt', 'aštuoniasdešimt', 'devyniasdešimt'];
    const n11_19 = ['dešimt', 'vienuolika', 'dvylika', 'trylika', 'keturiolika', 'penkiolika', 'šešiolika', 'septyniolika', 'aštuoniolika', 'devyniolika'];
    
    const convert = (n: number): string => {
        if (n === 0) return 'nulis';
        if (n < 10) return vienetai[n];
        if (n >= 11 && n <= 19) return n11_19[n - 10];
        if (n < 100) return dešimtys[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + vienetai[n % 10] : '');
        if (n < 1000) {
            let res = vienetai[Math.floor(n / 100)] + ' šimtai';
            if (n % 100 !== 0) res += ' ' + convert(n % 100);
            return res;
        }
        if (n < 1000000) {
            const tukst = Math.floor(n / 1000);
            let res = convert(tukst) + (tukst % 10 === 1 && tukst % 100 !== 11 ? ' tūkstantis' : (tukst % 10 === 0 || (tukst % 100 >= 11 && tukst % 100 <= 19) ? ' tūkstančių' : ' tūkstančiai'));
            if (n % 1000 !== 0) res += ' ' + convert(n % 1000);
            return res;
        }
        return n.toString();
    };

    const euros = Math.floor(num);
    const cents = Math.round((num - euros) * 100);
    
    let euroWord = convert(euros);
    euroWord = euroWord.charAt(0).toUpperCase() + euroWord.slice(1);
    
    let centsWord = convert(cents);
    if (cents === 0) centsWord = 'nulis';
    
    return `${euroWord} EUR ir ${centsWord} ct`;
};

export const InvoiceTemplate = React.forwardRef<HTMLDivElement, InvoiceTemplateProps>(
    ({ order, internalInvoice }, ref) => {
        if (!order) return null;

        const invoiceNumber = internalInvoice ? internalInvoice.invoice_number : order.order_number;
        const clientData = internalInvoice ? internalInvoice.client_snapshot : order.clients;
        const itemsData = internalInvoice ? internalInvoice.items_snapshot : order.order_items;

        const invoiceDate = internalInvoice ? new Date(internalInvoice.issue_date).toLocaleDateString('lt-LT') : new Date().toLocaleDateString('lt-LT');
        const dueDate = internalInvoice && internalInvoice.due_date 
            ? new Date(internalInvoice.due_date).toLocaleDateString('lt-LT') 
            : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('lt-LT');

        const subtotal = internalInvoice ? internalInvoice.subtotal : (order.total_price || 0);
        const vat = internalInvoice ? internalInvoice.vat_amount : (subtotal * 0.21);
        const total = internalInvoice ? internalInvoice.total : (subtotal + vat);

        return (
            <div ref={ref} className="bg-white p-12 text-black font-sans mx-auto" style={{ width: '210mm', minHeight: '297mm', boxSizing: 'border-box' }}>
                {/* Top Section */}
                <div className="flex justify-between items-start mb-16">
                    {/* Left Col */}
                    <div className="w-5/12">
                        {/* Logo */}
                        <div className="mb-6 flex items-center gap-3">
                            {/* Fallback SVG for the logo in case they don't have one uploaded yet */}
                            <svg width="60" height="40" viewBox="0 0 100 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M10 20 Q 50 50 90 20" stroke="black" strokeWidth="6" strokeLinecap="round" fill="none" />
                                <line x1="10" y1="35" x2="90" y2="35" stroke="black" strokeWidth="6" strokeLinecap="round" />
                                <line x1="10" y1="50" x2="90" y2="50" stroke="black" strokeWidth="6" strokeLinecap="round" />
                            </svg>
                            <div className="flex flex-col justify-center leading-none">
                                <span className="font-bold text-3xl tracking-tighter -mb-1">keturi</span>
                                <span className="font-bold text-3xl tracking-tighter">print</span>
                            </div>
                        </div>
                        <h2 className="text-[#2d2c6b] font-bold text-lg mb-8 uppercase">PVM SĄSKAITA FAKTŪRA</h2>
                        
                        <h3 className="text-[#2d2c6b] font-bold text-2xl mb-4">Serija {invoiceNumber?.substring(0, 2) || '4P'} Nr {invoiceNumber?.substring(2) || invoiceNumber}</h3>
                        <div className="text-sm">
                            <p><span className="font-bold">Sąskaitos data</span> {invoiceDate}</p>
                            <p><span className="font-bold">Apmokėti iki</span> {dueDate}</p>
                        </div>
                    </div>

                    {/* Right Col */}
                    <div className="w-7/12 pl-8">
                        {/* Row 1 */}
                        <div className="flex mb-8">
                            <div className="w-1/2">
                                <h4 className="text-[#2d2c6b] font-bold text-xl mb-2">Pardavėjas</h4>
                                <div className="text-sm text-gray-700 leading-tight space-y-0.5">
                                    <p>MB "Keturi print"</p>
                                    <p>Įm. kodas: 306688624</p>
                                    <p>PVM mokėtojo kodas: LT100016688416</p>
                                    <p>Pakalnės g. 8-2, Ramučių k.,</p>
                                    <p>LT-54464 Kauno r., Lietuva</p>
                                </div>
                            </div>
                            <div className="w-1/2 pt-8 text-sm text-gray-700 leading-tight space-y-0.5">
                                <p>Bankas: "Swedbank", AB</p>
                                <p>Sąskaita:</p>
                                <p>LT367300010184522702</p>
                            </div>
                        </div>

                        {/* Row 2 */}
                        <div>
                            <h4 className="text-[#2d2c6b] font-bold text-xl mb-2">Pirkėjas</h4>
                            <div className="text-sm text-gray-700 leading-tight space-y-0.5">
                                <p>{clientData?.company || clientData?.name}</p>
                                <p>Įm. kodas: {clientData?.company_code || '-'}</p>
                                <p>PVM kodas: {clientData?.vat_code || '-'}</p>
                                <p>{clientData?.address || '-'}</p>
                                <p>Lietuva</p>
                                <p>{clientData?.email}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table Section */}
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="border-y-2 border-black">
                            <th className="text-left py-2 font-bold text-[#2d2c6b]">Pavadinimas</th>
                            <th className="text-center py-2 font-bold text-[#2d2c6b]">Kiekis</th>
                            <th className="text-center py-2 font-bold text-[#2d2c6b]">Matas</th>
                            <th className="text-right py-2 font-bold text-[#2d2c6b]">Kaina be<br/>PVM</th>
                            <th className="text-right py-2 font-bold text-[#2d2c6b]">Suma be PVM</th>
                            <th className="text-right py-2 font-bold text-[#2d2c6b]">PVM Suma</th>
                            <th className="text-center py-2 font-bold text-[#2d2c6b]">PVM %</th>
                            <th className="text-right py-2 font-bold text-[#2d2c6b]">Iš viso</th>
                        </tr>
                    </thead>
                    <tbody>
                        {itemsData?.map((item: any) => {
                            const itemPrice = item.unit_price;
                            const itemTotalWithoutVat = item.total_price;
                            const itemVat = itemTotalWithoutVat * 0.21;
                            const itemTotal = itemTotalWithoutVat + itemVat;

                            return (
                                <tr key={item.id} className="border-b border-dashed border-gray-300">
                                    <td className="py-3 font-bold text-black">{item.product_type}</td>
                                    <td className="py-3 text-center">{item.quantity}</td>
                                    <td className="py-3 text-center">vnt</td>
                                    <td className="py-3 text-right">{Number(itemPrice).toFixed(4)} €</td>
                                    <td className="py-3 text-right">{Number(itemTotalWithoutVat).toFixed(2)} €</td>
                                    <td className="py-3 text-right">{Number(itemVat).toFixed(2)} €</td>
                                    <td className="py-3 text-center">21 %</td>
                                    <td className="py-3 text-right">{Number(itemTotal).toFixed(2)} €</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                <div className="border-t-[3px] border-black mt-0 mb-8"></div>

                {/* Totals Section */}
                <div className="flex justify-end">
                    <div className="w-1/2">
                        <div className="flex justify-between py-1 text-sm font-bold">
                            <span>Suma be PVM (21%)</span>
                            <span>{Number(subtotal).toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between py-1 text-sm font-bold">
                            <span>PVM (21%)</span>
                            <span>{Number(vat).toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between py-4 mt-2 text-xl font-bold border-t border-transparent">
                            <span>Bendra suma</span>
                            <span>{Number(total).toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between py-1 text-sm mt-4">
                            <span className="font-bold whitespace-nowrap mr-4">Suma žodžiais</span>
                            <span className="text-right text-gray-600">{numberToLithuanianWords(total)}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
);
