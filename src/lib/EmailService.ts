import { supabase } from './supabase';

interface EmailPayload {
    type: string;
    email: string;
    [key: string]: any;
}

export const EmailService = {
    /**
     * Generic helper to send data to the helper webhook.
     */
    async sendWebhook(payload: EmailPayload, webhookKey: string = 'webhookUrl', enableKey?: string) {
        try {
            // Fetch Webhook URL and Toggles from Central Config
            const { data: settings } = await (supabase as any)
                .from('SASKAITA123Data')
                .select('*')
                .limit(1)
                .maybeSingle();

            // Check if webhook is enabled
            if (enableKey && settings && settings[enableKey] === false) {
                console.log(`EmailService: Webhook ${webhookKey} is disabled via settings (enableKey: ${enableKey}). Skipping.`);
                return { success: true, disabled: true };
            }

            const url = settings?.[webhookKey];

            if (!url) {
                console.warn(`EmailService: No Webhook URL configured for key: ${webhookKey}`);
                return { success: false, error: 'Webhook not configured' };
            }

            console.log(`EmailService: Triggering webhook for ${payload.type} to ${payload.email}`);

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Webhook failed: ${response.status} ${text}`);
            }

            return { success: true };
        } catch (error: any) {
            console.error('EmailService Error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Sends a welcome email to a new client with the external form link.
     */
    async sendWelcomeEmail(clientId: string, clientName: string, clientEmail: string) {
        const onboardingUrl = `${window.location.origin}/onboarding/${clientId}`;

        return this.sendWebhook({
            type: 'new_client',
            email: clientEmail,
            name: clientName,
            source: 'kainu_crm',
            onboardingUrl: onboardingUrl,
            message: `Welcome ${clientName}! Please fill in your details here: ${onboardingUrl}`
        }, 'webhook_client_form', 'enable_client_form');
    },

    /**
     * Sends a notification about a new invoice.
     */
    async sendInvoiceEmail(clientName: string, orderNumber: string, invoiceUrl: string, trackingId: string) {
        return this.sendWebhook({
            type: 'invoice',
            email: 'rytis@keturiprint.lt', // Per admin rule
            clientName,
            orderNo: orderNumber,
            fileUrl: invoiceUrl,
            tracking: trackingId,
            message: `New Invoice ${trackingId} for ${clientName}`
        }, 'webhook_invoice', 'enable_invoice');
    }
};
