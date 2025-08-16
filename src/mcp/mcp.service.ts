import { Injectable, Inject } from '@nestjs/common';
import { Observable, of, from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { McpTool } from './interfaces/mcp-tool.interface';
import { McpToolEvent } from './events/mcp-event';

// Helper functions for type-safe event creation
function createErrorEvent(message: string): McpToolEvent {
  return { type: 'error', message };
}

function createSuccessEvent(result: any): McpToolEvent {
  return { type: 'success', result };
}

function createProgressEvent(message: string, percent?: number): McpToolEvent {
  return { type: 'progress', message, percent };
}

function createLogEvent(
  level: 'info' | 'warn' | 'error',
  message: string,
): McpToolEvent {
  return { type: 'log', level, message };
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

  callToolStream(toolName: string, input: any): Observable<McpToolEvent> {
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
      return of(createErrorEvent(`Unexpected error: ${err}`));
    }
  }
}
