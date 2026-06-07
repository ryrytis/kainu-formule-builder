
import { AgentTool } from '../types.js';
import { PricingService } from '../../PricingService.js';
import { PricingRequest } from '../../PricingService.js';

export const PriceCalculatorTool: AgentTool = {
    name: "calculate_price",
    description: "Calculates the price for a printing product (business cards, stickers, etc.). IMPORTANT: If the user asks for a price but doesn't provide exact quantity or details, you MUST still call this tool proactively with standard example quantities (e.g., 100 and 500) and standard options to provide baseline pricing. DO NOT ask clarifying questions without giving an example price first.",
    parameters: {
        type: "object",
        properties: {
            product_id: { type: "string", description: "The ID of the product (e.g., 'vizitines-korteles', 'lipdukai', 'dovanu-kuponai'). You MUST infer this from the user's request even if they don't specify it exactly." },
            quantity: { type: "number", description: "Number of units. If unknown, guess a standard amount like 100." },
            width: { type: "number", description: "Width in mm (for custom sizes)." },
            height: { type: "number", description: "Height in mm (for custom sizes)." },
            lamination: { type: "string", enum: ["None", "Matt", "Gloss", "SoftTouch"] },
            pages: { type: "number", description: "Number of pages (for calendars/booklets)." }
        },
        required: ["product_id", "quantity"]
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
            client_price_list_id: args.client_price_list_id,
            client_discount_koef: args.client_discount_koef
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
