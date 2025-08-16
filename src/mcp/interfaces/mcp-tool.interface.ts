import { Observable } from 'rxjs';
import { Tool, ToolResult } from '../../shared/types/mcp.types';
import { McpToolEvent } from '../events/mcp-event';

export interface McpTool {
  getToolDefinition(): Tool;
  call(input: Record<string, any>): Promise<ToolResult>;

  // Optional streaming method
  callStream?(input: Record<string, any>): Observable<McpToolEvent>;
}
