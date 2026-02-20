
import { supabase } from './supabase';

const VENIPAK_PROXY = '/api/venipak_proxy';

interface ShipmentData {
    order_number: string;
    client_name: string;
    client_address: string;
    client_phone: string;
    client_city?: string;
    client_post_code?: string;
    terminal_id?: string | null;
}

export const VenipakService = {
    async getNextSequence(type: 'global' | 'label', _name: string = 'default'): Promise<number> {
        try {
            if (type === 'global') {
                // Try to get the *first* row, whatever the ID is
                const { data: current } = await (supabase as any)
                    .from('venipak_global_sequence')
                    .select('id, current_sequence')
                    .limit(1)
                    .maybeSingle();

                let nextVal = 1;

                if (current) {
                    let currentVal = current.current_sequence || 0;
                    // Auto-fix: If sequence is too low (e.g. started at 1) or below Replit's last known (9502313), jump to valid
                    const REPLIT_LAST_SEQ = 9900000; // Bumped to 9.9M range to ensure uniqueness
                    if (currentVal < REPLIT_LAST_SEQ) {
                        currentVal = REPLIT_LAST_SEQ;
                    }
                    nextVal = currentVal + 1;

                    await (supabase as any)
                        .from('venipak_global_sequence')
                        .update({ current_sequence: nextVal, updated_at: new Date() })
                        .eq('id', current.id);
                } else {
                    // No row exists, insert one
                    const initialSequence = 9900000;
                    const { data: inserted } = await (supabase as any)
                        .from('venipak_global_sequence')
                        .insert([{ id: 1, current_sequence: initialSequence }])
                        .select('current_sequence')
                        .single();
                    if (inserted) nextVal = inserted.current_sequence;
                }

                return nextVal;
            } else {
                // Label sequence (Note: Table is venipak_label_sequences) 
                // schema.sql for label sequence: sequence_number, label_date. 
                // Wait, schema says `sequence_number` for labels, and `current_sequence` for global.
                // Let's check schema for labels again. 
                // "label_date date not null, sequence_number integer not null"
                // So for labels it is `sequence_number`.

                // Let's refactor label logic too.
                const today = new Date().toISOString().split('T')[0];
                const { data: current } = await (supabase as any)
                    .from('venipak_label_sequences')
                    .select('sequence_number')
                    .eq('label_date', today)
                    .limit(1)
                    .maybeSingle();

                let nextVal = 1;
                if (current) {
                    nextVal = (current.sequence_number || 0) + 1;
                    await (supabase as any)
                        .from('venipak_label_sequences')
                        .update({ sequence_number: nextVal }) // Assuming ID match or separate logic? 
                        // Actually label_sequences usually is per day. One row per day?
                        // Schema: id, label_date, sequence_number.
                        // We should UPDATE where label_date = today.
                        .eq('label_date', today);
                } else {
                    await (supabase as any)
                        .from('venipak_label_sequences')
                        .insert([{ label_date: today, sequence_number: 1 }]);
                }
                return nextVal;
            }

        } catch (e) {
            console.error('Sequence error:', e);
            return Date.now(); // Fallback
        }
    },

    getCleanTerminalName(fullName: string): string {
        if (!fullName) return 'Venipak paštomatas';
        const parts = fullName.split(',');
        if (parts.length < 2) return fullName;

        const prefix = parts[0].trim();
        const content = parts.slice(1).join(',').trim();

        let cleanName = content
            .replace(/ \d{5,}.*$/, '')
            .replace(/ [A-Z].* g\..*$/g, '')
            .replace(/ [a-z0-9]+\.[a-z0-9]+.*$/gi, '')
            .replace(/ Venipak paštomatas.*$/gi, '')
            .replace(/ paštomatas.*$/gi, '')
            .replace(/ atsiėmimo punktas.*$/gi, '')
            .trim();

        return `${prefix}, ${cleanName}`;
    },

    async createShipment(data: ShipmentData) {
        // ... (existing code)
        // 1. Get credentials
        const { data: settings, error } = await (supabase as any)
            .from('venipak_settings')
            .select('*')
            .limit(1)
            .maybeSingle();

        if (error || !settings) {
            return { success: false, error: 'Venipak settings not configured.' };
        }

        const { api_id, username, password } = settings;
        const cleanApiId = api_id.trim();
        const cleanUser = username.trim();
        const cleanPass = password.trim();

        // Handle Terminal Logic
        let terminal: any = null;
        console.log('VenipakService: terminal_id provided:', data.terminal_id);

        if (data.terminal_id) {
            console.log(`VenipakService: Looking for terminal: "${data.terminal_id}" (Length: ${data.terminal_id.length})`);

            // 1. Try exact match on 'name' (This is what we save in the DB)
            let { data: terms, error: termError } = await (supabase as any)
                .from('venipak_pickup_points')
                .select('*')
                .eq('name', data.terminal_id)
                .limit(1)
                .maybeSingle();

            // 2. Fallback: Search by City and try fuzzy match
            if (!terms && data.client_city) {
                console.log(`VenipakService: Not found by exact match. Searching terminals in city: "${data.client_city}"...`);
                // Note: Schema uses 'pastomat_city', not 'city'
                const { data: cityTerms, error: cityError } = await (supabase as any)
                    .from('venipak_pickup_points')
                    .select('*')
                    .ilike('pastomat_city', `%${data.client_city}%`)
                    .limit(50);

                if (cityError) {
                    console.error('VenipakService: City lookup error:', cityError);
                }

                if (cityTerms && cityTerms.length > 0) {
                    const candidateNames = cityTerms.map((t: any) => t.name).join(', ');
                    console.log(`VenipakService: Found ${cityTerms.length} candidates in city: ${candidateNames}`);

                    // Scoring function: Count how many words from user string appear in the DB record
                    const getScore = (target: string, candidate: any) => {
                        const normalize = (s: string) => s.toLowerCase().replace(/[^\w\s\u00C0-\u024F]/g, '').replace(/\s+/g, ' ').trim();
                        const targetTokens = normalize(target).split(' ').filter(w => w.length > 2); // Ignore short words

                        // Check against Name, Address, and ID
                        const candidateText = normalize(`${candidate.name} ${candidate.pastomat_address} ${candidate.pastomat_id}`);

                        let matches = 0;
                        targetTokens.forEach(token => {
                            if (candidateText.includes(token)) matches++;
                        });

                        return matches;
                    };

                    let bestMatch: any = null;
                    let maxScore = 0;

                    cityTerms.forEach((term: any) => {
                        const score = getScore(data.terminal_id || '', term);
                        console.log(`VenipakService: Scored "${term.name}": ${score}`);
                        if (score > maxScore) {
                            maxScore = score;
                            bestMatch = term;
                        }
                    });

                    if (bestMatch && maxScore > 0) {
                        console.log(`VenipakService: Fuzzy Match Winner (Score: ${maxScore}):`, bestMatch);
                        terms = bestMatch;
                    } else {
                        console.log('VenipakService: No sufficient fuzzy match found.');
                    }
                } else {
                    console.log('VenipakService: No terminals found in city either.');
                }
            }

            if (termError) console.error('VenipakService: Terminal lookup error:', termError);

            if (terms) {
                console.log('VenipakService: Terminal found:', terms);
                terminal = terms;
            } else {
                console.warn('VenipakService: No terminal found for ID:', data.terminal_id);
            }
        } else {
            console.log('VenipakService: No terminal_id provided, defaulting to Courier.');
        }

        // Prepare Consignee Data
        const consigneeCheck = terminal ? {
            name: terminal.name || '',
            company_code: terminal.pastomat_id,
            country: 'LT',
            city: terminal.pastomat_city,
            address: terminal.pastomat_address,
            post_code: (terminal.pastomat_zip || '').replace(/\D/g, ''),
            delivery_type: 'vp',
            delivery_mode: '3'
        } : {
            name: data.client_name,
            company_code: '0',
            country: 'LT',
            city: data.client_city || 'Kaunas',
            address: data.client_address,
            post_code: data.client_post_code || '00000',
            delivery_type: 'nwd',
            delivery_mode: '0'
        };

        // Get next Manifest ID (Daily Sequence)
        const dailySeq = await this.getNextSequence('label');
        // Get next Global ID (Pack Sequence)
        const globalSeq = await this.getNextSequence('global');

        // Formats
        const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD
        const paddedDaily = String(dailySeq).padStart(3, '0');
        const manifestTitle = `${cleanApiId}${dateStr}${paddedDaily}`;

        const paddedGlobal = String(globalSeq);
        const packNumber = `V${cleanApiId}E${paddedGlobal}`;

        // 2. Build XML Payload
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<description type="4">
    <manifest title="${manifestTitle}">
        <shipment>
            <consignee>
                <name>${consigneeCheck.name}</name>
                <company_code>${consigneeCheck.company_code}</company_code> 
                <country>${consigneeCheck.country}</country>
                <city>${consigneeCheck.city}</city>
                <address>${consigneeCheck.address}</address>
                <post_code>${consigneeCheck.post_code}</post_code>
                <contact_person>${data.client_name}</contact_person>
                <contact_tel>${(data.client_phone || '').replace(/\D/g, '')}</contact_tel>
                <contact_email>info@keturiprint.lt</contact_email>
            </consignee>
            <sender>
                <name>Keturi print, MB</name>
                <company_code>0</company_code>
                <country>LT</country>
                <city>Ramučiai</city>
                <address>Pakalnės 8-2</address>
                <post_code>54464</post_code>
                <contact_person>Agnietė Suknelevičienė</contact_person>
                <contact_tel>+37069663915</contact_tel>
                <contact_email>agniete@keturiprint.lt</contact_email>
            </sender>
            <attribute>
                <delivery_type>${consigneeCheck.delivery_type}</delivery_type>
                <delivery_mode>${consigneeCheck.delivery_mode}</delivery_mode>
                <comment_text>Ačiū, kad esate su mumis</comment_text>
            </attribute>
            <pack>
                <pack_no>${packNumber}</pack_no>
                <description></description>
                <weight>0.1</weight>
                <volume>0.01</volume>
            </pack>
        </shipment>
    </manifest>
</description>`;

        // 3. Send Request
        // Note: This requires CORS proxy if run in browser, or use Vercel API.
        // For MVP, if CORS fails, we advise user. But Venipak might support CORS.
        // If not, we might need a Next.js API route (not available in pure Vite without Vercel Functions).
        // Let's try direct fetch first, assuming 'no-cors' will return opaque response?
        // No, 'no-cors' won't work for getting data back.
        // We will assume Venipak allows it or we will hit an issue.

        try {
            console.log('Sending Venipak XML:', xml); // Debugging

            const params = new URLSearchParams();
            params.append('user', cleanUser);
            params.append('pass', cleanPass);
            params.append('xml_text', xml);

            const response = await fetch(`${VENIPAK_PROXY}?endpoint=send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params
            });

            const text = await response.text();
            console.log('Venipak API Response:', text); // Debugging

            // Handle success based on <status>1</status> OR <answer type="ok">
            const isSuccess = text.includes('<status>1</status>') || text.includes('type="ok"');

            if (isSuccess) {
                // Tracking number can be in <pack_no>, <shipment_no>, or <text> (for type="ok")
                const packMatch = text.match(/<pack_no>(.*?)<\/pack_no>/);
                const shipMatch = text.match(/<shipment_no>(.*?)<\/shipment_no>/);
                const textMatch = text.match(/<text>(.*?)<\/text>/);

                const tracking = packMatch?.[1] || shipMatch?.[1] || textMatch?.[1] || 'Unknown';

                return { success: true, tracking_number: tracking, raw: text };
            } else {
                return { success: false, error: 'API Error: ' + text };
            }

        } catch (e: any) {
            console.error(e);
            return { success: false, error: e.message };
        }

    },

    async getLabel(trackingNumber: string) {
        // 1. Get credentials
        const { data: settings, error } = await (supabase as any)
            .from('venipak_settings')
            .select('*')
            .limit(1)
            .maybeSingle();

        if (error || !settings) {
            return { success: false, error: 'Venipak settings not configured.' };
        }

        const { username, password } = settings;
        const cleanUser = username.trim();
        const cleanPass = password.trim();

        try {
            const formData = new FormData();
            formData.append('user', cleanUser);
            formData.append('pass', cleanPass);
            formData.append('pack_no[]', trackingNumber);
            formData.append('format', 'other');
            formData.append('carrier', 'venipak');
            formData.append('printReturns', '1');

            const response = await fetch(`${VENIPAK_PROXY}?endpoint=print_label`, {
                method: 'POST',
                // Content-Type header is NOT set here so the browser sets it with the correct boundary for multipart/form-data
                body: formData
            });

            if (!response.ok) {
                return { success: false, error: 'Failed to fetch label' };
            }

            // Check content type
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/pdf')) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                return { success: true, url: url, blob: blob };
            } else {
                const text = await response.text();
                return { success: false, error: 'API Error: ' + text };
            }

        } catch (e: any) {
            console.error(e);
            return { success: false, error: e.message };
        }
    },
    async blobToBase64(blob: Blob): Promise<string> {
        try {
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve, reject) => {
                reader.onloadend = () => {
                    const base64String = reader.result as string;
                    if (!base64String) {
                        return reject(new Error('Failed to read Blob as DataURL'));
                    }
                    const parts = base64String.split(',');
                    if (parts.length < 2) {
                        return reject(new Error('Invalid Base64 format from FileReader'));
                    }
                    resolve(parts[1]);
                };
                reader.onerror = () => reject(reader.error);
            });
            reader.readAsDataURL(blob);
            return await base64Promise;
        } catch (e) {
            console.error('blobToBase64 error:', e);
            throw e;
        }
    },
    async sendLabelToEmail(tracking: string, blob: Blob, clientName: string, orderNumber: string) {
        try {
            // 1. Convert Blob to Base64
            const base64Data = await this.blobToBase64(blob);

            // 2. Trigger Webhook
            const { data: settings } = await (supabase as any)
                .from('SASKAITA123Data')
                .select('webhookUrl')
                .limit(1)
                .single();

            if (settings?.webhookUrl) {
                console.log('Triggering Email Webhook...', settings.webhookUrl);
                // Using the email to rytis as requested
                const payload = {
                    type: 'venipak_label',
                    email: 'rytis@keturiprint.lt',
                    tracking: tracking,
                    fileContent: base64Data, // Sending raw base64 content
                    fileName: `${tracking}.pdf`,
                    clientName: clientName,
                    orderNo: orderNumber,
                    message: `New Venipak Label for ${tracking}`
                };

                const response = await fetch(settings.webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Webhook failed response:', errorText);
                    throw new Error(`Webhook failed: ${response.status} - ${errorText}`);
                }

                console.log('Email Webhook triggered successfully!');
                return { success: true };
            } else {
                console.error('No Webhook URL configured in SASKAITA123Data table');
                return { success: false, error: 'No Webhook URL configured' };
            }

        } catch (e: any) {
            console.error('Email error:', e);
            return { success: false, error: e.message };
        }
    }
};
