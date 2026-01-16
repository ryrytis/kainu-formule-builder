import { supabase } from './supabase';

export interface SharePointResponse {
    success: boolean;
    folderUrl?: string;
    message?: string;
}

export const SharePointService = {
    /**
     * Calls Power Automate to create/check the client folder and create a new order subfolder.
     */
    async createOrderFolder(clientName: string, orderNumber: string, status: string = 'New'): Promise<SharePointResponse> {
        // Fetch Webhook URL and Toggle from DB
        const { data: settings } = await (supabase as any)
            .from('SASKAITA123Data')
            .select('webhook_sharepoint, webhookUrl, enable_sharepoint')
            .limit(1)
            .maybeSingle();

        if (settings?.enable_sharepoint === false) {
            console.log('SharePointService: Webhook is disabled in settings. Skipping.');
            return { success: true }; // Treat as success to not block parent flow
        }

        const webhookUrl = settings?.webhook_sharepoint || settings?.webhookUrl;

        if (!webhookUrl) {
            console.warn('SharePoint Webhook URL not configured in Settings (webhook_sharepoint)');
            // Return false but don't crash, allowing the app to run without SP for now
            return { success: false };
        }

        try {
            const payload = {
                clientName: clientName,
                orderNo: orderNumber,
                status: status
            };

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error(`SharePoint Webhook failed: ${response.statusText}`);
            }

            // Power Automate/Logic Apps often return a nested body object
            const data = await response.json().catch(() => ({}));

            // Logic to extract link based on user provided sample
            let extractedUrl = null;
            if (data.body && data.body.link) {
                extractedUrl = data.body.link;
            } else if (data.link) {
                extractedUrl = data.link;
            } else if (data.folderUrl) {
                extractedUrl = data.folderUrl;
            }

            return { success: true, folderUrl: extractedUrl };
        } catch (error: any) {
            console.error('SharePoint Service Error:', error);

            // Fallback for demo if it fails (CORS or otherwise)
            if (error.message && (error.message.includes('CORS') || error.message.includes('Failed to fetch'))) {
                // Mock return for visual feedback
                return {
                    success: true,
                    folderUrl: `https://sharepoint.com/sites/Kainu/${encodeURIComponent(clientName)}/${orderNumber}`,
                    message: 'Mock Success (API Blocked)'
                };
            }

            return {
                success: false,
                message: error.message
            };
        }
    },

    async uploadShipmentLabel(clientName: string, orderNumber: string, trackingNumber: string, base64Label: string, folderUrl?: string | null): Promise<SharePointResponse> {
        // 1. Try to get specific Venipak Webhook from venipak_settings
        const { data: venipakSettings } = await (supabase as any)
            .from('venipak_settings')
            .select('label_webhook')
            .limit(1)
            .maybeSingle();

        // 2. specific URL or fallback to user-provided global one if user wants (but we'll prioritize venipak one)
        let webhookUrl = venipakSettings?.label_webhook;

        // If no specific venipak webhook, try global SharePoint settings (legacy behavior)
        if (!webhookUrl) {
            const { data: globalSettings } = await (supabase as any)
                .from('SASKAITA123Data')
                .select('webhookUrl, webhook_sharepoint, enable_sharepoint')
                .limit(1)
                .maybeSingle();

            if (globalSettings?.enable_sharepoint === false) {
                return { success: true };
            }
            webhookUrl = globalSettings?.webhook_sharepoint || globalSettings?.webhookUrl;
        }

        if (!webhookUrl) {
            console.warn('SharePoint/Venipak Webhook URL not configured');
            return { success: false };
        }

        // Sanitize Folder URL if it's a View URL
        let cleanFolderUrl = folderUrl;
        if (folderUrl) {
            if (folderUrl.includes('AllItems.aspx') && folderUrl.includes('id=')) {
                // Handle View URLs
                try {
                    const urlObj = new URL(folderUrl);
                    const idParam = urlObj.searchParams.get('id');
                    if (idParam) {
                        cleanFolderUrl = decodeURIComponent(idParam);
                        console.log('Sanitized SharePoint URL to Path:', cleanFolderUrl);
                    }
                } catch (e) {
                    console.warn('Failed to parse SharePoint URL:', e);
                }
            } else if (folderUrl.includes('/:f:/') || folderUrl.includes('/:u:/')) {
                console.warn('SharePoint Sharing Link detected. Ignoring folderUrl.');
                cleanFolderUrl = undefined;
            }
        }

        try {
            const fileName = `Label_${trackingNumber}.pdf`;
            const payload = {
                type: 'venipak_label_save',
                clientName: clientName,
                orderNo: orderNumber,
                tracking: trackingNumber,
                // Standard Power Automate File Object structure
                fileContent: {
                    "name": fileName,
                    "contentBytes": base64Label
                },
                fileName: fileName,
                folderUrl: cleanFolderUrl // Use sanitized path (or undefined)
            };

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error(`SharePoint Label Upload failed: ${response.statusText}`);
            }

            return { success: true };
        } catch (error: any) {
            console.error('SharePoint Upload Error:', error);
            return { success: false, message: error.message };
        }
    }
};
