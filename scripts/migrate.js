
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

// CONFIGURATION
const NEON_CONNECTION_STRING = process.env.NEON_DATABASE_URL;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // MUST use Service Role to bypass RLS

if (!NEON_CONNECTION_STRING || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing configuration: Make sure NEON_DATABASE_URL, VITE_SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY are in your .env file.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const neonPool = new Pool({
    connectionString: NEON_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false } // Required for Neon sometimes
});

async function migrateTable(tableName, idColumn = 'id') {
    console.log(`\n--- Migrating ${tableName} ---`);
    try {
        // 1. Fetch from Neon
        const { rows } = await neonPool.query(`SELECT * FROM ${tableName}`);
        console.log(`Fetched ${rows.length} rows from Neon.`);

        if (rows.length === 0) return;

        // 2. Insert into Supabase (Upsert / Ignore duplicates)
        // We use chunking to avoid request size limits
        const chunkSize = 100;
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < rows.length; i += chunkSize) {
            const chunk = rows.slice(i, i + chunkSize);

            for (const row of chunk) {
                const newRow = {};
                for (const key of Object.keys(row)) {
                    let newKey = key;
                    if (tableName === 'clients' && key === 'City') newKey = 'city';
                    newRow[newKey] = row[key];
                }

                // Fix negative stock for materials
                if (tableName === 'materials' && newRow.current_stock < 0) {
                    newRow.current_stock = 0;
                }

                // Upsert one by one to handle errors gracefully
                const { error } = await supabase
                    .from(tableName)
                    .upsert(newRow, { onConflict: idColumn, ignoreDuplicates: true });

                if (error) {
                    // If unique constraint violation on email, try to recover or just log
                    if (error.message.includes('unique constraint') || error.code === '23505') {
                        console.warn(`Skipped duplicate in ${tableName} (ID: ${newRow[idColumn]}):`, error.message);
                    } else {
                        console.error(`Failed to insert row ${newRow[idColumn]} in ${tableName}:`, error.message);
                        if (tableName === 'order_items') {
                            console.error(`  - Target Order ID: ${newRow.order_id}`);
                        }
                        errorCount++;
                    }
                } else {
                    successCount++;
                }
            }
        }
        console.log(`Finished ${tableName}: ${successCount} inserted, ${errorCount} failed.`);

    } catch (err) {
        console.error(`Failed to migrate ${tableName}:`, err);
    }
}

async function runMigration() {
    try {
        // Order matters due to Foreign Keys!

        // 1. Independent Tables
        await migrateTable('clients');
        await migrateTable('products');
        await migrateTable('materials');

        // 2. Dependent Tables
        await migrateTable('orders');

        // 3. Deeply Dependent Tables
        // Check if 'order_items' exists in source
        await migrateTable('order_items');

        console.log('\nMigration Complete! 🚀');
    } catch (err) {
        console.error('Fatal Migration Error:', err);
    } finally {
        await neonPool.end();
    }
}

runMigration();
