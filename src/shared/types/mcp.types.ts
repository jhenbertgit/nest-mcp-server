export type ToolName = string;

export interface Tool {
  name: ToolName;
  description: string;
  inputSchema: Record<string, any>; // JSON Schema
}

export interface ToolResult {
  result?: any;
  error?: string;
}

export interface ServerInfo {
  version: string;
  name: string;
  capabilities: {
    tools: boolean;
  };
}
