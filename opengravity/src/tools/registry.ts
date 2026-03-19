export interface ToolDefinition {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: {
            type: 'object';
            properties: Record<string, any>;
            required?: string[];
        };
    };
}

export interface ToolImplementation {
    definition: ToolDefinition;
    execute: (args: any) => Promise<any> | any;
}

const registry = new Map<string, ToolImplementation>();

export function registerTool(tool: ToolImplementation) {
    registry.set(tool.definition.function.name, tool);
}

export function getTool(name: string): ToolImplementation | undefined {
    return registry.get(name);
}

export function getAllToolDefinitions(): ToolDefinition[] {
    return Array.from(registry.values()).map(t => t.definition);
}
