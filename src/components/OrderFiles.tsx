import React, { useEffect, useState, useRef } from 'react';
import { StorageService, FileObject } from '../lib/StorageService';
import { Upload, FileText, Trash2, Download, Loader2, AlertCircle } from 'lucide-react';

interface OrderFilesProps {
    orderId: string;
}

const OrderFiles: React.FC<OrderFilesProps> = ({ orderId }) => {
    const [files, setFiles] = useState<FileObject[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadFiles = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await StorageService.listFiles(orderId);
            setFiles(data);
        } catch (err: any) {
            console.error(err);
            setError('Failed to load files. Ensure "order-files" bucket exists in Supabase.');
        } finally {
            setLoading(false);
        }
    }, [orderId]);

    useEffect(() => {
        loadFiles();
    }, [loadFiles]);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const fileList = event.target.files;
        if (!fileList || fileList.length === 0) return;

        const file = fileList[0];
        setUploading(true);
        setError(null);

        try {
            await StorageService.uploadFile(orderId, file);
            await loadFiles(); // Refresh list
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Upload failed');
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleDelete = async (fileName: string) => {
        if (!confirm(`Are you sure you want to delete "${fileName}"?`)) return;

        try {
            await StorageService.deleteFile(orderId, fileName);
            setFiles(files.filter(f => f.name !== fileName));
        } catch (err: any) {
            alert('Failed to delete file: ' + err.message);
        }
    };

    const handleDownload = (fileName: string) => {
        const url = StorageService.getDownloadUrl(orderId, fileName);
        window.open(url, '_blank');
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800">Order Attachments</h3>
                <div>
                    <input
                        type="file"
                        aria-label="Upload File"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="btn-primary flex items-center gap-2"
                    >
                        {uploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                        {uploading ? 'Uploading...' : 'Upload File'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2 text-sm border border-red-100">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            {loading ? (
                <div className="text-center py-12 text-gray-400">
                    <Loader2 className="animate-spin mx-auto mb-2" />
                    Loading files...
                </div>
            ) : files.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
                        <Upload size={24} />
                    </div>
                    <p className="text-gray-500 font-medium">No files uploaded yet</p>
                    <p className="text-xs text-gray-400 mt-1">Upload designs, mockups, or documents here.</p>
                </div>
            ) : (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                    <ul className="divide-y divide-gray-100">
                        {files.map((file) => (
                            <li key={file.name} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center shrink-0">
                                        <FileText size={20} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-medium text-gray-900 truncate">{file.name}</p>
                                        <p className="text-xs text-gray-500">{formatSize(file.metadata?.size || 0)} • {new Date(file.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleDownload(file.name)}
                                        className="p-2 text-gray-400 hover:text-accent-teal hover:bg-teal-50 rounded-full transition-colors"
                                        title="Download"
                                    >
                                        <Download size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(file.name)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default OrderFiles;
