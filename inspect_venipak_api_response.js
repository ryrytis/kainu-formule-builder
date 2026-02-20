
import dotenv from 'dotenv';
dotenv.config();

const PROXY = 'https://kainu-crm.vercel.app/api/venipak_proxy';

async function inspect() {
    console.log('Fetching 5 points from Venipak API...');
    try {
        const res = await fetch(`${PROXY}?endpoint=get_pickup_points&country=LT`);
        const points = await res.json();

        if (Array.isArray(points)) {
            console.log(`Received ${points.length} points.`);
            console.log('First 3 items raw structure:');
            console.log(JSON.stringify(points.slice(0, 3), null, 2));

            // Check specifically for "Ukmergės Antakalnio MAXIMA"
            const target = points.find(p => p.id === 3560 || p.id === '3560');
            if (target) {
                console.log('\nTarget Locker (ID 3560) Raw:');
                console.log(JSON.stringify(target, null, 2));
            } else {
                console.log('\nTarget Locker (ID 3560) NOT FOUND in API response.');
            }

        } else {
            console.log('Response is not an array:', points);
        }
    } catch (e) {
        console.error('Fetch error:', e);
    }
}

inspect();
