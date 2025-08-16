import { Injectable } from '@nestjs/common';
import { spawn } from 'child_process';
import { Observable } from 'rxjs';
import { McpTool } from '../../mcp/interfaces/mcp-tool.interface';
import { McpToolEvent } from '../../mcp/events/mcp-event';
import { FileSearchInputSchema, FileSearchInput } from './file-search.schema';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class FileSearchService implements McpTool {
  getToolDefinition() {
    return {
      name: 'file_search',
      description: 'Search for files matching pattern with live results',
      inputSchema: {
        type: 'object',
        properties: {
          pattern: {
            type: 'string',
            description:
              'Search pattern (supports wildcards like *.txt, *.log)',
          },
          directory: {
            type: 'string',
            description: 'Directory to search in',
          },
          caseSensitive: {
            type: 'boolean',
            description: 'Case sensitive search (default: false)',
            default: false,
          },
          maxResults: {
            type: 'number',
            description: 'Maximum number of results (default: 1000)',
            default: 1000,
          },
          recursive: {
            type: 'boolean',
            description: 'Search recursively in subdirectories (default: true)',
            default: true,
          },
        },
        required: ['pattern', 'directory'],
      },
    };
  }

  callStream(input: Record<string, any>): Observable<McpToolEvent> {
    // Validate input using Zod
    try {
      const validatedInput = FileSearchInputSchema.parse(input);
      return this.performSearch(validatedInput);
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return new Observable((subscriber) => {
          subscriber.next({
            type: 'error',
            message: `Validation error: ${error.message}`,
          });
          subscriber.complete();
        });
      }

      return new Observable((subscriber) => {
        subscriber.next({
          type: 'error',
          message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
        });
        subscriber.complete();
      });
    }
  }

  async call(
    input: Record<string, any>,
  ): Promise<{ result?: any; error?: string }> {
    try {
      const validatedInput = FileSearchInputSchema.parse(input);

      // For sync version, collect all results
      return new Promise((resolve) => {
        const results: string[] = [];
        let errorOccurred = false;

        const observable = this.performSearch(validatedInput);

        observable.subscribe({
          next: (event) => {
            if (event.type === 'log' && event.level === 'info') {
              results.push(event.message);
            } else if (event.type === 'error') {
              errorOccurred = true;
              resolve({ error: event.message });
            }
          },
          error: (err) => {
            resolve({ error: err.message });
          },
          complete: () => {
            if (!errorOccurred) {
              resolve({ result: { files: results, count: results.length } });
            }
          },
        });
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return { error: `Validation error: ${error.message}` };
      }
      return {
        error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private performSearch(input: FileSearchInput): Observable<McpToolEvent> {
    return new Observable<McpToolEvent>((subscriber) => {
      // Validate directory exists
      if (!fs.existsSync(input.directory)) {
        subscriber.next({
          type: 'error',
          message: `Directory does not exist: ${input.directory}`,
        });
        subscriber.complete();
        return;
      }

      // Check if it's actually a directory
      const stat = fs.statSync(input.directory);
      if (!stat.isDirectory()) {
        subscriber.next({
          type: 'error',
          message: `Path is not a directory: ${input.directory}`,
        });
        subscriber.complete();
        return;
      }

      // Normalize directory path
      const normalizedDir = path.resolve(input.directory);

      subscriber.next({
        type: 'progress',
        message: `Searching for "${input.pattern}" in ${normalizedDir}...`,
      });

      // Build find command
      const args = this.buildFindCommand(input, normalizedDir);

      const findProcess = spawn('find', args);
      let resultCount = 0;
      let isCompleted = false;

      findProcess.stdout.on('data', (data) => {
        if (isCompleted) return;

        const output = data.toString();
        const files = output.trim().split('\n').filter(Boolean);

        for (const file of files) {
          if (resultCount >= input.maxResults) {
            subscriber.next({
              type: 'log',
              level: 'warn',
              message: `Maximum results (${input.maxResults}) reached. Stopping search.`,
            });
            this.cleanupProcess(findProcess);
            subscriber.complete();
            isCompleted = true;
            return;
          }

          resultCount++;
          subscriber.next({
            type: 'log',
            level: 'info',
            message: file,
          });
        }
      });

      findProcess.stderr.on('data', (data) => {
        if (isCompleted) return;

        const error = data.toString().trim();
        if (error && !error.includes('Permission denied')) {
          subscriber.next({
            type: 'log',
            level: 'error',
            message: `Find error: ${error}`,
          });
        }
      });

      findProcess.on('close', (code) => {
        if (isCompleted) return;

        if (code === 0) {
          subscriber.next({
            type: 'success',
            result: {
              message: 'Search completed',
              pattern: input.pattern,
              directory: normalizedDir,
              totalResults: resultCount,
              maxResults: input.maxResults,
            },
          });
        } else if (code !== null) {
          subscriber.next({
            type: 'error',
            message: `Find process exited with code ${code}`,
          });
        }

        subscriber.complete();
        isCompleted = true;
      });

      findProcess.on('error', (err) => {
        if (isCompleted) return;

        subscriber.next({
          type: 'error',
          message: `Failed to start find process: ${err.message}`,
        });
        subscriber.complete();
        isCompleted = true;
      });

      // Cleanup function
      return () => {
        if (!isCompleted) {
          this.cleanupProcess(findProcess);
          isCompleted = true;
        }
      };
    });
  }

  private buildFindCommand(
    input: FileSearchInput,
    directory: string,
  ): string[] {
    const args: string[] = [directory];

    // Add recursive flag
    if (!input.recursive) {
      args.push('-maxdepth', '1');
    }

    // Add name pattern
    if (input.caseSensitive) {
      args.push('-name', input.pattern);
    } else {
      args.push('-iname', input.pattern);
    }

    // Add type filter for files only
    args.push('-type', 'f');

    return args;
  }

  private cleanupProcess(process: any) {
    try {
      if (process && !process.killed) {
        process.kill('SIGTERM');
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}
