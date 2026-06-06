import { AgentTool } from '../types.js';
import { supabase } from '../../supabase.js';

export const CalculationRuleSearchTool: AgentTool = {
    name: "search_calculation_rules",
    description: "Search for active internal calculation rules (e.g. margins, print speeds, default costs).",
    parameters: {
        type: "object",
        properties: {},
        required: []
    },
    execute: async () => {
        try {
            const { data: rulesData, error } = await supabase
                .from('calculation_rules')
                .select('*')
                .eq('is_active', true)
                .order('priority', { ascending: false });

            if (error) throw error;

            if (!rulesData || rulesData.length === 0) {
                return { result: "No active calculation rules found." };
            }

            return { rules: rulesData.map(r => ({ name: r.name || r.rule_type, value: r.value, priority: r.priority })) };
        } catch (error: any) {
            return { error: "Rule search failed", details: error.message };
        }
    }
};
