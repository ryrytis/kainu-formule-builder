
export interface AgentTool {
    /**
     * The name of the function to be called by the model (e.g. "calculate_price")
     */
    name: string;

    /**
     * A description of what the function does, used by the model to choose when to call it.
     */
    description: string;

    /**
     * The parameters the function accepts, described as a JSON Schema object.
     */
    parameters: Record<string, any>;

    /**
     * The actual execution logic of the tool.
     */
    execute: (args: any) => Promise<any>;
}

export interface AgentResponse {
    reply: string;
    used_tools: string[];
    confidence?: number;
    metadata?: any;
}
