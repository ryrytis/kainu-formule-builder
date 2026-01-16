import dotenv from 'dotenv';
dotenv.config();

const PROXY = 'https://kainu-crm.vercel.app/api/venipak_proxy';

async function findGargzdai() {
    console.log('Fetching pickup points from Venipak API...');
    const res = await fetch(`${PROXY}?endpoint=get_pickup_points`);
    const data = await res.json();

    console.log(`Total points found: ${data.length}`);

    const target = data.find(p => (p.pastomat_address && p.pastomat_address.includes('Mindaugo pr. 38')) || (p.address && p.address.includes('Mindaugo pr. 38')));

    if (target) {
        console.log('--- FOUND ---');
        console.log(`id: ${target.id}`);
        console.log(`pastomat_id: ${target.pastomat_id}`);
        console.log(`name: ${target.name}`);
        console.log(`pastomat_name: ${target.pastomat_name}`);
        console.log('---');
    } else {
        console.log('No match found for "Gargždų Udrop". Listing first 5 points:');
        console.log(JSON.stringify(data.slice(0, 5), null, 2));
    }
}

findGargzdai();
