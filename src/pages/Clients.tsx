import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Edit, Trash2, Phone, Mail, MapPin, Building2, User, UserPlus, Loader2, Copy, Check, X, ExternalLink } from 'lucide-react';
import CreateClientModal from '../components/CreateClientModal';
import { EmailService } from '../lib/EmailService';

const Clients: React.FC = () => {
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<any | null>(null);
    const [sendingId, setSendingId] = useState<string | null>(null);
    const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
    const [editableData, setEditableData] = useState<any>(null);
    const [savingId, setSavingId] = useState<string | null>(null);

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('clients')
            .select('*')
            .order('created_at', { ascending: false });

        if (data) setClients(data);
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this client?')) return;
        const { error } = await supabase.from('clients').delete().eq('id', id);
        if (!error) fetchClients();
    };

    const handleEdit = (client: any) => {
        setInlineEditingId(client.id);
        setEditableData({ ...client });
    };

    const handleCancelInline = () => {
        setInlineEditingId(null);
        setEditableData(null);
    };

    const handleSaveInline = async () => {
        if (!editableData || !inlineEditingId) return;

        setSavingId(inlineEditingId);
        try {
            const { error } = await (supabase as any)
                .from('clients')
                .update({
                    name: editableData.name,
                    company: editableData.company,
                    email: editableData.email,
                    phone: editableData.phone,
                    address: editableData.address,
                    city: editableData.city
                })
                .eq('id', inlineEditingId);

            if (error) throw error;

            setClients(clients.map(c => c.id === inlineEditingId ? { ...c, ...editableData } : c));
            setInlineEditingId(null);
            setEditableData(null);
        } catch (error: any) {
            console.error('Error saving inline edit:', error);
            if (error.code === '23505') {
                alert('Failed to save: This record already exists.');
            } else {
                alert(`Failed to save changes: ${error.message || 'Unknown error'}`);
            }
        } finally {
            setSavingId(null);
        }
    };

    const handleCopyLink = (clientId: string) => {
        const url = `${window.location.origin}/onboarding/${clientId}`;
        navigator.clipboard.writeText(url);
        alert('Onboarding link copied to clipboard!');
    };

    const handleSendOnboarding = async (client: any) => {
        if (!client.email) {
            alert('Client must have an email address to send onboarding link.');
            return;
        }

        setSendingId(client.id);
        try {
            const result = await EmailService.sendWelcomeEmail(client.id, client.name, client.email);
            if (result.success) {
                alert(`Onboarding link sent to ${client.email}`);
            } else {
                alert(`Failed to send: ${result.error}`);
            }
        } catch (error) {
            console.error('Error sending onboarding:', error);
            alert('An unexpected error occurred.');
        } finally {
            setSendingId(null);
        }
    };

    const closeAndRefresh = () => {
        setIsModalOpen(false);
        setSelectedClient(null);
        fetchClients();
    };

    const filteredClients = clients.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.company?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-primary tracking-tight">Clients</h1>
                    <p className="text-gray-500 mt-1">Manage your customer database</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="btn-accent flex items-center gap-2"
                >
                    <Plus size={18} />
                    New Client
                </button>
            </div>

            {/* Search and Filters */}
            <div className="bg-white p-4 border border-gray-100 shadow-sm">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search clients by name, email, or company..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 focus:border-accent-teal outline-none transition-colors"
                    />
                </div>
            </div>

            {/* Clients Table */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-separate border-spacing-0">
                        <thead>
                            <tr className="border-b border-gray-100 text-gray-500 text-sm">
                                <th className="py-4 px-4 font-medium">Name</th>
                                <th className="py-4 px-4 font-medium">Company</th>
                                <th className="py-4 px-4 font-medium">Contact Info</th>
                                <th className="py-4 px-4 font-medium">Address</th>
                                <th className="py-4 px-4 font-medium">Type</th>
                                <th className="py-4 px-4 font-medium">Onboarding</th>
                                <th className="py-4 px-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="py-8 text-center text-gray-500">Loading clients...</td>
                                </tr>
                            ) : filteredClients.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-gray-400">
                                        <User size={48} className="mx-auto mb-3 opacity-20" />
                                        <p>No clients found matching your search.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredClients.map((client) => {
                                    const isEditing = inlineEditingId === client.id;
                                    const onboardingUrl = `${window.location.origin}/onboarding/${client.id}`;

                                    return (
                                        <tr key={client.id} className="hover:bg-gray-50 transition-colors group">
                                            {/* Name */}
                                            <td className="py-4 px-4 align-top">
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={editableData.name}
                                                        onChange={e => setEditableData({ ...editableData, name: e.target.value })}
                                                        className="w-full border-b border-gray-200 outline-none focus:border-accent-teal font-medium"
                                                        placeholder="Client Name"
                                                    />
                                                ) : (
                                                    <span className="font-medium text-primary block">{client.name}</span>
                                                )}
                                                <div className="text-[10px] text-gray-300 mt-1">
                                                    Added: {new Date(client.created_at).toLocaleDateString()}
                                                </div>
                                            </td>

                                            {/* Company */}
                                            <td className="py-4 px-4 align-top">
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={editableData.company || ''}
                                                        onChange={e => setEditableData({ ...editableData, company: e.target.value })}
                                                        className="w-full border-b border-gray-200 outline-none focus:border-accent-teal text-sm"
                                                        placeholder="Company Name"
                                                    />
                                                ) : (
                                                    <span className="text-sm text-gray-600">{client.company || '-'}</span>
                                                )}
                                            </td>

                                            {/* Contact Info (Email & Phone) */}
                                            <td className="py-4 px-4 align-top">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                                        <Mail size={14} className="text-gray-400 shrink-0" />
                                                        {isEditing ? (
                                                            <input
                                                                type="email"
                                                                value={editableData.email || ''}
                                                                onChange={e => setEditableData({ ...editableData, email: e.target.value })}
                                                                className="w-full border-b border-gray-200 outline-none focus:border-accent-teal"
                                                                placeholder="Email"
                                                            />
                                                        ) : (
                                                            <span className="truncate max-w-[150px]" title={client.email}>{client.email || '-'}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                                        <Phone size={14} className="text-gray-400 shrink-0" />
                                                        {isEditing ? (
                                                            <input
                                                                type="tel"
                                                                value={editableData.phone || ''}
                                                                onChange={e => setEditableData({ ...editableData, phone: e.target.value })}
                                                                className="w-full border-b border-gray-200 outline-none focus:border-accent-teal"
                                                                placeholder="Phone"
                                                            />
                                                        ) : (
                                                            <span>{client.phone || '-'}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Address */}
                                            <td className="py-4 px-4 align-top">
                                                <div className="flex items-start gap-2 text-sm text-gray-600">
                                                    <MapPin size={14} className="text-gray-400 shrink-0 mt-0.5" />
                                                    {isEditing ? (
                                                        <div className="space-y-1 w-full">
                                                            <input
                                                                type="text"
                                                                value={editableData.address || ''}
                                                                onChange={e => setEditableData({ ...editableData, address: e.target.value })}
                                                                className="w-full border-b border-gray-200 outline-none focus:border-accent-teal placeholder:text-xs"
                                                                placeholder="Address"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={editableData.city || ''}
                                                                onChange={e => setEditableData({ ...editableData, city: e.target.value })}
                                                                className="w-full border-b border-gray-200 outline-none focus:border-accent-teal placeholder:text-xs"
                                                                placeholder="City"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="max-w-[150px]">
                                                            <div className="truncate" title={client.address}>{client.address || '-'}</div>
                                                            <div className="text-xs text-gray-400">{client.city}</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Type */}
                                            <td className="py-4 px-4 align-top">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${client.person_type === 'Legal' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
                                                    {client.person_type === 'Legal' ? <Building2 size={12} /> : <User size={12} />}
                                                    {client.person_type === 'Legal' ? 'Company' : 'Private'}
                                                </span>
                                            </td>

                                            {/* Onboarding */}
                                            <td className="py-4 px-4 align-top">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleCopyLink(client.id)}
                                                        className="text-accent-teal hover:underline flex items-center gap-1 text-xs font-medium"
                                                        title="Copy onboarding link"
                                                    >
                                                        <Copy size={12} /> Copy Link
                                                    </button>
                                                    <a
                                                        href={onboardingUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-gray-300 hover:text-accent-teal"
                                                        title="Open onboarding page"
                                                    >
                                                        <ExternalLink size={12} />
                                                    </a>
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td className="py-4 px-4 align-top text-right">
                                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {isEditing ? (
                                                        <>
                                                            <button onClick={handleSaveInline} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Save">
                                                                {savingId === client.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                                            </button>
                                                            <button onClick={handleCancelInline} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Cancel">
                                                                <X size={16} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => handleSendOnboarding(client)}
                                                                className={`p-1.5 rounded ${sendingId === client.id ? 'text-accent-teal animate-pulse' : 'text-gray-400 hover:text-accent-teal hover:bg-gray-50'}`}
                                                                title="Send Onboarding Link"
                                                                disabled={sendingId === client.id}
                                                            >
                                                                {sendingId === client.id ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                                                            </button>
                                                            <button
                                                                onClick={() => handleEdit(client)}
                                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                                title="Quick Edit"
                                                            >
                                                                <Edit size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedClient(client);
                                                                    setIsModalOpen(true);
                                                                }}
                                                                className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-50 rounded"
                                                                title="Full Edit"
                                                            >
                                                                <ExternalLink size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(client.id)}
                                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                                                                title="Delete"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <CreateClientModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setSelectedClient(null); }}
                onSuccess={closeAndRefresh}
                clientToEdit={selectedClient}
            />
        </div>
    );
};

export default Clients;
