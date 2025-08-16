import { createInterface } from 'readline';
import { McpService } from '../mcp/mcp.service';
import { McpOutgoingEvent, McpToolEvent } from '../mcp/events/mcp-event';

type McpRequest =
  | { type: 'initialize'; capabilities?: Record<string, any> }
  | { type: 'callTool'; tool: string; arguments: Record<string, any> };

/**
 * Starts the MCP server over stdio
 */
export function startStdioServer(mcpService: McpService) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  rl.on('line', (line) => {
    if (!line.trim()) return;

    let message: McpRequest;
    try {
      message = JSON.parse(line);
    } catch (err) {
      send({ type: 'error', message: 'Invalid JSON' });
      return;
    }

    handle(message, mcpService).catch((err) => {
      send({ type: 'error', message: err.message || String(err) });
    });
  });

  // Graceful shutdown
  process.on('SIGTERM', () => process.exit(0));
  process.on('SIGINT', () => process.exit(0));
}

/**
 * Handles incoming MCP messages
 */
async function handle(message: McpRequest, mcpService: McpService) {
  switch (message.type) {
    case 'initialize':
      send({
        type: 'serverInfo',
        version: '2024-08-15',
        server: 'nest-mcp-server-stdio',
        capabilities: { tools: true },
        tools: mcpService.listTools(),
      });
      break;

    case 'callTool':
      const observable = mcpService.callToolStream(
        message.tool,
        message.arguments,
      );

      observable.subscribe({
        next: (event: McpToolEvent) => send(event),
        error: (err: Error) => send({ type: 'error', message: err.message }),
        complete: () => {},
      });
      break;

    default:
      send({
        type: 'error',
        message: `Unknown message type: ${(message as any).type}`,
      });
  }
}

/**
 * Send an event over stdout (newline-delimited JSON)
 */
function send(event: McpOutgoingEvent) {
  process.stdout.write(JSON.stringify(event) + '\n');
}
