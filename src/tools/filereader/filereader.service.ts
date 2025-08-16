import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import { McpTool } from '../../mcp/interfaces/mcp-tool.interface';
import { ToolResult } from '../../shared/types/mcp.types';
import { FileReaderInputSchema, FileReaderInput } from './filereader.schema';

@Injectable()
export class FileReaderService implements McpTool {
  getToolDefinition() {
    return {
      name: 'read_file',
      description: 'Reads content of a file',
      inputSchema: FileReaderInputSchema,
    };
  }

  async call(input: FileReaderInput): Promise<ToolResult> {
    try {
      const validatedInput = FileReaderInputSchema.parse(input);
      const content = await fs.readFile(validatedInput.path, 'utf-8');
      return { result: content };
    } catch (err) {
      if (err instanceof Error && err.name === 'ZodError') {
        return { error: `Validation error: ${err.message}` };
      }
      return { error: (err as Error).message };
    }
  }
}

