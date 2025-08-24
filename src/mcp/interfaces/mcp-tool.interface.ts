import { Observable } from 'rxjs';
import { Tool, ToolResult } from '../../shared/types/mcp.types.js';
import { McpToolEvent } from '../events/mcp-event.js';

export interface McpTool {
  getToolDefinition(): Tool;
  call(input: Record<string, any>): Promise<ToolResult>;

  // Optional streaming method
  callStream?(input: Record<string, any>): Observable<McpToolEvent>;
}
