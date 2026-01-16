import React, { useState, useEffect } from 'react';
import { Save, Key, ShieldCheck, AlertCircle, Truck, RefreshCw } from 'lucide-react';

import { supabase } from '../lib/supabase';

const Settings: React.FC = () => {
    const [apiKey, setApiKey] = useState('');
    const [webhookUrl, setWebhookUrl] = useState('');
    const [settings, setSettings] = useState({
        series_id: '',
        server_id: '',
        bank_id: '',
        unit_id: '',
        vat_id: '',
        webhook_client_form: '',
        webhook_invoice: '',
        webhook_sharepoint: '',
        enable_client_form: true,
        enable_invoice: true,
        enable_sharepoint: true,
        internal_api_key: ''
    });
    const [showKey, setShowKey] = useState(false);
    const [showInternalKey, setShowInternalKey] = useState(false);
    const [saved, setSaved] = useState(false);

    const [venipakSettings, setVenipakSettings] = useState({
        api_id: '',
        username: '',
        password: '',
        label_webhook: ''
    });

    useEffect(() => {
        const storedKey = localStorage.getItem('saskaita_api_key');
        const storedWebhook = localStorage.getItem('sharepoint_webhook_url');

        if (storedKey) setApiKey(storedKey);
        if (storedWebhook) setWebhookUrl(storedWebhook);

        // Fetch settings from DB
        const fetchSettings = async () => {
            try {
                // Saskaita
                const { data: saskaitaData } = await (supabase
                    .from('SASKAITA123Data')
                    .select('*')
                    .limit(1)
                    .single() as any);

                if (saskaitaData) {
                    setApiKey(saskaitaData.apiKey || '');
                    setWebhookUrl(saskaitaData.webhookUrl || ''); // Keep legacy for now
                    setSettings({
                        series_id: saskaitaData.seriesid || '',
                        server_id: saskaitaData.productid || '',
                        bank_id: saskaitaData.bankid || '',
                        unit_id: saskaitaData.unitid || '',
                        vat_id: saskaitaData.vatid || '',
                        webhook_client_form: saskaitaData.webhook_client_form || '',
                        webhook_invoice: saskaitaData.webhook_invoice || '',
                        webhook_sharepoint: saskaitaData.webhook_sharepoint || saskaitaData.webhookUrl || '',
                        enable_client_form: saskaitaData.enable_client_form !== false, // Default to true if null
                        enable_invoice: saskaitaData.enable_invoice !== false,
                        enable_sharepoint: saskaitaData.enable_sharepoint !== false,
                        internal_api_key: saskaitaData.internal_api_key || ''
                    });
                }

                // Venipak
                const { data: venipakData } = await (supabase
                    .from('venipak_settings')
                    .select('*')
                    .limit(1)
                    .maybeSingle() as any);

                if (venipakData) {
                    setVenipakSettings({
                        api_id: venipakData.api_id || '',
                        username: venipakData.username || '',
                        password: venipakData.password || '',
                        label_webhook: venipakData.label_webhook || ''
                    });
                }

            } catch (error) {
                console.log('No existing settings found or error fetching.');
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        // Keep API Key local for now as per previous pattern
        localStorage.setItem('saskaita_api_key', apiKey);
        localStorage.setItem('sharepoint_webhook_url', webhookUrl);

        try {
            // --- Save Saskaita ---
            // Check if row exists
            // @ts-ignore
            const { data: existing } = await (supabase.from('SASKAITA123Data').select('id').limit(1).maybeSingle() as any);

            const payload = {
                apiKey: apiKey,
                webhookUrl: webhookUrl, // Legacy
                seriesid: settings.series_id,
                productid: settings.server_id,
                bankid: settings.bank_id,
                unitid: settings.unit_id,
                vatid: settings.vat_id,
                webhook_client_form: settings.webhook_client_form,
                webhook_invoice: settings.webhook_invoice,
                webhook_sharepoint: settings.webhook_sharepoint,
                enable_client_form: settings.enable_client_form,
                enable_invoice: settings.enable_invoice,
                enable_sharepoint: settings.enable_sharepoint,
                internal_api_key: settings.internal_api_key
            };

            let error;
            if (existing) {
                const { error: updateError } = await (supabase
                    .from('SASKAITA123Data') as any)
                    .update(payload)
                    .eq('id', existing.id);
                error = updateError;
            } else {
                const { error: insertError } = await (supabase
                    .from('SASKAITA123Data') as any)
                    .insert([payload]);
                error = insertError;
            }

            if (error) throw error;

            // --- Save Venipak ---
            const { data: existingVenipak } = await (supabase.from('venipak_settings').select('id').limit(1).maybeSingle() as any);
            const venipakPayload = {
                api_id: venipakSettings.api_id,
                username: venipakSettings.username,
                password: venipakSettings.password,
                label_webhook: venipakSettings.label_webhook,
                updated_at: new Date()
            };

            if (existingVenipak) {
                await (supabase.from('venipak_settings') as any).update(venipakPayload).eq('id', existingVenipak.id);
            } else {
                await (supabase.from('venipak_settings') as any).insert([venipakPayload]);
            }

            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (err) {
            console.error('Error saving settings:', err);
            alert('Failed to save settings to database.');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div>
                <h1 className="text-2xl font-bold text-primary">Settings</h1>
                <p className="text-gray-500">Manage application configuration and integrations.</p>
            </div>

            <div className="card max-w-2xl">
                <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                        <Key size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Saskaita123 Integration</h3>
                        <p className="text-sm text-gray-500">Configure your API Access for invoice generation.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Saskaita123 Section */}
                    <div>
                        <label className="label">Saskaita123 API Key</label>
                        <div className="flex gap-2">
                            <input
                                type={showKey ? "text" : "password"}
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                className="input flex-1"
                                placeholder="Enter your Saskaita123 API Key"
                            />
                            <button
                                onClick={() => setShowKey(!showKey)}
                                className="px-3 py-2 text-gray-500 hover:text-gray-700 bg-gray-50 rounded-md border border-gray-200"
                            >
                                {showKey ? "Hide" : "Show"}
                            </button>
                        </div>
                    </div>

                    {/* CRM Internal API Key Section */}
                    <div className="pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                            <ShieldCheck size={18} className="text-accent-teal" />
                            <h3 className="text-sm font-bold text-gray-900 uppercase">CRM Internal API Key</h3>
                        </div>
                        <p className="text-xs text-gray-400 mb-3">
                            Use this key in the <code>X-API-Key</code> header for external API calls (AI agents, Power Automate).
                        </p>
                        <div className="flex gap-2">
                            <input
                                type={showInternalKey ? "text" : "password"}
                                value={settings.internal_api_key}
                                readOnly
                                className="input flex-1 bg-gray-50 font-mono text-sm"
                                placeholder="Generated key will appear here"
                            />
                            <button
                                onClick={() => setShowInternalKey(!showInternalKey)}
                                className="px-3 py-2 text-gray-500 hover:text-gray-700 bg-gray-50 rounded-md border border-gray-200"
                            >
                                {showInternalKey ? "Hide" : "Show"}
                            </button>
                            <button
                                onClick={() => {
                                    const randomKey = Array.from(crypto.getRandomValues(new Uint8Array(24)))
                                        .map(b => b.toString(16).padStart(2, '0'))
                                        .join('');
                                    setSettings({ ...settings, internal_api_key: `crm_${randomKey}` });
                                }}
                                className="px-3 py-2 text-accent-teal hover:bg-teal-50 bg-white rounded-md border border-accent-teal text-sm font-medium"
                            >
                                Generate New
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="label">Series ID</label>
                            <input
                                type="text"
                                value={settings.series_id}
                                onChange={(e) => setSettings({ ...settings, series_id: e.target.value })}
                                className="input w-full"
                                placeholder="e.g., SF"
                            />
                        </div>
                        <div>
                            <label className="label">Bank ID</label>
                            <input
                                type="text"
                                value={settings.bank_id}
                                onChange={(e) => setSettings({ ...settings, bank_id: e.target.value })}
                                className="input w-full"
                                placeholder="Bank ID from Saskaita123"
                            />
                        </div>
                        <div>
                            <label className="label">Product ID (Service)</label>
                            <input
                                type="text"
                                value={settings.server_id}
                                onChange={(e) => setSettings({ ...settings, server_id: e.target.value })}
                                className="input w-full"
                                placeholder="Default Service/Product ID"
                            />
                        </div>
                        <div>
                            <label className="label">Unit ID</label>
                            <input
                                type="text"
                                value={settings.unit_id}
                                onChange={(e) => setSettings({ ...settings, unit_id: e.target.value })}
                                className="input w-full"
                                placeholder="e.g., vnt"
                            />
                        </div>
                        <div>
                            <label className="label">VAT ID (Company)</label>
                            <input
                                type="text"
                                value={settings.vat_id}
                                onChange={(e) => setSettings({ ...settings, vat_id: e.target.value })}
                                className="input w-full"
                                placeholder="VAT ID (e.g., 21)"
                            />
                        </div>
                    </div>


                    {/* Power Automate Webhooks Section */}
                    <div className="pt-4 border-t border-gray-100">
                        <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase">Power Automate Webhooks</h3>

                        <div className="space-y-3">
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="label mb-0">Client Data Form Webhook</label>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.enable_client_form}
                                            onChange={(e) => setSettings({ ...settings, enable_client_form: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-teal"></div>
                                        <span className="ml-2 text-xs font-medium text-gray-500">{settings.enable_client_form ? 'Active' : 'Disabled'}</span>
                                    </label>
                                </div>
                                <p className="text-xs text-gray-400 mb-1">Triggers when a new client needs to submit data.</p>
                                <input
                                    type="text"
                                    value={settings.webhook_client_form}
                                    onChange={(e) => setSettings({ ...settings, webhook_client_form: e.target.value })}
                                    className={`input w-full ${!settings.enable_client_form ? 'opacity-50 grayscale pointer-events-none bg-gray-50' : ''}`}
                                    placeholder="https://prod-..."
                                    disabled={!settings.enable_client_form}
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="label mb-0">Invoice Notification Webhook</label>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.enable_invoice}
                                            onChange={(e) => setSettings({ ...settings, enable_invoice: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-teal"></div>
                                        <span className="ml-2 text-xs font-medium text-gray-500">{settings.enable_invoice ? 'Active' : 'Disabled'}</span>
                                    </label>
                                </div>
                                <p className="text-xs text-gray-400 mb-1">Triggers when an invoice is generated.</p>
                                <input
                                    type="text"
                                    value={settings.webhook_invoice}
                                    onChange={(e) => setSettings({ ...settings, webhook_invoice: e.target.value })}
                                    className={`input w-full ${!settings.enable_invoice ? 'opacity-50 grayscale pointer-events-none bg-gray-50' : ''}`}
                                    placeholder="https://prod-..."
                                    disabled={!settings.enable_invoice}
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="label mb-0">SharePoint Folder Webhook</label>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.enable_sharepoint}
                                            onChange={(e) => setSettings({ ...settings, enable_sharepoint: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-teal"></div>
                                        <span className="ml-2 text-xs font-medium text-gray-500">{settings.enable_sharepoint ? 'Active' : 'Disabled'}</span>
                                    </label>
                                </div>
                                <p className="text-xs text-gray-400 mb-1">Triggers to create folders for new orders.</p>
                                <input
                                    type="text"
                                    value={settings.webhook_sharepoint}
                                    onChange={(e) => setSettings({ ...settings, webhook_sharepoint: e.target.value })}
                                    className={`input w-full ${!settings.enable_sharepoint ? 'opacity-50 grayscale pointer-events-none bg-gray-50' : ''}`}
                                    placeholder="https://prod-..."
                                    disabled={!settings.enable_sharepoint}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-sm text-amber-800 flex gap-2">
                        <AlertCircle className="shrink-0" size={18} />
                        <p>
                            <strong>Note:</strong> Direct API calls from the browser may be blocked by CORS policies.
                            If you experience issues, you may need to use a proxy or Supabase Edge Function in production.
                        </p>
                    </div>

                    <button
                        onClick={handleSave}
                        className="btn-primary flex items-center gap-2"
                    >
                        {saved ? <ShieldCheck size={18} /> : <Save size={18} />}
                        {saved ? <ShieldCheck size={18} /> : "Save Configuration"}
                    </button>
                </div>
            </div>

            {/* Venipak Integration Section */}
            <div className="card max-w-2xl mt-6">
                <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                    <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                        <Truck size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Venipak Integration</h3>
                        <p className="text-sm text-gray-500">Configure API Access and Terminals.</p>
                    </div>
                </div>

                <div className="space-y-4 mb-6">
                    <div>
                        <label className="label">Venipak API ID</label>
                        <input
                            type="text"
                            value={venipakSettings.api_id}
                            onChange={(e) => setVenipakSettings({ ...venipakSettings, api_id: e.target.value })}
                            className="input w-full"
                            placeholder="Enter API ID"
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="label">Username</label>
                            <input
                                type="text"
                                value={venipakSettings.username}
                                onChange={(e) => setVenipakSettings({ ...venipakSettings, username: e.target.value })}
                                className="input w-full"
                                placeholder="Username"
                            />
                        </div>
                        <div>
                            <label className="label">Password</label>
                            <input
                                type="password"
                                value={venipakSettings.password}
                                onChange={(e) => setVenipakSettings({ ...venipakSettings, password: e.target.value })}
                                className="input w-full"
                                placeholder="Password"
                            />
                        </div>
                    </div>

                    <div className="mt-4">
                        <label className="label">Label Webhook URL (Power Automate)</label>
                        <input
                            type="text"
                            value={venipakSettings.label_webhook || ''}
                            onChange={(e) => setVenipakSettings({ ...venipakSettings, label_webhook: e.target.value })}
                            className="input w-full"
                            placeholder="https://prod-..."
                        />
                        <p className="text-xs text-gray-500 mt-1">Direct webhook for saving labels (bypasses default SharePoint logic).</p>
                    </div>
                    <div className="flex justify-end">
                        <button
                            onClick={handleSave} // We'll update handleSave to save this too
                            className="btn-primary flex items-center gap-2"
                        >
                            {saved ? <ShieldCheck size={18} /> : "Save Configuration"}
                        </button>
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-gray-900">Update Pickup Points</p>
                            <p className="text-sm text-gray-600">
                                Fetches the latest terminal list from Venipak.
                            </p>
                        </div>
                        <button
                            onClick={async () => {
                                if (!confirm('This will update all Venipak terminals. Continue?')) return;
                                try {
                                    const response = await fetch('/api/venipak_proxy?endpoint=get_pickup_points&country=LT');
                                    const data = await response.json();

                                    if (Array.isArray(data)) {
                                        const formatted = data.map((item: any) => ({
                                            id: item.id, // Explicitly set ID to satisfy DB constraint
                                            // id: let Supabase generate or use item.id if matching type?
                                            // Schema has 'id bigint generated by default', so we can omit it to auto-gen,
                                            // OR if we want to sync IDs, we can provide it. 
                                            // BUT 'venipak_pickup_points' ID is bigint. item.id is int.
                                            // Let's use item.id if we want updates to work by ID.
                                            // However, schema says `pastomat_id`. 
                                            // Let's map item.id to pastomat_id and name to name/pastomat_name.

                                            pastomat_id: String(item.id),
                                            name: item.name,
                                            pastomat_name: item.display_name || item.name,
                                            pastomat_city: item.city,
                                            pastomat_address: item.address,
                                            pastomat_zip: item.zip
                                        }));

                                        if (formatted.length > 0) {
                                            // Upsert in chunks of 100
                                            // We need a unique constraint to Upsert on. 
                                            // If 'pastomat_id' is not unique constraint/PK, Upsert will insert duplicates unless we specify onConflict.
                                            // The schema has `id` as PK. `pastomat_id` is just text.
                                            // We should probably delete all and insert? Or add unique constraint?
                                            // For now, let's DELETE ALL and INSERT NEW to ensure clean list.

                                            const { error: deleteError } = await (supabase as any)
                                                .from('venipak_pickup_points')
                                                .delete()
                                                .neq('id', 0); // Delete all rows

                                            if (deleteError) {
                                                console.warn('Error clearing terminals:', deleteError);
                                            }

                                            const chunkSize = 100;
                                            for (let i = 0; i < formatted.length; i += chunkSize) {
                                                const chunk = formatted.slice(i, i + chunkSize);
                                                const { error } = await (supabase as any)
                                                    .from('venipak_pickup_points')
                                                    .insert(chunk); // Use insert since we cleared table
                                                if (error) throw error;
                                            }

                                            alert(`Successfully updated ${formatted.length} terminals!`);
                                        } else {
                                            alert('No terminals found in response.');
                                        }
                                    } else {
                                        console.error('Unexpected response format:', data);
                                        alert('Unexpected response format from Venipak.');
                                    }
                                } catch (e: any) {
                                    console.error(e);
                                    alert('Error updating terminals: ' + e.message);
                                }
                            }}
                            className="btn-accent flex items-center gap-2"
                        >
                            <RefreshCw size={18} />
                            Update List
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
