import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const PROXY = 'https://kainu-crm.vercel.app/api/venipak_proxy';

async function syncPoints() {
    console.log('Fetching fresh pickup points from Venipak API (Baltic)...');

    const countries = ['LT', 'LV', 'EE'];
    let allPoints = [];

    for (const country of countries) {
        console.log(`Fetching ${country} points...`);
        try {
            const res = await fetch(`${PROXY}?endpoint=get_pickup_points&country=${country}`);
            const points = await res.json();
            if (Array.isArray(points)) {
                allPoints = allPoints.concat(points);
                console.log(`Added ${points.length} points from ${country}.`);
            }
        } catch (e) {
            console.error(`Failed to fetch ${country} points:`, e.message);
        }
    }

    if (allPoints.length === 0) {
        console.error('No points fetched. Aborting.');
        return;
    }

    console.log(`Found ${allPoints.length} total points. Clearing old data...`);

    const { error: delError } = await supabase
        .from('venipak_pickup_points')
        .delete()
        .neq('id', 0);

    if (delError) {
        console.error('Clear Error:', delError);
        return;
    }

    console.log('Inserting fresh points...');

    const formatted = allPoints
        .filter(p => p.id)
        .map(p => ({
            id: p.id,
            pastomat_id: String(p.id),
            code: p.code || '',
            name: p.name || 'Venipak paštomatas',
            pastomat_city: p.city || '',
            pastomat_address: p.address || '',
            pastomat_name: p.name || '',
            pastomat_zip: p.zip || ''
        }));

    for (let i = 0; i < formatted.length; i += 100) {
        const chunk = formatted.slice(i, i + 100);
        const { error: insError } = await supabase
            .from('venipak_pickup_points')
            .insert(chunk);

        if (insError) {
            console.error(`Insert Error at chunk ${i}:`, insError);
        } else {
            console.log(`Synced ${Math.min(i + chunk.length, formatted.length)} / ${formatted.length}...`);
        }
    }

    console.log('✅ SYNC COMPLETE!');
}

syncPoints();
