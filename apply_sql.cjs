const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config();
const connectionString = process.env.NEON_DATABASE_URL;

if (!connectionString) {
    console.error('NEON_DATABASE_URL is not set in .env');
    process.exit(1);
}

async function run() {
    const filename = process.argv[2];
    if (!filename) {
        console.error('Usage: node apply_sql.cjs <filename>');
        process.exit(1);
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        if (process.argv[2]) {
            const fs = require('fs');
            const sql = fs.readFileSync(process.argv[2], 'utf8');
            const res = await client.query(sql);
            console.log(JSON.stringify(res.rows, null, 2));
        } else {
            console.log('No SQL file provided');
        }

    } catch (err) {
        console.error('Error executing query:');
        console.error(err.message);
        console.error(err.stack);
    } finally {
        await client.end();
    }
}

run();
