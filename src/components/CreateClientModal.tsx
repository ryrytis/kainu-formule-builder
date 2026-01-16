import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { X, Loader2, Search, MapPin, Check } from 'lucide-react';

interface CreateClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    clientToEdit?: any | null;
}

const CreateClientModal: React.FC<CreateClientModalProps> = ({ isOpen, onClose, onSuccess, clientToEdit }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        company: '',
        company_code: '',
        vat_code: '',
        vat_payer: false,
        address: '',
        city: '',
        post_code: '',
        person_type: 'Person' as 'Person' | 'Legal',
        delivery_method: 'Pickup',
        parcel_locker: '',
        notes: ''
    });

    const [lockerSearch, setLockerSearch] = useState('');
    const [lockers, setLockers] = useState<any[]>([]);
    const [isLoadingLockers, setIsLoadingLockers] = useState(false);
    const [isLockerDropdownOpen, setIsLockerDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsLockerDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const searchLockers = async () => {
            if (lockerSearch.length < 2) {
                setLockers([]);
                return;
            }

            setIsLoadingLockers(true);
            try {
                const { data, error } = await (supabase as any)
                    .from('venipak_pickup_points')
                    .select('*')
                    .or(`pastomat_city.ilike."%${lockerSearch}%",pastomat_name.ilike."%${lockerSearch}%"`)
                    .limit(10);

                if (error) throw error;
                setLockers(data || []);
                setIsLockerDropdownOpen(true);
            } catch (err) {
                console.error('Error fetching lockers:', err);
            } finally {
                setIsLoadingLockers(false);
            }
        };

        const debounce = setTimeout(searchLockers, 300);
        return () => clearTimeout(debounce);
    }, [lockerSearch]);

    useEffect(() => {
        if (clientToEdit) {
            setFormData({
                name: clientToEdit.name || '',
                email: clientToEdit.email || '',
                phone: clientToEdit.phone || '',
                company: clientToEdit.company || '',
                company_code: clientToEdit.company_code || '',
                vat_code: clientToEdit.vat_code || '',
                vat_payer: clientToEdit.vat_payer || false,
                address: clientToEdit.address || '',
                city: clientToEdit.city || '',
                post_code: clientToEdit.post_code || '',
                person_type: clientToEdit.person_type || 'Person',
                delivery_method: clientToEdit.delivery_method || 'Pickup',
                parcel_locker: clientToEdit.parcel_locker || '',
                notes: clientToEdit.notes || ''
            });
            if (clientToEdit.parcel_locker) {
                setLockerSearch(clientToEdit.parcel_locker);
            }
        } else {
            setFormData({
                name: '',
                email: '',
                phone: '',
                company: '',
                company_code: '',
                vat_code: '',
                vat_payer: false,
                address: '',
                city: '',
                post_code: '',
                person_type: 'Person',
                delivery_method: 'Pickup',
                parcel_locker: '',
                notes: ''
            });
        }
    }, [clientToEdit, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Clean up payload based on logic
            const payload = { ...formData };
            if (payload.person_type === 'Person') {
                payload.company = '';
                payload.company_code = '';
                payload.vat_code = '';
                payload.vat_payer = false;
            } else if (!payload.vat_payer) {
                payload.vat_code = '';
            }

            if (payload.person_type === 'Legal' && !payload.company.trim()) {
                alert('Company Name is required for Legal Persons.');
                setLoading(false);
                return;
            }

            // Validation for mandatory Email and Phone
            if (!payload.email || !payload.email.trim()) {
                alert('Email Address is required.');
                setLoading(false);
                return;
            }
            if (!payload.phone || !payload.phone.trim()) {
                alert('Phone Number is required.');
                setLoading(false);
                return;
            }

            let error;

            if (clientToEdit) {
                const { error: updateError } = await (supabase as any)
                    .from('clients')
                    .update(payload)
                    .eq('id', clientToEdit.id);
                error = updateError;
            } else {
                const { error: insertError } = await (supabase as any)
                    .from('clients')
                    .insert([payload]);
                error = insertError;
            }

            if (error) throw error;
            onSuccess();
        } catch (error: any) {
            console.error('Error saving client:', error);
            if (error.code === '23505') {
                alert('Failed to save: This record already exists.');
            } else {
                alert(`Failed to save client: ${error.message || 'Unknown error'}`);
            }
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/80 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-primary">
                        {clientToEdit ? 'Edit Client' : 'New Client'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors" aria-label="Close">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
                    {/* Client Type Toggle */}
                    <div className="flex gap-4 p-1 bg-gray-50 w-fit border border-gray-200">
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, person_type: 'Person' })}
                            className={`px-6 py-2 text-sm font-bold uppercase tracking-wide transition-all ${formData.person_type === 'Person' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-primary'}`}
                        >
                            Private Person
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, person_type: 'Legal' })}
                            className={`px-6 py-2 text-sm font-bold uppercase tracking-wide transition-all ${formData.person_type === 'Legal' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-primary'}`}
                        >
                            Company
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label htmlFor="client-name" className="text-xs font-bold text-gray-500 uppercase">
                                {formData.person_type === 'Legal' ? 'Contact Person *' : 'Full Name *'}
                            </label>
                            <input
                                id="client-name"
                                required
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full border-b-2 border-gray-200 p-2 focus:border-accent-teal outline-none transition-colors"
                            />
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="client-email" className="text-xs font-bold text-gray-500 uppercase">Email Address *</label>
                            <input
                                id="client-email"
                                type="email"
                                required
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className="w-full border-b-2 border-gray-200 p-2 focus:border-accent-teal outline-none transition-colors"
                            />
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="client-phone" className="text-xs font-bold text-gray-500 uppercase">Phone Number *</label>
                            <input
                                id="client-phone"
                                type="tel"
                                required
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full border-b-2 border-gray-200 p-2 focus:border-accent-teal outline-none transition-colors"
                            />
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="client-city" className="text-xs font-bold text-gray-500 uppercase">City</label>
                            <input
                                id="client-city"
                                type="text"
                                value={formData.city}
                                onChange={e => setFormData({ ...formData, city: e.target.value })}
                                className="w-full border-b-2 border-gray-200 p-2 focus:border-accent-teal outline-none transition-colors"
                            />
                        </div>
                    </div>

                    {formData.person_type === 'Legal' && (
                        <div className="bg-gray-50 p-6 space-y-4 border border-gray-100">
                            <h3 className="font-bold text-primary text-sm uppercase border-b pb-2">Company Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label htmlFor="company-name" className="text-xs font-bold text-gray-500 uppercase">Company Name *</label>
                                    <input
                                        id="company-name"
                                        type="text"
                                        required={formData.person_type === 'Legal'}
                                        value={formData.company}
                                        onChange={e => setFormData({ ...formData, company: e.target.value })}
                                        className="w-full border p-2 bg-white"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="company-code" className="text-xs font-bold text-gray-500 uppercase">Company Code</label>
                                    <input
                                        id="company-code"
                                        type="text"
                                        value={formData.company_code}
                                        onChange={e => setFormData({ ...formData, company_code: e.target.value })}
                                        className="w-full border p-2 bg-white"
                                    />
                                </div>
                                <div className="flex flex-col justify-end">
                                    <label className="flex items-center gap-2 cursor-pointer p-2 border bg-white hover:border-accent-teal transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={formData.vat_payer}
                                            onChange={e => setFormData({ ...formData, vat_payer: e.target.checked })}
                                            className="w-4 h-4 text-accent-teal rounded focus:ring-accent-teal"
                                        />
                                        <span className="text-sm font-bold text-gray-600">Is VAT Payer?</span>
                                    </label>
                                </div>
                                {formData.vat_payer && (
                                    <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                        <label className="text-xs font-bold text-gray-500 uppercase">VAT Code</label>
                                        <input
                                            type="text"
                                            value={formData.vat_code}
                                            onChange={e => setFormData({ ...formData, vat_code: e.target.value })}
                                            className="w-full border p-2 bg-white border-l-4 border-l-accent-teal"
                                            placeholder="LT..."
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Delivery Details</label>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <label htmlFor="delivery-method" className="text-xs font-bold text-gray-500 uppercase">Method</label>
                                <select
                                    id="delivery-method"
                                    value={formData.delivery_method}
                                    onChange={e => setFormData({ ...formData, delivery_method: e.target.value })}
                                    className="w-full border p-2 bg-white focus:border-accent-teal outline-none"
                                >
                                    <option value="Pickup">Pickup</option>
                                    <option value="Courier">Courier</option>
                                    <option value="Locker">Parcel Locker</option>
                                </select>
                            </div>

                            {formData.delivery_method === 'Locker' ? (
                                <div className="md:col-span-2 space-y-1 relative">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Search Parcel Locker (City or Name)</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                            <Search size={16} />
                                        </div>
                                        <input
                                            type="text"
                                            value={formData.parcel_locker || lockerSearch}
                                            onChange={e => {
                                                setLockerSearch(e.target.value);
                                                if (formData.parcel_locker) {
                                                    setFormData({ ...formData, parcel_locker: '' });
                                                }
                                            }}
                                            onFocus={() => {
                                                if (lockers.length > 0) setIsLockerDropdownOpen(true);
                                            }}
                                            className="w-full border p-2 pl-10 bg-white focus:border-accent-teal outline-none"
                                            placeholder="Enter city or terminal name..."
                                        />
                                        {isLoadingLockers && (
                                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                                <Loader2 size={16} className="animate-spin text-accent-teal" />
                                            </div>
                                        )}
                                    </div>

                                    {isLockerDropdownOpen && (lockers.length > 0 || isLoadingLockers) && (
                                        <div ref={dropdownRef} className="absolute z-50 w-full mt-1 bg-white border border-gray-200 shadow-xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-200">
                                            {lockers.map((locker) => (
                                                <button
                                                    key={locker.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData({ ...formData, parcel_locker: locker.pastomat_name });
                                                        setLockerSearch(locker.pastomat_name);
                                                        setIsLockerDropdownOpen(false);
                                                    }}
                                                    className="w-full text-left p-3 hover:bg-gray-50 flex items-start gap-3 border-b border-gray-50 last:border-0 transition-colors"
                                                >
                                                    <div className="p-1.5 bg-purple-50 rounded-md text-purple-600 shrink-0">
                                                        <MapPin size={16} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-gray-900 truncate">{locker.pastomat_name}</p>
                                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                                            <span className="font-medium text-purple-600">{locker.pastomat_city}</span>
                                                            <span>•</span>
                                                            <span className="truncate">{locker.pastomat_address}</span>
                                                        </div>
                                                    </div>
                                                    {formData.parcel_locker === locker.pastomat_name && (
                                                        <Check size={16} className="text-accent-teal mt-1" />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {formData.parcel_locker && !isLockerDropdownOpen && (
                                        <div className="mt-2 p-2 bg-teal-50 border border-teal-100 rounded flex items-center justify-between animate-in fade-in duration-300">
                                            <div className="flex items-center gap-2">
                                                <Check size={14} className="text-accent-teal" />
                                                <span className="text-xs font-medium text-accent-teal truncate">Selected: {formData.parcel_locker}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setFormData({ ...formData, parcel_locker: '' });
                                                    setLockerSearch('');
                                                }}
                                                className="text-[10px] font-bold text-accent-teal uppercase hover:underline"
                                            >
                                                Clear
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Address / Street</label>
                                        <input
                                            type="text"
                                            value={formData.address}
                                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                                            className="w-full border p-2 bg-white"
                                            placeholder="Street Address"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Post Code</label>
                                        <input
                                            type="text"
                                            value={formData.post_code}
                                            onChange={e => setFormData({ ...formData, post_code: e.target.value })}
                                            className="w-full border p-2 bg-white"
                                            placeholder="ZIP"
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                        <button onClick={onClose} className="px-6 py-3 text-sm font-bold uppercase text-gray-500 hover:bg-gray-200 transition-colors">
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="btn-accent flex items-center gap-2"
                        >
                            {loading && <Loader2 className="animate-spin" size={16} />}
                            Save Client
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateClientModal;
