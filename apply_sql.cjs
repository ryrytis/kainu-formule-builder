const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://neondb_owner:npg_BKN5GAqEDo6L@ep-odd-breeze-aeo9i8er.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&options=project%3Dep-odd-breeze-aeo9i8er';

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
        console.log('Connected to database.');

        const filePath = path.resolve(__dirname, filename);
        const sql = fs.readFileSync(filePath, 'utf8');

        console.log(`Executing SQL from ${filename}...`);
        await client.query(sql);
        console.log('✅ Migration executed successfully.');

    } catch (err) {
        console.error('Error executing query', err);
    } finally {
        await client.end();
    }
}

run();
