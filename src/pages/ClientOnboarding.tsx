import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { Loader2, CheckCircle2, Building2, User, MapPin, CreditCard, Send, Search, Check, Truck } from 'lucide-react';

// @ts-ignore
type Client = Database['public']['Tables']['clients']['Row'];

const ClientOnboarding: React.FC = () => {
    const { clientId } = useParams<{ clientId: string }>();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);
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
        parcel_locker: ''
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
        const fetchClient = async () => {
            if (!clientId) return;
            try {
                // Use proxy to bypass RLS
                const response = await fetch(`/api/client_proxy?clientId=${clientId}`);
                if (!response.ok) {
                    throw new Error(`Failed to fetch client: ${response.statusText}`);
                }
                const data = await response.json();

                if (data) {
                    setFormData({
                        name: data.name || '',
                        email: data.email || '',
                        phone: data.phone || '',
                        company: data.company || '',
                        company_code: data.company_code || '',
                        vat_code: data.vat_code || '',
                        vat_payer: data.vat_payer || false,
                        address: data.address || '',
                        city: data.city || '',
                        post_code: data.post_code || '',
                        person_type: (data.person_type as any) || 'Person',
                        delivery_method: data.delivery_method || 'Pickup',
                        parcel_locker: data.parcel_locker || ''
                    });
                    if (data.parcel_locker) {
                        setLockerSearch(data.parcel_locker);
                    }
                }
            } catch (err: any) {
                console.error('Error fetching client:', err);
                setError('Invalid onboarding link or client not found.');
            } finally {
                setLoading(false);
            }
        };

        fetchClient();
    }, [clientId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            // Use proxy to update
            const response = await fetch('/api/client_proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId,
                    ...formData
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || 'Update failed');
            }

            setSubmitted(true);
        } catch (err: any) {
            console.error('Error submitting form:', err);
            alert('Failed to submit details. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="animate-spin text-accent-teal" size={48} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="max-w-md w-full bg-white p-8 border border-gray-100 shadow-xl text-center">
                    <div className="text-red-500 mb-4 flex justify-center">
                        <User size={64} className="opacity-20" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
                    <p className="text-gray-500">{error}</p>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="max-w-md w-full bg-white p-12 border border-gray-100 shadow-2xl text-center animate-in zoom-in duration-300">
                    <div className="text-green-500 mb-6 flex justify-center">
                        <CheckCircle2 size={80} />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">Thank You!</h2>
                    <p className="text-gray-600 leading-relaxed">
                        Your details have been successfully updated in our system. We will contact you soon regarding your order.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <div className="bg-white shadow-2xl overflow-hidden">
                    <div className="bg-primary px-8 py-10 text-white flex flex-col sm:flex-row justify-between items-center gap-6">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold">Client Onboarding</h1>
                            <p className="text-gray-300 mt-2">Please complete your billing and delivery information</p>
                        </div>
                        <div className="hidden sm:block opacity-20">
                            <Building2 size={80} />
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 sm:p-12 space-y-10">
                        {/* Person Type Selector */}
                        <div className="flex gap-4 p-1 bg-gray-50 w-full sm:w-fit border border-gray-200">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, person_type: 'Person' })}
                                className={`flex-1 sm:flex-none px-8 py-3 text-sm font-bold uppercase tracking-wide transition-all ${formData.person_type === 'Person' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-primary'}`}
                            >
                                Private Person
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, person_type: 'Legal' })}
                                className={`flex-1 sm:flex-none px-8 py-3 text-sm font-bold uppercase tracking-wide transition-all ${formData.person_type === 'Legal' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-primary'}`}
                            >
                                Company
                            </button>
                        </div>

                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                            <div className="space-y-2">
                                <label htmlFor="client-name" className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
                                    <User size={14} /> Full Name / Representative *
                                </label>
                                <input
                                    id="client-name"
                                    required
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full border-b-2 border-gray-200 p-2 focus:border-accent-teal outline-none transition-colors font-medium text-lg"
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="client-email" className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
                                    <Send size={14} /> Email Address *
                                </label>
                                <input
                                    id="client-email"
                                    required
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full border-b-2 border-gray-200 p-2 focus:border-accent-teal outline-none transition-colors font-medium text-lg"
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="client-phone" className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
                                    <MapPin size={14} /> Phone Number *
                                </label>
                                <input
                                    id="client-phone"
                                    required
                                    type="tel"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full border-b-2 border-gray-200 p-2 focus:border-accent-teal outline-none transition-colors font-medium text-lg"
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="client-city" className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
                                    <MapPin size={14} /> City
                                </label>
                                <input
                                    id="client-city"
                                    type="text"
                                    value={formData.city}
                                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                                    className="w-full border-b-2 border-gray-200 p-2 focus:border-accent-teal outline-none transition-colors font-medium text-lg"
                                />
                            </div>
                        </div>

                        {/* Company Details */}
                        {formData.person_type === 'Legal' && (
                            <div className="bg-gray-50 p-8 space-y-6 border border-gray-200 animate-in fade-in slide-in-from-top-4 duration-300">
                                <h3 className="font-bold text-primary text-sm uppercase flex items-center gap-3 border-b border-gray-200 pb-3">
                                    <Building2 size={18} /> Company Billing Details
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2 space-y-1">
                                        <label htmlFor="company-name" className="text-xs font-bold text-gray-500 uppercase">Registered Company Name</label>
                                        <input
                                            id="company-name"
                                            type="text"
                                            value={formData.company}
                                            onChange={e => setFormData({ ...formData, company: e.target.value })}
                                            className="w-full border p-3 bg-white focus:border-accent-teal outline-none transition-colors"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="company-code" className="text-xs font-bold text-gray-500 uppercase">Company Code</label>
                                        <input
                                            id="company-code"
                                            type="text"
                                            value={formData.company_code}
                                            onChange={e => setFormData({ ...formData, company_code: e.target.value })}
                                            className="w-full border p-3 bg-white focus:border-accent-teal outline-none transition-colors"
                                        />
                                    </div>
                                    <div className="flex flex-col justify-end pb-3">
                                        <label className="flex items-center gap-3 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={formData.vat_payer}
                                                onChange={e => setFormData({ ...formData, vat_payer: e.target.checked })}
                                                className="w-5 h-5 text-accent-teal border-gray-300 rounded focus:ring-accent-teal transition-all"
                                            />
                                            <span className="text-sm font-bold text-gray-700">Company is VAT Payer</span>
                                        </label>
                                    </div>
                                    {formData.vat_payer && (
                                        <div className="md:col-span-2 animate-in fade-in slide-in-from-top-2 duration-200 space-y-1">
                                            <label htmlFor="vat-code" className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                                                <CreditCard size={14} /> VAT Code
                                            </label>
                                            <input
                                                id="vat-code"
                                                type="text"
                                                value={formData.vat_code}
                                                onChange={e => setFormData({ ...formData, vat_code: e.target.value })}
                                                className="w-full border p-3 bg-white border-l-4 border-l-accent-teal focus:border-accent-teal outline-none transition-colors"
                                                placeholder="LT..."
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Delivery Method Selector */}
                        <div className="space-y-6">
                            <h3 className="text-xs font-bold text-gray-400 uppercase border-b pb-2 flex items-center gap-2">
                                <Truck size={14} /> Delivery Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="space-y-1">
                                    <label htmlFor="delivery-method" className="text-xs font-bold text-gray-500 uppercase">Method</label>
                                    <select
                                        id="delivery-method"
                                        value={formData.delivery_method}
                                        onChange={e => setFormData({ ...formData, delivery_method: e.target.value })}
                                        className="w-full border p-3 bg-white focus:border-accent-teal outline-none transition-colors"
                                    >
                                        <option value="Pickup">Pickup</option>
                                        <option value="Courier">Courier</option>
                                        <option value="Locker">Parcel Locker</option>
                                    </select>
                                </div>

                                {formData.delivery_method === 'Locker' ? (
                                    <div className="md:col-span-3 space-y-1 relative">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Search Parcel Locker (City or Name)</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                                <Search size={18} />
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
                                                className="w-full border p-3 pl-10 bg-white focus:border-accent-teal outline-none text-lg font-medium"
                                                placeholder="Enter city or terminal name..."
                                            />
                                            {isLoadingLockers && (
                                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                                    <Loader2 size={18} className="animate-spin text-accent-teal" />
                                                </div>
                                            )}
                                        </div>

                                        {isLockerDropdownOpen && (lockers.length > 0 || isLoadingLockers) && (
                                            <div ref={dropdownRef} className="absolute z-50 w-full mt-1 bg-white border border-gray-200 shadow-2xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-200 rounded-md ring-1 ring-black ring-opacity-5">
                                                {lockers.map((locker) => (
                                                    <button
                                                        key={locker.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData({ ...formData, parcel_locker: locker.pastomat_name });
                                                            setLockerSearch(locker.pastomat_name);
                                                            setIsLockerDropdownOpen(false);
                                                        }}
                                                        className="w-full text-left p-4 hover:bg-gray-50 flex items-start gap-3 border-b border-gray-50 last:border-0 transition-colors"
                                                    >
                                                        <div className="p-2 bg-purple-50 rounded-lg text-purple-600 shrink-0">
                                                            <MapPin size={18} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-base font-bold text-gray-900 truncate">{locker.pastomat_name}</p>
                                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                                <span className="font-semibold text-purple-600">{locker.pastomat_city}</span>
                                                                <span>•</span>
                                                                <span className="truncate">{locker.pastomat_address}</span>
                                                            </div>
                                                        </div>
                                                        {formData.parcel_locker === locker.pastomat_name && (
                                                            <Check size={20} className="text-accent-teal mt-1 shrink-0" />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {formData.parcel_locker && !isLockerDropdownOpen && (
                                            <div className="mt-2 p-3 bg-teal-50 border border-teal-100 rounded-md flex items-center justify-between animate-in fade-in duration-300">
                                                <div className="flex items-center gap-3">
                                                    <Check size={18} className="text-accent-teal" />
                                                    <span className="text-sm font-bold text-accent-teal truncate">Selected: {formData.parcel_locker}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData({ ...formData, parcel_locker: '' });
                                                        setLockerSearch('');
                                                    }}
                                                    className="text-xs font-bold text-accent-teal uppercase hover:underline p-1"
                                                >
                                                    Clear Selection
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        <div className="md:col-span-2 space-y-1">
                                            <label htmlFor="client-address" className="text-xs font-bold text-gray-500 uppercase">Street, House No.</label>
                                            <input
                                                id="client-address"
                                                type="text"
                                                value={formData.address}
                                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                                className="w-full border p-3 bg-white focus:border-accent-teal outline-none transition-colors"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label htmlFor="client-postcode" className="text-xs font-bold text-gray-500 uppercase">Post Code</label>
                                            <input
                                                id="client-postcode"
                                                type="text"
                                                value={formData.post_code}
                                                onChange={e => setFormData({ ...formData, post_code: e.target.value })}
                                                className="w-full border p-3 bg-white focus:border-accent-teal outline-none transition-colors"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="pt-10 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-gray-100">
                            <p className="text-sm text-gray-500 max-w-sm text-center sm:text-left">
                                By submitting this form, you agree to have your data processed for order fulfillment.
                            </p>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full sm:w-auto px-12 py-4 bg-accent-teal text-white font-bold text-lg uppercase tracking-widest hover:bg-opacity-90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-xl hover:shadow-2xl flex items-center justify-center gap-3"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} />
                                        Updating...
                                    </>
                                ) : (
                                    <>
                                        Submit Details
                                        <Send size={20} />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ClientOnboarding;
