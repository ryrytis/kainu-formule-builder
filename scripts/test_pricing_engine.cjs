const { PricingService } = require('../src/lib/PricingService');
require('dotenv').config();

async function testCalc() {
    console.log('Testing Calculation Engine...');
    try {
        const result = await PricingService.calculatePrice({
            product_id: '3194b344-0158-4034-8798-3561937f374e', // Ruloniniai Lipdukai
            quantity: 1000,
            width: 50,
            height: 50,
            material_id: '1bb97ec7-3dfc-446a-bb05-d9c2a1a209df'
        });
        console.log('SUCCESS:', result.total_price);
    } catch (e) {
        console.error('CRASH DETECTED:', e);
    }
}

testCalc();
