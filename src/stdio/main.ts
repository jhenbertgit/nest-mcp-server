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
  const serverInfo = {
    name: 'nest-mcp-server-stdio',
    version: '2024-08-15',
    capabilities: {
      tools: {},
    },
  };
  const server = new McpServer(serverInfo);

  // Register request handlers
  server.server.setRequestHandler(ListToolsRequestSchema, () => {
    return {
      tools: mcpService.listTools(),
    };
  });

  server.server.setRequestHandler(CallToolRequestSchema, (request) => {
    return mcpService.handleCallToolRequest(request, (event) => {
      server.server.notification({
        method: `notifications/tool/${event.type}`,
        params: event,
      });
    });
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Graceful shutdown
  process.on('SIGTERM', () => process.exit(0));
  process.on('SIGINT', () => process.exit(0));
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(
    await AppModule.register(),
  );
  const mcpService = app.get(McpService);
  await startStdioServer(mcpService);
}

bootstrap();
