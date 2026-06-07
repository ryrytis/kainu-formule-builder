import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function createTable() {
    const connectionString = process.env.NEON_DATABASE_URL;

    if (!connectionString) {
        console.error("No NEON_DATABASE_URL found in env. Cannot create table.");
        return;
    }

    console.log("Connecting to DB...");
    const client = new Client({
        connectionString: connectionString,
    });

    try {
        await client.connect();

        console.log("Creating Table...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS ai_usage_logs (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                created_at TIMESTAMPTZ DEFAULT now(),
                agent_type TEXT NOT NULL,
                model_name TEXT NOT NULL,
                prompt_tokens INTEGER NOT NULL,
                completion_tokens INTEGER NOT NULL,
                total_tokens INTEGER NOT NULL,
                estimated_cost_usd NUMERIC NOT NULL
            );
        `);

        console.log("Table 'ai_usage_logs' created!");
    } catch (e) {
        console.error("SQL Error:", e);
    } finally {
        await client.end();
    }
}

createTable();
