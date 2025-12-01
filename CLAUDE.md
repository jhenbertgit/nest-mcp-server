# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a NestJS-based implementation of a Model Context Protocol (MCP) server. It provides a standardized API for exposing tools that can be called by MCP clients. The server supports both **stdio** and **HTTP** transports, with streaming capabilities via Server-Sent Events (SSE).

## Key Commands

### Build and Run
```bash
# Build the project (compiles TypeScript to dist/)
pnpm build

# Run the production build
pnpm start

# Development mode with auto-reload
pnpm run start:dev

# Run with stdio transport (for piped input)
pnpm run start:stdio

# Run with HTTP transport
pnpm run start:http

# Production mode
pnpm run start:prod
```

### Testing
```bash
# Run all unit tests
pnpm test

# Run tests in watch mode
pnpm run test:watch

# Run tests with coverage report
pnpm run test:cov

# Run end-to-end tests
pnpm run test:e2e

# Debug tests
pnpm run test:debug
```

### Code Quality
```bash
# Lint and auto-fix TypeScript files
pnpm run lint

# Format code with Prettier
pnpm run format
```

## Architecture

### Transport Modes

The server automatically detects the transport mode or accepts explicit configuration:

1. **Stdio Transport** (`src/stdio/main.ts`)
   - Used when input is piped or `--transport=stdio` flag is set
   - Implements MCP SDK's `StdioServerTransport`
   - Ideal for CLI integrations and local tool execution

2. **HTTP Transport** (`src/http/main.ts`)
   - Used when no piped input detected or `--transport=http` flag is set
   - Implements MCP SDK's `StreamableHTTPServerTransport`
   - Supports SSE for streaming tool outputs
   - Includes mock OAuth endpoints (`/register`, `/authorize`, `/token`)
   - Session management via `mcp-session-id` header

### Core Module Architecture

**Main Entry Point** (`src/main.ts`):
- Auto-detects transport mode based on stdin TTY status
- Bootstraps the NestJS application
- Initializes the appropriate transport (stdio or HTTP)

**Dynamic Module Registration**:
- `AppModule` (`src/app.module.ts`): Root module with dynamic registration
- `McpModule` (`src/mcp/mcp.module.ts`): Automatically discovers and registers all tools from `src/tools/` directory
  - Scans each subdirectory in `src/tools/`
  - Dynamically imports `{toolname}.module.ts` and `{toolname}.service.ts`
  - Provides all tool services to `MCP_TOOLS` injection token

**Service Layer** (`src/mcp/mcp.service.ts`):
- Central orchestration point for tool management
- Methods:
  - `listTools()`: Returns all registered tool definitions
  - `callToolStream()`: Executes a tool and returns Observable of events
  - `handleCallToolRequest()`: Handles MCP SDK CallToolRequest, supports notifications

### Tool Implementation Pattern

All tools must implement the `McpTool` interface (`src/mcp/interfaces/mcp-tool.interface.ts`):

```typescript
export interface McpTool {
  getToolDefinition(): Tool;  // Returns name, description, inputSchema
  call(input: Record<string, any>): Promise<ToolResult>;
  callStream?(input: Record<string, any>): Observable<McpToolEvent>; // Optional streaming
}
```

**Tool Directory Structure**:
```
src/tools/{toolname}/
  ├── {toolname}.module.ts     # NestJS module
  ├── {toolname}.service.ts    # Implements McpTool interface
  ├── {toolname}.schema.ts     # Zod schemas for validation
  └── {toolname}.service.spec.ts # Unit tests
```

### Event System

Tools can emit structured events via `McpToolEvent` (`src/mcp/events/mcp-event.ts`):
- `type: 'progress'` - Progress updates
- `type: 'log'` - Log messages with levels (info, warn, error)
- `type: 'success'` - Success result
- `type: 'error'` - Error message

These events are:
- Sent as notifications in stdio mode
- Streamed via SSE in HTTP mode
- Observable-based for reactive handling

### Configuration

Configuration is managed via `@nestjs/config` (`src/config/configuration.ts`):
- `PORT`: HTTP server port (default: 3000)
- `TRANSPORT`: Default transport mode ('http' or 'stdio')
- Environment variables loaded from `.env` file

### HTTP API Endpoints

When running in HTTP mode:
- `GET /mcp/server-info`: Server capabilities and version
- `GET /mcp/tools`: List all available tools
- `POST /mcp/tool/call`: Execute a tool (supports SSE streaming)
- `POST /mcp`: Main MCP protocol endpoint
- `GET /mcp`: SSE endpoint for server-to-client notifications (requires `mcp-session-id`)
- `DELETE /mcp`: Session termination

## Adding a New Tool

1. Create a new directory under `src/tools/{toolname}/`
2. Create `{toolname}.module.ts`:
   ```typescript
   import { Module } from '@nestjs/common';
   import { MyToolService } from './mytool.service.js';

   @Module({
     providers: [MyToolService],
     exports: [MyToolService],
   })
   export class MyToolModule {}
   ```

3. Create `{toolname}.service.ts` implementing `McpTool`:
   ```typescript
   import { Injectable } from '@nestjs/common';
   import { McpTool } from '../../mcp/interfaces/mcp-tool.interface.js';

   @Injectable()
   export class MyToolService implements McpTool {
     getToolDefinition() {
       return {
         name: 'my_tool',
         description: 'Description of what it does',
         inputSchema: { /* JSON Schema */ }
       };
     }

     async call(input: Record<string, any>) {
       // Implementation
       return { result: 'success' };
     }
   }
   ```

4. Create `{toolname}.schema.ts` with Zod schemas for input validation

The tool will be automatically discovered and registered by `McpModule`.

## Important Notes

- **ESM Modules**: Project uses ES modules (`"type": "module"` in package.json)
  - All imports must include `.js` extension (even for `.ts` files)
  - Use `import.meta.url` instead of `__dirname`

- **Dynamic Imports**: `McpModule` uses dynamic imports with `pathToFileURL()` for cross-platform compatibility

- **Error Handling**: Global exception filter in `src/shared/filters/global-exception.filter.ts`

- **Type Safety**: Strict TypeScript configuration with Zod for runtime validation

- **Observable Patterns**: RxJS used extensively for streaming tool outputs

## Current Tools

1. **file-search** (`src/tools/file-search/`): Search for files using glob patterns with streaming results
2. **read_file** (`src/tools/filereader/`): Read file contents with UTF-8 encoding
3. **ping** (`src/tools/ping/`): Simple connectivity test tool
