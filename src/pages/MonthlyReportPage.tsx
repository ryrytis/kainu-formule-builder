import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Download, Play, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const MonthlyReportPage: React.FC = () => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isLoading, setIsLoading] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);
    
    const [consumption, setConsumption] = useState<Record<string, number>>({});
    
    const [alreadyWrittenOff, setAlreadyWrittenOff] = useState(false);
    const [reportData, setReportData] = useState<any[]>([]);

    useEffect(() => {
        fetchReportData();
    }, [selectedDate]);

    const fetchReportData = async () => {
        setIsLoading(true);
        try {
            const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
            const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59);

            const startDateIso = startOfMonth.toISOString();
            const endDateIso = endOfMonth.toISOString();

            // 1. Fetch Materials
            const { data: mats } = await (supabase as any).from('materials').select('*').order('name');

            // 2. Fetch Transactions for the month
            const { data: trans } = await (supabase as any)
                .from('material_transactions')
                .select('*')
                .gte('transaction_date', startDateIso)
                .lte('transaction_date', endDateIso);

            // Check if a WRITE_OFF transaction already exists for this month to prevent duplicate writeoffs
            const hasWriteOff = (trans || []).some((t: any) => t.type === 'WRITE_OFF');
            setAlreadyWrittenOff(hasWriteOff);

            // 3. Fetch Invoiced Orders for the month
            // We use orders where invoiced = true and updated_at (or an invoice_date if exists) is in the month.
            // Since we don't have a specific invoice_date, we'll check if it has internal_invoices or just updated_at.
            // Actually, internal_invoices has created_at which serves as invoice date.
            const { data: internalInvoices } = await (supabase as any)
                .from('internal_invoices')
                .select('order_id')
                .gte('created_at', startDateIso)
                .lte('created_at', endDateIso);

            const orderIds = internalInvoices?.map((i: any) => i.order_id) || [];

            let calcConsumption: Record<string, number> = {};

            if (orderIds.length > 0) {
                // Fetch order items for these orders
                const { data: items } = await (supabase as any)
                    .from('order_items')
                    .select('*')
                    .in('order_id', orderIds);

                (items || []).forEach((item: any) => {
                    if (!item.material_id) return;
                    let used = item.quantity || 0;
                    if (item.width && item.height) {
                        // Square meters calculation
                        used = (item.width / 1000) * (item.height / 1000) * item.quantity;
                    }
                    if (!calcConsumption[item.material_id]) calcConsumption[item.material_id] = 0;
                    calcConsumption[item.material_id] += used;
                });
            }
            
            setConsumption(calcConsumption);

            // 4. Compile Report Data
            const compiled = (mats || []).map((mat: any) => {
                const purchasedThisMonth = (trans || [])
                    .filter((t: any) => t.material_id === mat.id && t.type === 'PURCHASE')
                    .reduce((sum: number, t: any) => sum + t.quantity, 0);

                const writtenOffThisMonth = (trans || [])
                    .filter((t: any) => t.material_id === mat.id && t.type === 'WRITE_OFF')
                    .reduce((sum: number, t: any) => sum + Math.abs(t.quantity), 0);

                const calculatedWriteOff = calcConsumption[mat.id] || 0;

                return {
                    ...mat,
                    purchased: purchasedThisMonth,
                    writtenOff: alreadyWrittenOff ? writtenOffThisMonth : calculatedWriteOff,
                    endingStock: mat.current_stock || 0
                };
            }).filter((mat: any) => mat.purchased > 0 || mat.writtenOff > 0 || mat.endingStock > 0);

            setReportData(compiled);

        } catch (error) {
            console.error('Failed to fetch report data', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleExecuteWriteOff = async () => {
        if (alreadyWrittenOff) return;
        if (!confirm('Are you sure you want to execute write-offs for this month? This will deduct materials from stock.')) return;

        setIsExecuting(true);
        try {
            const date = new Date().toISOString();
            const monthStr = `${selectedDate.getFullYear()}-${(selectedDate.getMonth() + 1).toString().padStart(2, '0')}`;

            for (const matId of Object.keys(consumption)) {
                const amount = consumption[matId];
                if (amount <= 0) continue;

                // Deduct stock
                const { data: currentMat } = await (supabase as any).from('materials').select('current_stock').eq('id', matId).single();
                const newStock = Math.max(0, (currentMat?.current_stock || 0) - amount);

                await (supabase as any).from('materials').update({ current_stock: newStock }).eq('id', matId);

                // Log transaction
                await (supabase as any).from('material_transactions').insert([{
                    material_id: matId,
                    type: 'WRITE_OFF',
                    quantity: -amount, // Negative for write-off
                    transaction_date: date,
                    reference_id: `Monthly Write-off ${monthStr}`,
                }]);
            }

            alert('Monthly write-off executed successfully!');
            fetchReportData();
        } catch (error: any) {
            alert('Failed to execute write-off: ' + error.message);
        } finally {
            setIsExecuting(false);
        }
    };

    const handleDownloadPDF = async () => {
        const element = document.getElementById('report-content');
        if (!element) return;

        const canvas = await html2canvas(element, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Material_Report_${selectedDate.getFullYear()}_${selectedDate.getMonth() + 1}.pdf`);
    };

    const changeMonth = (offset: number) => {
        const newDate = new Date(selectedDate);
        newDate.setMonth(newDate.getMonth() + offset);
        setSelectedDate(newDate);
    };

    const monthStr = selectedDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-primary tracking-tight">Monthly Accountant Report</h1>
                    <p className="text-gray-500 mt-1">Material purchases and consumption tracking</p>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-white border border-gray-200 rounded-md shadow-sm">
                        <button onClick={() => changeMonth(-1)} className="p-2 text-gray-500 hover:text-accent-teal hover:bg-gray-50 rounded-l-md"><ChevronLeft size={20}/></button>
                        <div className="px-4 py-2 font-medium text-gray-800 w-40 text-center">{monthStr}</div>
                        <button onClick={() => changeMonth(1)} className="p-2 text-gray-500 hover:text-accent-teal hover:bg-gray-50 rounded-r-md"><ChevronRight size={20}/></button>
                    </div>

                    <button
                        onClick={handleDownloadPDF}
                        disabled={isLoading || reportData.length === 0}
                        className="btn-secondary flex items-center gap-2 bg-white"
                    >
                        <Download size={18} />
                        Download PDF
                    </button>
                </div>
            </div>

            {/* Main Content Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            <FileText className="text-accent-teal" size={20}/>
                            Report Data: {monthStr}
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">Showing calculated consumption based on invoiced orders.</p>
                    </div>
                    <div>
                        {alreadyWrittenOff ? (
                            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 text-green-800 text-sm font-medium border border-green-200">
                                <CheckCircle2 size={16} />
                                Written Off
                            </span>
                        ) : (
                            <button
                                onClick={handleExecuteWriteOff}
                                disabled={isExecuting || isLoading || Object.keys(consumption).length === 0}
                                className="btn-accent flex items-center gap-2"
                            >
                                <Play size={18} />
                                {isExecuting ? 'Executing...' : 'Execute Write-offs'}
                            </button>
                        )}
                    </div>
                </div>

                <div className="p-6" id="report-content">
                    <div className="mb-6 pb-4 border-b border-gray-200">
                        <h2 className="text-2xl font-bold text-gray-900 mb-1">KETURIPRINT</h2>
                        <p className="text-gray-500">Material Stock Report for {monthStr}</p>
                    </div>

                    {isLoading ? (
                        <div className="text-center py-12 text-gray-500">Loading data...</div>
                    ) : reportData.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">No material activity found for this month.</div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead>
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Material</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Category</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Purchased</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Written Off</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Ending Stock</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {reportData.map((row) => (
                                    <tr key={row.id}>
                                        <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
                                        <td className="px-4 py-3 text-sm text-gray-500">{row.category}</td>
                                        <td className="px-4 py-3 text-sm text-right text-green-600 font-medium">
                                            {row.purchased > 0 ? `+${row.purchased.toFixed(2)}` : '-'} {row.unit}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-red-600 font-medium">
                                            {row.writtenOff > 0 ? `-${row.writtenOff.toFixed(2)}` : '-'} {row.unit}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">
                                            {row.endingStock.toFixed(2)} {row.unit}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};
