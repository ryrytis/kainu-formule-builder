
import { AgentTool } from '../types';
import { PricingService } from '../../PricingService';
import { PricingRequest } from '../../PricingService';

export const PriceCalculatorTool: AgentTool = {
    name: "calculate_price",
    description: "Calculates the price for a printing product (business cards, stickers, etc.) based on quantity and specifications. ONLY call this if you have the Product ID or clear specifications.",
    parameters: {
        type: "object",
        properties: {
            product_id: { type: "string", description: "The ID of the product (e.g., 'vizitines-korteles', 'lipdukai'). If unknown, try to infer from product name." },
            quantity: { type: "number", description: "Number of units." },
            width: { type: "number", description: "Width in mm (for custom sizes)." },
            height: { type: "number", description: "Height in mm (for custom sizes)." },
            lamination: { type: "string", enum: ["None", "Matt", "Gloss", "SoftTouch"] },
            pages: { type: "number", description: "Number of pages (for calendars/booklets)." }
        },
        required: ["quantity"]
    },
    execute: async (args: any) => {
        // Map args to PricingRequest
        const request: PricingRequest = {
            product_id: args.product_id,
            quantity: args.quantity,
            width: args.width,
            height: args.height,
            lamination: args.lamination,
            pages: args.pages,
            // Defaults or logic to map missing fields could go here
        };

        try {
            const result = await PricingService.calculatePrice(request);
            return {
                unit_price: result.unit_price,
                total_price: result.total_price,
                breakdown: result.breakdown,
                applied_rules: result.applied_rules
            };
        } catch (error: any) {
            return { error: "Calculation failed", details: error.message };
        }
    }
};
