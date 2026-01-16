import handler from '../api/sharepoint_callback.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const req = {
    method: 'POST',
    headers: {
        'x-api-key': process.env.INTERNAL_API_KEY || 'test_key',
        'content-type': 'application/json'
    },
    body: {
        order_number: 'ORD-26-1001',
        sharepoint_link: 'https://test.sharepoint.com/sites/Orders/ORD-26-1001'
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
        return res;
    },
    end: () => {
        console.log('Response ended.');
        return res;
    }
};

console.log('Testing SharePoint Callback Handler...');
async function runTest() {
    try {
        await handler(req, res);
    } catch (error) {
        console.error('Unhandled Test Error:', error);
    }
}

runTest();
