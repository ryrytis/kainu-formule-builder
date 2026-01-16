import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

type Client = Database['public']['Tables']['clients']['Row'];

interface ClientSelectProps {
    value: string | null;
    onChange: (clientId: string) => void;
    className?: string;
}

const ClientSelect: React.FC<ClientSelectProps & { onAddNew?: (name: string) => void }> = ({ value, onChange, className, onAddNew }) => {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchClients = async () => {
            try {
                const { data, error } = await supabase
                    .from('clients')
                    .select('*')
                    .order('name');

                if (error) throw error;
                setClients(data);
            } catch (error) {
                console.error('Error fetching clients:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchClients();
    }, []);

    const filteredClients = clients.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.company?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedClient = clients.find(c => c.id === value);

    return (
        <div className={twMerge("relative", className)}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                Client <span className="text-red-500">*</span>
            </label>

            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={clsx(
                        "w-full flex items-center justify-between px-3 py-2 bg-white border rounded-md shadow-sm text-sm text-left focus:outline-none focus:ring-1 focus:ring-accent-teal focus:border-accent-teal",
                        isOpen ? "border-accent-teal ring-1 ring-accent-teal" : "border-gray-300"
                    )}
                >
                    <span className={!selectedClient ? "text-gray-400" : "text-gray-900"}>
                        {selectedClient ? selectedClient.name : "Select a client..."}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 text-gray-400" />
                </button>

                {isOpen && (
                    <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                        <div className="sticky top-0 bg-white px-2 py-1.5 border-b">
                            <input
                                type="text"
                                className="w-full border-none focus:ring-0 text-sm px-2 py-1 text-gray-600 bg-gray-50 rounded"
                                placeholder="Search clients..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoFocus
                            />
                        </div>

                        {loading ? (
                            <div className="px-4 py-2 text-gray-500 flex items-center gap-2">
                                <Loader2 className="animate-spin h-4 w-4" /> Loading...
                            </div>
                        ) : filteredClients.length === 0 ? (
                            <div className="px-4 py-2 text-gray-500">
                                No clients found.
                                {onAddNew && searchTerm && (
                                    <button
                                        type="button"
                                        className="mt-2 w-full text-left text-accent-teal font-bold hover:underline"
                                        onClick={() => {
                                            onAddNew(searchTerm);
                                            setIsOpen(false);
                                        }}
                                    >
                                        + Create "{searchTerm}"
                                    </button>
                                )}
                            </div>
                        ) : (
                            <>
                                {filteredClients.map((client) => (
                                    <div
                                        key={client.id}
                                        className={clsx(
                                            "cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-100",
                                            value === client.id ? "bg-accent-teal/10" : ""
                                        )}
                                        onClick={() => {
                                            onChange(client.id);
                                            setIsOpen(false);
                                            setSearchTerm('');
                                        }}
                                    >
                                        <div className="flex items-center">
                                            <span className="font-medium block truncate mr-2">
                                                {client.name}
                                            </span>
                                            {client.company && (
                                                <span className="text-gray-400 font-normal truncate">
                                                    - {client.company}
                                                </span>
                                            )}
                                        </div>
                                        {value === client.id && (
                                            <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-accent-teal">
                                                <Check className="h-4 w-4" />
                                            </span>
                                        )}
                                    </div>
                                ))}
                                {onAddNew && searchTerm && !filteredClients.find(c => c.name.toLowerCase() === searchTerm.toLowerCase()) && (
                                    <div
                                        className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-100 text-accent-teal font-medium border-t border-gray-100"
                                        onClick={() => {
                                            onAddNew(searchTerm);
                                            setIsOpen(false);
                                        }}
                                    >
                                        <span className="block truncate">
                                            + Create new client: "{searchTerm}"
                                        </span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClientSelect;
