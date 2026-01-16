import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkStorage() {
    const { data, error } = await supabase.storage.listBuckets();

    if (error) {
        console.error('Error listing buckets:', error);
        return;
    }

    console.log('Buckets:');
    console.log(JSON.stringify(data, null, 2));

    const bucket = data.find(b => b.name === 'venipak_labels');
    if (bucket) {
        console.log('Bucket "venipak_labels" found! Public:', bucket.public);
    } else {
        console.log('Bucket "venipak_labels" NOT FOUND!');
    }
}

checkStorage();
