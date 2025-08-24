import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { McpTool } from '../../mcp/interfaces/mcp-tool.interface.js';
import { McpToolEvent } from '../../mcp/events/mcp-event.js';
import {
  FileSearchInputSchema,
  FileSearchInput,
  FileSearchJsonSchema,
} from './file-search.schema.js';
import * as path from 'path';
import * as fs from 'fs';
import { glob } from 'glob';

@Injectable()
export class FileSearchService implements McpTool {
  getToolDefinition() {
    return {
      name: 'file_search',
      description: 'Search for files matching pattern with live results',
      inputSchema: FileSearchJsonSchema,
    };
  }

  callStream(input: Record<string, any>): Observable<McpToolEvent> {
    try {
      const validatedInput = FileSearchInputSchema.parse(input);
      return this.performSearch(validatedInput);
    } catch (error) {
      return new Observable((subscriber) => {
        subscriber.next({
          type: 'error',
          message: `Invalid input: ${error.message}`,
        });
        subscriber.complete();
      });
    }
  }

  async call(
    input: Record<string, any>,
  ): Promise<{ result?: { files: string[]; count: number }; error?: string }> {
    try {
      const validatedInput = FileSearchInputSchema.parse(input);
      const files = await glob(validatedInput.pattern, {
        cwd: '.',
        nodir: true,
        dot: true,
        ignore: validatedInput.recursive ? [] : ['**/*'],
        nocase: !validatedInput.caseSensitive,
      });
      return { result: { files, count: files.length } };
    } catch (error) {
      return { error: `Invalid input: ${error.message}` };
    }
  }

  private performSearch(input: FileSearchInput): Observable<McpToolEvent> {
    return new Observable<McpToolEvent>((subscriber) => {
      const globStream = glob.stream(input.pattern, {
        cwd: '.',
        nodir: true,
        dot: true,
        ignore: input.recursive ? [] : ['**/*'],
        nocase: !input.caseSensitive,
      });

      subscriber.next({
        type: 'progress',
        message: `Searching for "${input.pattern}" in the current directory...`,
      });

      let resultCount = 0;

      globStream.on('data', (file) => {
        if (resultCount >= input.maxResults) {
          subscriber.next({
            type: 'log',
            level: 'warn',
            message: `Maximum results (${input.maxResults}) reached. Stopping search.`,
          });
          globStream.destroy();
          subscriber.complete();
          return;
        }
        resultCount++;
        subscriber.next({
          type: 'log',
          level: 'info',
          message: file.toString(),
        });
      });

      globStream.on('error', (err: Error) => {
        subscriber.next({ type: 'error', message: err.message });
        subscriber.complete();
      });

      globStream.on('end', () => {
        subscriber.next({
          type: 'success',
          result: {
            message: 'Search completed',
            pattern: input.pattern,
            directory: '.',
            totalResults: resultCount,
            maxResults: input.maxResults,
          },
        });
        subscriber.complete();
      });

      return () => {
        globStream.destroy();
      };
    });
  }
}
