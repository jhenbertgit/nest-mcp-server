import { McpService } from '../mcp/mcp.service.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Request, Response, Express, json } from 'express';

// Map to store transports by session ID
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

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
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports[sessionId]) {
      transport = transports[sessionId];
    } else {
      // No session ID, so this is an initialization request.
      // Create a new transport and let the MCP SDK handle the request.
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (newSessionId) => {
          transports[newSessionId] = transport;
        },
      });

      transport.onclose = () => {
        if (transport.sessionId) {
          delete transports[transport.sessionId];
        }
      };

      const serverInfo = {
        name: 'nest-mcp-server-http',
        version: '2024-08-15',
        capabilities: {
          tools: {}, // Indicate that the server supports tools
        },
      };

      const mcpServer = new McpServer(serverInfo);

      // Register request handlers for tools
      mcpServer.server.setRequestHandler(ListToolsRequestSchema, () => {
        return { tools: mcpService.listTools() };
      });

      mcpServer.server.setRequestHandler(CallToolRequestSchema, (request) => {
        return mcpService.handleCallToolRequest(request, (event) => {
          mcpServer.server.notification({
            method: `notifications/tool/${event.type}`,
            params: event,
          });
        });
      });

      void mcpServer.connect(transport);
    }

    await transport.handleRequest(req, res, req.body);
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
