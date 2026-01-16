// Disable body parsing to handle multipart/form-data streams directly
export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(request, response) {
    // Handle CORS
    response.setHeader('Access-Control-Allow-Credentials', true);
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    response.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );

    // Handle preflight OPTIONS request
    if (request.method === 'OPTIONS') {
        response.status(200).end();
        return;
    }

    const { endpoint } = request.query;

    let targetUrl = '';
    if (endpoint === 'send') {
        targetUrl = 'https://go.venipak.lt/import/send.php';
    } else if (endpoint === 'print_label') {
        targetUrl = 'https://go.venipak.lt/ws/print_label';
    } else if (endpoint === 'get_pickup_points') {
        const { country } = request.query;
        targetUrl = `https://go.venipak.lt/ws/get_pickup_points?country=${country || 'LT'}`;
    } else {
        return response.status(400).json({ error: 'Invalid Venipak endpoint' });
    }

    try {
        let fetchOptions = {
            method: request.method,
            headers: {}
        };

        // Forward headers and body for POST
        if (request.method === 'POST') {
            // Forward critical headers
            if (request.headers['content-type']) {
                fetchOptions.headers['Content-Type'] = request.headers['content-type'];
            }
            if (request.headers['content-length']) {
                fetchOptions.headers['Content-Length'] = request.headers['content-length'];
            }

            // Forward the raw request stream as the body
            // This works because we disabled bodyParser above
            fetchOptions.body = request;

            // Note: node-fetch with a stream body might require 'duplex: half' in newer Node versions 
            // or specific fetch implementations, but standard Vercel fetch usually handles it using simple stream pass-through.
            // If explicit stream reading is needed, we'd use getRawBody, but let's try direct stream first.
            // Actually, to be safe with Vercel's Node environment, reading into buffer is often more reliable for small payloads like ours.

            const chunks = [];
            for await (const chunk of request) {
                chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
            }
            const buffer = Buffer.concat(chunks);
            fetchOptions.body = buffer;
        }

        const venipakResponse = await fetch(targetUrl, fetchOptions);

        // Handle binary response (PDF) vs text/xml
        const contentType = venipakResponse.headers.get('content-type');

        if (contentType && contentType.includes('application/pdf')) {
            response.setHeader('Content-Type', 'application/pdf');
            const arrayBuffer = await venipakResponse.arrayBuffer();
            return response.send(Buffer.from(arrayBuffer));
        } else {
            const text = await venipakResponse.text();
            response.setHeader('Content-Type', contentType || 'text/plain');
            return response.send(text);
        }

    } catch (error) {
        console.error('Venipak Proxy Error:', error);
        return response.status(500).json({ error: 'Failed to proxy Venipak request', details: error.message });
    }
}
