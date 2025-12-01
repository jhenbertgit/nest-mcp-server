import { NestFactory } from '@nestjs/core';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { McpService } from '../mcp/mcp.service.js';
import { AppModule } from '../app.module.js';

/**
 * Starts the MCP server over stdio
 */
export async function startStdioServer(mcpService: McpService) {
  const server = new McpServer(
    {
      name: 'nest-mcp-server-stdio',
      version: '2024-08-15',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // Register all tools from MCP service
  const tools = mcpService.listTools();
  console.error(`Registering ${tools.length} tools:`, tools.map(t => t.name));

  for (const tool of tools) {
    try {
      server.registerTool(
        tool.name,
        {
          title: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema || {},
        },
        async (args: Record<string, any>, _extra) => {
          const result = await mcpService.callTool(tool.name, args);
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(result),
              },
            ],
          };
        },
      );
      console.error(`Successfully registered tool: ${tool.name}`);
    } catch (error) {
      console.error(`Error registering tool ${tool.name}:`, error);
    }
  }

  console.error('All tools registered, server ready');

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Graceful shutdown
  process.on('SIGTERM', () => process.exit(0));
  process.on('SIGINT', () => process.exit(0));
}

// Removed auto-executing bootstrap to prevent unintended server startup on import
// The startStdioServer function is called from main.ts when stdio transport is selected
