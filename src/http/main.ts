import { McpService } from '../mcp/mcp.service.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Request, Response, Express, json } from 'express';
import { z } from 'zod';

// Map to store transports by session ID
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

// Helper function to create MCP server with tools
function createMcpServer(mcpService: McpService): McpServer {
  const server = new McpServer(
    {
      name: 'nest-mcp-server-http',
      version: '2024-08-15',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // Register all tools from MCP service
  const tools = mcpService.listTools();
  console.log(`Registering ${tools.length} tools:`, tools.map(t => t.name));

  for (const tool of tools) {
    try {
      server.registerTool(
        tool.name,
        {
          title: tool.name,
          description: tool.description,
          inputSchema: {}, // Empty schema for now - tools validate internally
        },
        async (args: Record<string, any>, _extra) => {
          const result = await mcpService.callTool(tool.name, args);
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(result),
              },
            ],
          };
        },
      );
      console.log(`Successfully registered tool: ${tool.name}`);
    } catch (error) {
      console.error(`Error registering tool ${tool.name}:`, error);
    }
  }

  console.log('All tools registered, server ready');

  return server;
}

export function setupHttpServer(app: INestApplication): INestApplication {
  const mcpService = app.get(McpService);
  const expressApp = app.getHttpAdapter().getInstance() as Express;

  // Middleware to parse JSON bodies
  expressApp.use('/mcp', json());

  app.enableCors({
    origin: '*',
  });

  // Handle POST requests for client registration
  expressApp.post('/register', (req: Request, res: Response) => {
    // This is a placeholder to satisfy the client's registration request.
    // In a real-world scenario, you would handle user registration and authentication here.
    res.status(200).json({ status: 'ok' });
  });

  // Handle GET requests for client authorization
  expressApp.get('/authorize', (req: Request, res: Response) => {
    const { redirect_uri, state } = req.query;
    if (typeof redirect_uri !== 'string' || typeof state !== 'string') {
      res.status(400).send('Invalid request: missing redirect_uri or state');
      return;
    }
    // This is a placeholder to satisfy the client's authorization request.
    // In a real-world scenario, you would handle user authentication, consent,
    // and then redirect with a real authorization code.
    const authorizationCode = 'mock_auth_code';
    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.append('code', authorizationCode);
    redirectUrl.searchParams.append('state', state);
    res.redirect(redirectUrl.toString());
  });

  // Handle POST requests for token exchange
  expressApp.post('/token', json(), (req: Request, res: Response) => {
    // This is a placeholder to satisfy the client's token request.
    // In a real-world scenario, you would validate the authorization code
    // and issue a real JWT or other access token.
    res.status(200).json({
      access_token: 'mock_access_token',
      refresh_token: 'mock_refresh_token',
      token_type: 'Bearer',
      expires_in: 3600,
    });
  });

  // Handle POST requests for client-to-server communication
  expressApp.post('/mcp', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    try {
      let transport: StreamableHTTPServerTransport;

      if (sessionId && transports[sessionId]) {
        // Reuse existing transport
        transport = transports[sessionId];
      } else if (!sessionId && isInitializeRequest(req.body)) {
        // New initialization request - create new transport and server
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (newSessionId) => {
            console.log(`Session initialized with ID: ${newSessionId}`);
            transports[newSessionId] = transport;
          },
        });

        // Set up onclose handler
        transport.onclose = () => {
          const sid = transport.sessionId;
          if (sid && transports[sid]) {
            console.log(`Transport closed for session ${sid}`);
            delete transports[sid];
          }
        };

        // Create MCP server instance with registered tools
        const mcpServer = createMcpServer(mcpService);

        // Connect the transport to the server BEFORE handling the request
        await mcpServer.connect(transport);
        await transport.handleRequest(req, res, req.body);
        return;
      } else {
        // Invalid request
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: No valid session ID provided',
          },
          id: null,
        });
        return;
      }

      // Handle request with existing transport
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('Error handling MCP request:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        });
      }
    }
  });

  // Reusable handler for GET and DELETE requests
  const handleSessionRequest = async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }

    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
  };

  // Handle GET requests for server-to-client notifications via SSE
  expressApp.get('/mcp', handleSessionRequest);

  // Handle DELETE requests for session termination
  expressApp.delete('/mcp', handleSessionRequest);

  return app;
}
