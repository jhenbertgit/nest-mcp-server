import { Injectable, Inject } from '@nestjs/common';
import { Observable, of, from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { McpTool } from './interfaces/mcp-tool.interface.js';
import { McpToolEvent } from './events/mcp-event.js';
import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';

// Helper functions for type-safe event creation
function createErrorEvent(message: string): McpToolEvent {
  return { type: 'error', message };
}

function createSuccessEvent(result: unknown): McpToolEvent {
  return { type: 'success', result: result as any };
}

@Injectable()
export class McpService {
  private tools = new Map<string, McpTool>();

  constructor(@Inject('MCP_TOOLS') toolList: McpTool[]) {
    toolList.forEach((tool) => {
      const def = tool.getToolDefinition();
      this.tools.set(def.name, tool);
    });
  }

  // ✅ Public method to list tool definitions
  listTools() {
    return Array.from(this.tools.values()).map((tool) =>
      tool.getToolDefinition(),
    );
  }

  // ✅ Public method to call a tool and return the result
  async callTool(toolName: string, input: Record<string, any>): Promise<any> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool '${toolName}' not found`);
    }

    const result = await tool.call(input);
    if (result.error) {
      throw new Error(result.error);
    }
    return result.result;
  }

  callToolStream(
    toolName: string,
    input: Record<string, any>,
  ): Observable<McpToolEvent> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return of(createErrorEvent(`Tool '${toolName}' not found`));
    }

    try {
      // Check if tool supports streaming
      if (tool.callStream) {
        return tool
          .callStream(input)
          .pipe(
            catchError((err) =>
              of(
                createErrorEvent(
                  err instanceof Error ? err.message : String(err),
                ),
              ),
            ),
          );
      } else {
        // Fallback to regular call (convert Promise to Observable)
        const promise = tool.call(input);
        return from(promise).pipe(
          map((result) => {
            if (result.error) {
              return createErrorEvent(result.error);
            }
            return createSuccessEvent(result.result);
          }),
          catchError((err) =>
            of(
              createErrorEvent(
                err instanceof Error ? err.message : String(err),
              ),
            ),
          ),
        );
      }
    } catch (err) {
      return of(
        createErrorEvent(
          `Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  }

  // ✅ Public method to handle tool calls from MCP servers
  handleCallToolRequest(
    request: CallToolRequest,
    notificationCallback: (event: McpToolEvent) => void,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const observable = this.callToolStream(
        request.params.name,
        request.params.arguments ?? {},
      );

      observable.subscribe({
        next: (event) => {
          if (event.type === 'success') {
            resolve({ result: event.result });
          } else if (event.type === 'error') {
            reject(new Error(event.message));
          } else if (event.type === 'progress' || event.type === 'log') {
            notificationCallback(event);
          }
        },
        error: (err) => {
          reject(err instanceof Error ? err : new Error(String(err)));
        },
        complete: () => {
          resolve({});
        },
      });
    });
  }
}
