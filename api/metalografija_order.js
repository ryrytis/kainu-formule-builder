/**
 * Vercel Serverless Proxy for Metalografija.lt Order Form
 * 
 * Receives order data from the CRM frontend and submits it
 * to the metalografija.lt order form, bypassing CORS.
 * 
 * Approach:
 * 1. GET the order page to extract hidden fields, CSRF tokens, and form action URL
 * 2. POST the form data (multipart/form-data) to the extracted action URL
 */

export default async function handler(req, res) {
    // CORS headers for local dev
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const formData = req.body;

        if (!formData) {
            return res.status(400).json({ error: 'Missing form data' });
        }

        // --- Step 1: Fetch the order page to extract form details ---
        const pageResponse = await fetch('https://metalografija.lt/lt/uzsakymas-28', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'lt,en;q=0.9'
            }
        });

        const pageHtml = await pageResponse.text();

        // Extract form action URL
        const actionMatch = pageHtml.match(/<form[^>]*action=["']([^"']*)["'][^>]*>/i);
        const formAction = actionMatch ? actionMatch[1] : null;

        // Extract all hidden fields
        const hiddenFields = {};
        const hiddenRegex = /<input[^>]*type=["']hidden["'][^>]*>/gi;
        let match;
        while ((match = hiddenRegex.exec(pageHtml)) !== null) {
            const nameMatch = match[0].match(/name=["']([^"']*)["']/);
            const valueMatch = match[0].match(/value=["']([^"']*)["']/);
            if (nameMatch) {
                hiddenFields[nameMatch[1]] = valueMatch ? valueMatch[1] : '';
            }
        }

        // Extract cookies from the page response for session continuity
        const cookies = pageResponse.headers.get('set-cookie') || '';

        // --- Step 2: Build and submit the form ---
        // Determine the submission URL
        let submitUrl;
        if (formAction) {
            if (formAction.startsWith('http')) {
                submitUrl = formAction;
            } else if (formAction.startsWith('/')) {
                submitUrl = `https://metalografija.lt${formAction}`;
            } else {
                submitUrl = `https://metalografija.lt/lt/${formAction}`;
            }
        } else {
            // Default: same page (common for CMS forms)
            submitUrl = 'https://metalografija.lt/lt/uzsakymas-28';
        }

        // Build multipart form data using URLSearchParams for simplicity
        // (file upload handled separately if present)
        const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);
        let body = '';

        // Add hidden fields first
        for (const [key, value] of Object.entries(hiddenFields)) {
            body += `--${boundary}\r\n`;
            body += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
            body += `${value}\r\n`;
        }

        // Add user-provided form fields
        const fieldMapping = {
            customerName: 'customer_name',
            contactEmail: 'contact_email',
            projectName: 'project_name',
            dieTechnology: 'die_technology',
            dieType: 'die_type',
            klisesTipas: 'klises_tipas',
            dieQty: 'die_qty',
            counterDieQty: 'counter_die_qty',
            reliefProfile: 'relief_profile',
            stampingTemperature: 'stamping_temperature',
            otherTemperature: 'other_temperature',
            typeOfStock: 'type_of_stock',
            substrateName: 'substrate_name',
            stockGrammage: 'stock_grammage',
            stockThickness: 'stock_thickness',
            deliveryMethod: 'delivery_method',
            deliveryAddress: 'delivery_address',
            preferredDispatchDate: 'preferred_dispatch_date',
            notes: 'notes'
        };

        // We'll send both our field names and the potentially mapped names
        // The actual field names from the form may differ - this proxy sends
        // the data as-is and lets the form handler on metalografija.lt process it
        for (const [key, value] of Object.entries(formData)) {
            if (key === 'files') continue; // Handle files separately
            body += `--${boundary}\r\n`;
            body += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
            body += `${value}\r\n`;
        }

        // Handle file upload if present (base64 encoded from frontend)
        if (formData.files && Array.isArray(formData.files)) {
            for (const file of formData.files) {
                const fileBuffer = Buffer.from(file.data, 'base64');
                body += `--${boundary}\r\n`;
                body += `Content-Disposition: form-data; name="file"; filename="${file.name}"\r\n`;
                body += `Content-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`;
                // For binary files, we need to use Buffer
                // We'll switch to using a Buffer-based approach
            }
        }

        body += `--${boundary}--\r\n`;

        // Build the actual body as a Buffer for proper binary handling
        const parts = [];

        // Hidden fields
        for (const [key, value] of Object.entries(hiddenFields)) {
            parts.push(Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`
            ));
        }

        // User fields
        for (const [key, value] of Object.entries(formData)) {
            if (key === 'files') continue;
            parts.push(Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`
            ));
        }

        // Files
        if (formData.files && Array.isArray(formData.files)) {
            for (const file of formData.files) {
                const header = Buffer.from(
                    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${file.name}"\r\nContent-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`
                );
                const fileData = Buffer.from(file.data, 'base64');
                const footer = Buffer.from('\r\n');
                parts.push(header, fileData, footer);
            }
        }

        parts.push(Buffer.from(`--${boundary}--\r\n`));
        const bodyBuffer = Buffer.concat(parts);

        // Submit the form
        const submitResponse = await fetch(submitUrl, {
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://metalografija.lt/lt/uzsakymas-28',
                'Origin': 'https://metalografija.lt',
                'Cookie': cookies
            },
            body: bodyBuffer
        });

        const responseText = await submitResponse.text();
        const success = submitResponse.ok;

        // Try to detect success from response content
        const hasThankYou = /ačiū|thank|dėkojame|sėkmingai|success/i.test(responseText);

        res.status(200).json({
            success: success || hasThankYou,
            statusCode: submitResponse.status,
            submitUrl,
            hiddenFieldsFound: Object.keys(hiddenFields).length,
            formActionDetected: formAction || 'none (using page URL)',
            message: (success || hasThankYou)
                ? 'Order submitted successfully to metalografija.lt'
                : 'Form was submitted but success could not be confirmed. Check the response.',
            // Include a snippet of response for debugging (first 500 chars)
            responseSnippet: responseText.substring(0, 500)
        });

    } catch (error) {
        console.error('Metalografija proxy error:', error);
        res.status(500).json({
            error: error.message,
            details: 'Failed to submit order to metalografija.lt'
        });
    }
}
