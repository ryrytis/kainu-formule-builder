import React, { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { OpenAIService, ParsedMaterial } from '../lib/OpenAIService';
import { supabase } from '../lib/supabase';
import { X, Upload, Loader2, Check } from 'lucide-react';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface MappingItem extends ParsedMaterial {
    mappedId: string | 'NEW' | 'SKIP';
    newCategory: string;
}

export const SupplierInvoiceUploadModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isParsing, setIsParsing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [parsedItems, setParsedItems] = useState<MappingItem[]>([]);
    const [dbMaterials, setDbMaterials] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchMaterials();
            setFile(null);
            setParsedItems([]);
            setError(null);
        }
    }, [isOpen]);

    const fetchMaterials = async () => {
        const { data } = await supabase.from('materials').select('id, name, category').order('name');
        setDbMaterials(data || []);
    };

    const extractTextFromPDF = async (file: File): Promise<string> => {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            fullText += pageText + '\n';
        }
        
        return fullText;
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;
        setFile(selectedFile);
        setIsParsing(true);
        setError(null);

        try {
            const text = await extractTextFromPDF(selectedFile);
            if (!text || text.trim().length === 0) {
                throw new Error("Could not extract text from PDF.");
            }

            const items = await OpenAIService.parseInvoiceText(text);
            
            // Auto-map if names match closely
            const mapped = items.map(item => {
                const exactMatch = dbMaterials.find(m => m.name.toLowerCase() === item.name.toLowerCase());
                return {
                    ...item,
                    mappedId: exactMatch ? exactMatch.id : 'NEW',
                    newCategory: 'Spaudos medžiagos' // Default
                } as MappingItem;
            });
            
            setParsedItems(mapped);
        } catch (err: any) {
            setError(err.message || "Failed to parse invoice.");
        } finally {
            setIsParsing(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const date = new Date().toISOString();
            
            for (const item of parsedItems) {
                if (item.mappedId === 'SKIP') continue;

                let materialId = item.mappedId;

                // 1. Create new material if needed
                if (materialId === 'NEW') {
                    const { data: newMat, error: matError } = await (supabase as any).from('materials').insert([{
                        name: item.name,
                        unit_price: item.unit_price,
                        unit: item.unit,
                        category: item.newCategory,
                        current_stock: 0
                    }]).select().single();
                    
                    if (matError) throw matError;
                    materialId = newMat.id;
                }

                // 2. Fetch current stock
                const { data: currentMat } = await (supabase as any).from('materials').select('current_stock').eq('id', materialId).single();
                const newStock = (currentMat?.current_stock || 0) + item.quantity;

                // 3. Update stock and price
                await (supabase as any).from('materials')
                    .update({ current_stock: newStock, unit_price: item.unit_price }) // update price to latest
                    .eq('id', materialId);

                // 4. Log transaction
                await (supabase as any).from('material_transactions').insert([{
                    material_id: materialId,
                    type: 'PURCHASE',
                    quantity: item.quantity,
                    transaction_date: date,
                    reference_id: file?.name || 'Invoice Upload'
                }]);
            }

            onSuccess();
        } catch (err: any) {
            console.error(err);
            setError("Failed to save materials. " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                <div className="p-6 border-b flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-800">Upload Supplier Invoice</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {error && (
                        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6">
                            {error}
                        </div>
                    )}

                    {!file && !isParsing && (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:bg-gray-50 transition-colors">
                            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900">Upload Invoice PDF</h3>
                            <p className="text-sm text-gray-500 mt-1 mb-4">AI will automatically extract materials and quantities.</p>
                            <label className="inline-flex cursor-pointer bg-accent-teal text-white px-4 py-2 rounded-md hover:bg-teal-600 transition-colors">
                                Select File
                                <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
                            </label>
                        </div>
                    )}

                    {isParsing && (
                        <div className="text-center py-12">
                            <Loader2 className="w-12 h-12 text-accent-teal animate-spin mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900">Parsing Invoice...</h3>
                            <p className="text-sm text-gray-500">Extracting items using AI.</p>
                        </div>
                    )}

                    {parsedItems.length > 0 && !isParsing && (
                        <div>
                            <h3 className="text-lg font-medium mb-4">Review Extracted Items</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3">Extracted Name</th>
                                            <th className="px-4 py-3 text-right">Qty</th>
                                            <th className="px-4 py-3 text-right">Unit Price</th>
                                            <th className="px-4 py-3">Map to Database</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parsedItems.map((item, idx) => (
                                            <tr key={idx} className="border-b">
                                                <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                                                <td className="px-4 py-3 text-right">{item.quantity} {item.unit}</td>
                                                <td className="px-4 py-3 text-right">€{item.unit_price}</td>
                                                <td className="px-4 py-3">
                                                    <select
                                                        className="w-full border-gray-300 rounded-md shadow-sm focus:border-accent-teal focus:ring-accent-teal sm:text-sm"
                                                        value={item.mappedId}
                                                        onChange={(e) => {
                                                            const newItems = [...parsedItems];
                                                            newItems[idx].mappedId = e.target.value;
                                                            setParsedItems(newItems);
                                                        }}
                                                    >
                                                        <option value="NEW">✨ Create New Material</option>
                                                        <option value="SKIP">⏭️ Skip / Ignore</option>
                                                        <optgroup label="Existing Materials">
                                                            {dbMaterials.map(m => (
                                                                <option key={m.id} value={m.id}>{m.name}</option>
                                                            ))}
                                                        </optgroup>
                                                    </select>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {parsedItems.length > 0 && !isParsing && (
                    <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent-teal border border-transparent rounded-md hover:bg-teal-600 disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            Confirm & Update Stock
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
