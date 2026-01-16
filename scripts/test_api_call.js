import handler from '../api/create_order.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Mock request and response
const req = {
    method: 'POST',
    headers: {
        'x-api-key': 'crm_5e8c0cb0624641ae39a915539718080c6fd02854c3109b7f',
        'content-type': 'application/json'
    },
    body: {
        client: {
            email: 'test_api@example.com',
            name: 'API Test Buyer'
        },
        items: [
            {
                product_type: 'Test Product',
                quantity: 2,
                unit_price: 50.5,
                total_price: 101,
                specifications: { size: 'Large', color: 'Blue' }
            }
        ],
        status: 'New',
        notes: 'This is a test order created via local API handler simulation.'
    }
};

const res = {
    status: (code) => {
        console.log('Response Status:', code);
        return res;
    },
    json: (data) => {
        console.log('Response JSON:', JSON.stringify(data, null, 2));
        return res;
    },
    setHeader: (name, value) => {
        // console.log(`Header set: ${name}=${value}`);
        return res;
    },
    end: () => {
        console.log('Response ended.');
        return res;
    }
};

console.log('Starting Test API Call...');
async function runTest() {
    try {
        await handler(req, res);
    } catch (error) {
        console.error('Unhandled Test Error:', error);
    }
}

runTest();
