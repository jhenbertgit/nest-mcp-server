import { Injectable } from '@nestjs/common';
import { McpTool } from '../../mcp/interfaces/mcp-tool.interface';
import { ToolResult } from '../../shared/types/mcp.types';

@Injectable()
export class PingService implements McpTool {
  getToolDefinition() {
    return {
      name: 'ping',
      description: 'Responds with pong',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    };
  }

  async call(): Promise<ToolResult> {
    return { result: 'pong' };
  }
}

