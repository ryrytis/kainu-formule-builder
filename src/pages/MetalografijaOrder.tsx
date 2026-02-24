import React, { useState, useRef, useCallback } from 'react';
import { Send, Upload, X, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

// --- Dropdown options (based on metalografija.lt form) ---
const DIE_TECHNOLOGY_OPTIONS = [
    { value: '', label: 'Please Select' },
    { value: 'CNC Engraved', label: 'CNC Engraved' },
    { value: 'Chemically Etched', label: 'Chemically Etched' },
    { value: 'Combination', label: 'Combination (CNC + Etched)' },
];

const DIE_TYPE_OPTIONS = [
    { value: '', label: 'Please Select' },
    { value: 'Flat Die', label: 'Flat Die' },
    { value: 'Cylinder Die', label: 'Cylinder Die' },
    { value: 'Round Die', label: 'Round Die' },
];

const KLISES_TIPAS_OPTIONS = [
    { value: '', label: 'Pasirinkite' },
    { value: 'E', label: 'E – Embossing' },
    { value: 'G', label: 'G – Hot Stamping (Gilt)' },
    { value: 'E+G', label: 'E+G – Embossing + Hot Stamping' },
];

const RELIEF_PROFILE_OPTIONS = [
    { value: '', label: 'Please Select' },
    { value: 'Flat', label: 'Flat' },
    { value: 'Rounded', label: 'Rounded' },
    { value: 'Beveled', label: 'Beveled' },
    { value: 'Multi-level', label: 'Multi-level' },
    { value: 'Sculptured', label: 'Sculptured' },
];

const STAMPING_TEMPERATURE_OPTIONS = [
    { value: '', label: 'Please Select' },
    { value: '80-100°C', label: '80–100°C' },
    { value: '100-120°C', label: '100–120°C' },
    { value: '120-140°C', label: '120–140°C' },
    { value: '140-160°C', label: '140–160°C' },
    { value: '160-180°C', label: '160–180°C' },
    { value: 'Other', label: 'Other (specify below)' },
];

const TYPE_OF_STOCK_OPTIONS = [
    { value: '', label: 'Please Select' },
    { value: 'Paper', label: 'Paper' },
    { value: 'Cardboard', label: 'Cardboard' },
    { value: 'Leather', label: 'Leather' },
    { value: 'Plastic', label: 'Plastic' },
    { value: 'Fabric', label: 'Fabric' },
    { value: 'Wood', label: 'Wood' },
    { value: 'Other', label: 'Other' },
];

const DELIVERY_METHOD_OPTIONS = [
    { value: '', label: 'Please Select' },
    { value: 'Venipak', label: 'Venipak' },
    { value: 'DHL', label: 'DHL Express' },
    { value: 'Self Collection', label: 'Self Collection' },
];

const COUNTRY_OPTIONS = [
    { value: 'Lithuania', label: 'Lithuania' },
    { value: 'Latvia', label: 'Latvia' },
    { value: 'Estonia', label: 'Estonia' },
    { value: 'Poland', label: 'Poland' },
    { value: 'Germany', label: 'Germany' },
    { value: 'United Kingdom', label: 'United Kingdom' },
    { value: 'France', label: 'France' },
    { value: 'Netherlands', label: 'Netherlands' },
    { value: 'Sweden', label: 'Sweden' },
    { value: 'Finland', label: 'Finland' },
    { value: 'Denmark', label: 'Denmark' },
    { value: 'Norway', label: 'Norway' },
    { value: 'Other', label: 'Other' },
];

// --- Types ---
interface FileItem {
    file: File;
    id: string;
}

interface FormState {
    customerName: string;
    contactEmail: string;
    projectName: string;
    dieTechnology: string;
    dieType: string;
    klisesTipas: string;
    dieQty: string;
    counterDieQty: string;
    reliefProfile: string;
    stampingTemperature: string;
    otherTemperature: string;
    typeOfStock: string;
    substrateName: string;
    stockGrammage: string;
    stockThickness: string;
    deliveryMethod: string;
    recipient: string;
    street: string;
    city: string;
    postCode: string;
    country: string;
    phoneNo: string;
    preferredDispatchDate: string;
    notes: string;
}

// Generate a random project number like "KP-20260224-7A3F"
const generateProjectNumber = () => {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `KP-${datePart}-${randPart}`;
};

const INITIAL_FORM: FormState = {
    customerName: 'MB Keturi print',
    contactEmail: 'agniete@keturiprint.lt',
    projectName: generateProjectNumber(),
    dieTechnology: 'CNC Engraved',
    dieType: '',
    klisesTipas: '',
    dieQty: '',
    counterDieQty: '',
    reliefProfile: '',
    stampingTemperature: '',
    otherTemperature: '',
    typeOfStock: 'Paper',
    substrateName: '',
    stockGrammage: '',
    stockThickness: '',
    deliveryMethod: 'DHL',
    recipient: 'MB Keturi print',
    street: 'Pakalnės 8-2',
    city: 'Ramučiai',
    postCode: '54464',
    country: 'Lithuania',
    phoneNo: '+37069663915',
    preferredDispatchDate: (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })(),
    notes: '',
};

const MetalografijaOrder: React.FC = () => {
    const [form, setForm] = useState<FormState>(INITIAL_FORM);
    const [files, setFiles] = useState<FileItem[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Handlers ---
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleFiles = useCallback((newFiles: FileList | File[]) => {
        const items: FileItem[] = Array.from(newFiles).map(file => ({
            file,
            id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`
        }));
        setFiles(prev => [...prev, ...items]);
    }, []);

    const removeFile = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    // Drag & Drop
    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
        if (e.type === 'dragleave') setDragActive(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
    }, [handleFiles]);

    // Convert file to base64
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const base64 = (reader.result as string).split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
        });
    };

    // --- Submit ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setResult(null);

        try {
            // Prepare file data as base64
            const filePayloads = await Promise.all(
                files.map(async (f) => ({
                    name: f.file.name,
                    type: f.file.type,
                    data: await fileToBase64(f.file),
                }))
            );

            const payload = {
                ...form,
                files: filePayloads,
            };

            const response = await fetch('/api/metalografija_order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            setResult({
                success: data.success,
                message: data.message || (data.success ? 'Order submitted successfully!' : 'Submission failed. Please try again.'),
            });

            if (data.success) {
                setForm(INITIAL_FORM);
                setFiles([]);
            }
        } catch (err: any) {
            setResult({
                success: false,
                message: `Error: ${err.message}`,
            });
        } finally {
            setSubmitting(false);
        }
    };

    // --- Render helpers ---
    const renderField = (label: string, name: keyof FormState, options?: { type?: string; placeholder?: string; required?: boolean }) => (
        <div>
            <label className="label">
                {label} {options?.required && <span className="text-red-500">*</span>}
            </label>
            <input
                type={options?.type || 'text'}
                name={name}
                value={form[name]}
                onChange={handleChange}
                className="input w-full"
                placeholder={options?.placeholder || ''}
                required={options?.required}
            />
        </div>
    );

    const renderSelect = (label: string, name: keyof FormState, selectOptions: { value: string; label: string }[], required?: boolean) => (
        <div>
            <label className="label">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <select
                name={name}
                value={form[name]}
                onChange={handleChange}
                className="input w-full"
                required={required}
                aria-label={label}
            >
                {selectOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>
    );

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1048576).toFixed(1)} MB`;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300 max-w-4xl">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-primary">Metalografija Order</h1>
                <p className="text-gray-500">
                    Submit an order to{' '}
                    <a href="https://metalografija.lt/lt/uzsakymas-28" target="_blank" rel="noopener noreferrer" className="text-accent-teal hover:underline">
                        metalografija.lt
                    </a>
                </p>
            </div>

            {/* Result Toast */}
            {result && (
                <div className={`flex items-center gap-3 p-4 rounded-lg border ${result.success
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                    }`}>
                    {result.success ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    <p className="text-sm font-medium">{result.message}</p>
                    <button onClick={() => setResult(null)} className="ml-auto text-gray-400 hover:text-gray-600">
                        <X size={16} />
                    </button>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* ── Section 1: Customer Info ── */}
                <div className="card">
                    <h2 className="text-sm font-bold text-gray-900 uppercase mb-4 flex items-center gap-2">
                        <span className="w-6 h-6 bg-accent-teal text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                        Customer & Project
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {renderField('Customer Name', 'customerName', { required: true, placeholder: 'Your company name' })}
                        {renderField('Contact E-mail', 'contactEmail', { type: 'email', required: true, placeholder: 'email@example.com' })}
                    </div>
                    <div className="mt-4">
                        {renderField('Project Name / PO', 'projectName', { required: true, placeholder: 'Project name or Purchase Order number' })}
                    </div>
                </div>

                {/* ── Section 2: Die Specifications ── */}
                <div className="card">
                    <h2 className="text-sm font-bold text-gray-900 uppercase mb-4 flex items-center gap-2">
                        <span className="w-6 h-6 bg-accent-teal text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                        Die Specifications
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {renderSelect('Die Technology', 'dieTechnology', DIE_TECHNOLOGY_OPTIONS, true)}
                        {renderSelect('Die Type', 'dieType', DIE_TYPE_OPTIONS, true)}
                        {renderSelect('Klišės tipas (E+G)', 'klisesTipas', KLISES_TIPAS_OPTIONS, true)}
                        {renderSelect('Relief Profile', 'reliefProfile', RELIEF_PROFILE_OPTIONS)}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        {renderField('Die Qty', 'dieQty', { type: 'number', required: true, placeholder: '1' })}
                        {renderField('Counter Die Qty', 'counterDieQty', { type: 'number', required: true, placeholder: '0' })}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        {renderSelect('Stamping Temperature', 'stampingTemperature', STAMPING_TEMPERATURE_OPTIONS)}
                        {form.stampingTemperature === 'Other' && (
                            renderField('Other Temperature', 'otherTemperature', { placeholder: 'e.g., 200°C' })
                        )}
                    </div>
                </div>

                {/* ── Section 3: Material ── */}
                <div className="card">
                    <h2 className="text-sm font-bold text-gray-900 uppercase mb-4 flex items-center gap-2">
                        <span className="w-6 h-6 bg-accent-teal text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                        Material / Substrate
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {renderSelect('Type of Stock', 'typeOfStock', TYPE_OF_STOCK_OPTIONS, true)}
                        {renderField('Substrate Name', 'substrateName', { required: true, placeholder: 'Name of stock to stamp on' })}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        {renderField('Stock Grammage (g/m²)', 'stockGrammage', { required: true, placeholder: 'e.g., 300' })}
                        {renderField('Stock Thickness (mm)', 'stockThickness', { required: true, placeholder: 'e.g., 0.5' })}
                    </div>
                </div>

                {/* ── Section 4: Delivery ── */}
                <div className="card">
                    <h2 className="text-sm font-bold text-gray-900 uppercase mb-4 flex items-center gap-2">
                        <span className="w-6 h-6 bg-accent-teal text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
                        Delivery
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {renderSelect('Delivery Method', 'deliveryMethod', DELIVERY_METHOD_OPTIONS, true)}
                        {renderField('Preferred Dispatch Date', 'preferredDispatchDate', { type: 'date' })}
                    </div>

                    <h3 className="text-xs font-semibold text-gray-500 uppercase mt-5 mb-3">Delivery Address</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {renderField('Recipient', 'recipient', { placeholder: 'Recipient name' })}
                        {renderField('Street', 'street', { placeholder: 'Street address' })}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        {renderField('City', 'city', { placeholder: 'City' })}
                        {renderField('Post Code', 'postCode', { placeholder: 'Post code' })}
                        {renderSelect('Country', 'country', COUNTRY_OPTIONS)}
                    </div>
                    <div className="mt-4">
                        {renderField('Phone No', 'phoneNo', { type: 'tel', required: true, placeholder: '+370...' })}
                    </div>
                </div>

                {/* ── Section 5: Notes & Files ── */}
                <div className="card">
                    <h2 className="text-sm font-bold text-gray-900 uppercase mb-4 flex items-center gap-2">
                        <span className="w-6 h-6 bg-accent-teal text-white rounded-full flex items-center justify-center text-xs font-bold">5</span>
                        Notes & Artwork
                    </h2>

                    <div className="mb-4">
                        <label className="label">Notes</label>
                        <textarea
                            name="notes"
                            value={form.notes}
                            onChange={handleChange}
                            className="input w-full min-h-[100px] resize-y"
                            placeholder="Any special instructions, artwork notes, etc."
                        />
                    </div>

                    {/* File Upload Zone */}
                    <div>
                        <label className="label">Upload Files</label>
                        <div
                            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${dragActive
                                ? 'border-accent-teal bg-teal-50'
                                : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                                }`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload size={32} className="mx-auto mb-2 text-gray-400" />
                            <p className="text-sm text-gray-600 font-medium">
                                Drag & drop files here, or <span className="text-accent-teal">browse</span>
                            </p>
                            <p className="text-xs text-gray-400 mt-1">PDF, AI, EPS, CDR, SVG, PNG, JPG</p>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            className="hidden"
                            aria-label="Upload artwork files"
                            accept=".pdf,.ai,.eps,.cdr,.svg,.png,.jpg,.jpeg,.tif,.tiff"
                            onChange={(e) => {
                                if (e.target.files) handleFiles(e.target.files);
                                e.target.value = '';
                            }}
                        />

                        {/* File List */}
                        {files.length > 0 && (
                            <div className="mt-3 space-y-2">
                                {files.map(f => (
                                    <div key={f.id} className="flex items-center gap-3 p-2 bg-white border border-gray-200 rounded-md">
                                        <FileText size={18} className="text-accent-teal shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{f.file.name}</p>
                                            <p className="text-xs text-gray-400">{formatFileSize(f.file.size)}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeFile(f.id)}
                                            className="text-gray-400 hover:text-red-500 transition-colors"
                                            title="Remove file"
                                            aria-label={`Remove ${f.file.name}`}
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Submit ── */}
                <div className="flex items-center gap-4">
                    <button
                        type="submit"
                        disabled={submitting}
                        className="btn-primary flex items-center gap-2 px-8 py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitting ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            <>
                                <Send size={20} />
                                Submit Order
                            </>
                        )}
                    </button>
                    <p className="text-xs text-gray-400">
                        Order will be submitted directly to metalografija.lt
                    </p>
                </div>
            </form>
        </div>
    );
};

export default MetalografijaOrder;
