import dotenv from 'dotenv';
dotenv.config();
import { PricingService } from './src/lib/PricingService.js';

async function test() {
    try {
        console.log("Testing 100 SoftTouch");
        const res = await PricingService.calculatePrice({
            product_id: 'vizitines-korteles',
            quantity: 100,
            lamination: 'SoftTouch'
        });
        console.log("Result:", JSON.stringify(res, null, 2));
    } catch (e) {
        console.error("Error 1:", e.message);
    }

    try {
        console.log("\nTesting 500 SoftTouch");
        const res2 = await PricingService.calculatePrice({
            product_id: 'vizitines-korteles',
            quantity: 500,
            lamination: 'SoftTouch'
        });
        console.log("Result 2:", JSON.stringify(res2, null, 2));
    } catch (e) {
        console.error("Error 2:", e.message);
    }
}
test();
