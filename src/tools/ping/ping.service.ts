import { Injectable } from '@nestjs/common';
import { McpTool } from '../../mcp/interfaces/mcp-tool.interface.js';
import { ToolResult } from '../../shared/types/mcp.types.js';

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

  call(): Promise<ToolResult> {
    return Promise.resolve({ result: 'pong' });
  }
}
