
import OpenAI from 'openai';
import { AgentTool, AgentResponse } from './types.js';
import { supabase } from '../supabase.js';

export class CoreAgent {
    private tools: AgentTool[];
    private openai: OpenAI;
    private systemPrompt: string;
    private agentType: string;

    constructor(tools: AgentTool[], systemPrompt: string, agentType: string = 'unknown') {
        this.tools = tools;
        this.systemPrompt = systemPrompt;
        this.agentType = agentType;
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }

    public async processRequest(userMessage: string, chatHistory: {role: 'user'|'assistant', content: string}[] = []): Promise<AgentResponse> {
        const toolsSchema = this.tools.map(tool => ({
            type: 'function' as const,
            function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters,
            },
        }));

        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
            { role: 'system', content: this.systemPrompt },
            ...chatHistory,
            { role: 'user', content: userMessage }
        ];

        let usedTools: string[] = [];
        let finalReply = '';

        // Step 1: Call Model to decide on tools
        const completion = await this.openai.chat.completions.create({
            model: 'gpt-4o',
            messages: messages,
            tools: toolsSchema,
            tool_choice: 'auto',
        });

        const responseMessage = completion.choices[0].message;

        // Step 2: Check if tool calls are needed
        if (responseMessage.tool_calls) {
            messages.push(responseMessage); // Add assistant's tool-call message to history

            for (const toolCall of responseMessage.tool_calls) {
                // Cast to any to handle potential type definitions mismatches in different SDK versions
                const tc = toolCall as any;
                const toolName = tc.function?.name || (tc as any).name;
                const toolArgsString = tc.function?.arguments || (tc as any).arguments;

                if (!toolName || !toolArgsString) continue;

                const toolArgs = JSON.parse(toolArgsString);

                const tool = this.tools.find(t => t.name === toolName);
                if (tool) {
                    console.log(`[Agent] Executing tool: ${toolName}`, toolArgs);
                    try {
                        const result = await tool.execute(toolArgs);
                        usedTools.push(toolName);

                        // Add tool result to history
                        messages.push({
                            role: 'tool',
                            tool_call_id: tc.id,
                            content: JSON.stringify(result)
                        });
                    } catch (error: any) {
                        console.error(`[Agent] Tool ${toolName} failed:`, error);
                        messages.push({
                            role: 'tool',
                            tool_call_id: tc.id,
                            content: JSON.stringify({ error: error.message })
                        });
                    }
                }
            }

            // Step 3: Get final response after tool execution
            const secondResponse = await this.openai.chat.completions.create({
                model: 'gpt-4o',
                messages: messages,
            });

            finalReply = secondResponse.choices[0].message.content || 'I processed your request but have no response.';
            
            // Log combined usage
            this.logUsage(
                secondResponse.model, 
                (completion.usage?.prompt_tokens || 0) + (secondResponse.usage?.prompt_tokens || 0),
                (completion.usage?.completion_tokens || 0) + (secondResponse.usage?.completion_tokens || 0)
            );
        } else {
            // No tools needed
            finalReply = responseMessage.content || 'I have no response.';
            
            this.logUsage(
                completion.model,
                completion.usage?.prompt_tokens || 0,
                completion.usage?.completion_tokens || 0
            );
        }

        return {
            reply: finalReply,
            used_tools: usedTools
        };
    }

    private async logUsage(modelName: string, promptTokens: number, completionTokens: number) {
        if (!promptTokens && !completionTokens) return;

        const pricingMap: Record<string, { prompt: number, completion: number }> = {
            'gpt-4o': { prompt: 5.0, completion: 15.0 },
            'gpt-4o-2024-05-13': { prompt: 5.0, completion: 15.0 },
            'gpt-4o-2024-08-06': { prompt: 2.5, completion: 10.0 }, // Latest GPT-4o pricing
            'gpt-4o-mini': { prompt: 0.15, completion: 0.60 },
            'gpt-4o-mini-2024-07-18': { prompt: 0.15, completion: 0.60 },
        };

        // Fallback to gpt-4o pricing if unknown
        const rates = pricingMap[modelName] || pricingMap['gpt-4o'];
        
        const promptCost = (promptTokens / 1_000_000) * rates.prompt;
        const completionCost = (completionTokens / 1_000_000) * rates.completion;
        const totalCost = promptCost + completionCost;

        try {
            await supabase.from('ai_usage_logs').insert({
                agent_type: this.agentType,
                model_name: modelName,
                prompt_tokens: promptTokens,
                completion_tokens: completionTokens,
                total_tokens: promptTokens + completionTokens,
                estimated_cost_usd: totalCost
            });
        } catch (e) {
            console.error('[Agent] Failed to log usage:', e);
        }
    }
}
