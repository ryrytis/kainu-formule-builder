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

    if (!endpoint) {
        return response.status(400).json({ error: 'Missing endpoint parameter' });
    }

    const SASK_BASE = 'https://app.invoice123.com/api/v1.0';
    const url = `${SASK_BASE}/${endpoint}`;

    try {
        const bodyData = typeof request.body === 'string' ? request.body : JSON.stringify(request.body);

        const saskaitaResponse = await fetch(url, {
            method: request.method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json, application/pdf',
                'Authorization': request.headers.authorization || request.headers.Authorization || '',
                'User-Agent': 'KainuCRM/1.0'
            },
            body: request.method === 'GET' || request.method === 'HEAD' ? undefined : bodyData,
        });

        const contentType = saskaitaResponse.headers.get('content-type');

        if (contentType && contentType.includes('application/json')) {
            const data = await saskaitaResponse.json();
            return response.status(saskaitaResponse.status).json(data);
        } else {
            // Handle binary data (PDFs, etc)
            const buffer = await saskaitaResponse.arrayBuffer();
            response.setHeader('Content-Type', contentType || 'application/octet-stream');
            return response.status(saskaitaResponse.status).send(Buffer.from(buffer));
        }

    } catch (error) {
        console.error('Proxy Error:', error);
        return response.status(500).json({ error: 'Failed to proxy request', details: error.message });
    }
}
