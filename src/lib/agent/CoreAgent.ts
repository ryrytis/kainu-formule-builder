
import OpenAI from 'openai';
import { AgentTool, AgentResponse } from './types';

export class CoreAgent {
    private tools: AgentTool[];
    private openai: OpenAI;
    private systemPrompt: string;

    constructor(tools: AgentTool[], systemPrompt: string) {
        this.tools = tools;
        this.systemPrompt = systemPrompt;
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }

    public async processRequest(userMessage: string): Promise<AgentResponse> {
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
        } else {
            // No tools needed
            finalReply = responseMessage.content || 'I have no response.';
        }

        return {
            reply: finalReply,
            used_tools: usedTools
        };
    }
}
