
// api/test_shared_import.ts (or .js)
// Try to import the Pricing Service. 
// Note: In Vercel serverless functions, importing from 'src' often fails if not bundled.
import { pricingService } from '../src/lib/PricingService'; // Hypothetical path

export default function handler(req, res) {
    try {
        console.log("PricingService loaded:", !!pricingService);
        res.status(200).json({ success: true, message: "Import worked" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}
