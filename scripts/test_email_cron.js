// Test script to manually trigger the local Vercel API cron endpoint
// Run with: node scripts/test_email_cron.js

require('dotenv').config({ path: '.env.local' });
const http = require('http');

async function testCron() {
    console.log('Testing Email Cron locally...');
    
    // We need to bypass the standard Vercel CRON_SECRET if we are testing locally,
    // or just pass the internal API key. Let's pass the internal API key if defined,
    // or we assume you're running this against your local `vercel dev` server (port 3000).

    const internalKey = process.env.INTERNAL_API_KEY || ''; // Usually in .env.local

    try {
        const fetch = (await import('node-fetch')).default;
        
        const response = await fetch('http://localhost:3000/api/cron/process_emails', {
            method: 'GET',
            headers: {
                'x-api-key': internalKey
            }
        });

        const data = await response.json();
        console.log('Cron Response Status:', response.status);
        console.log('Cron Response Data:', data);

    } catch (err) {
        console.error('Test script error. Ensure `vercel dev` is running on port 3000.');
        console.error(err.message);
    }
}

testCron();
