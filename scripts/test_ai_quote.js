import handler from '../api/ai_quote.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    const req = {
        method: 'POST',
        body: {
            product_name: 'Lipdukas',
            material_keywords: 'blizgus',
            quantity: 500,
            width_mm: 50,
            height_mm: 50
        }
    };

    const res = {
        setHeader: (k,v) => console.log('Header', k, v),
        status: (s) => {
            console.log('Status', s);
            return res;
        },
        json: (d) => {
            console.log('Response JSON:', d);
            return res;
        },
        end: () => console.log('End')
    };

    await handler(req, res);
}

run();
