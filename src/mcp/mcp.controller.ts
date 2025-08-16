import { Controller, Post, Get, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { McpService } from './mcp.service';
import { CallToolDto } from './dto/call-tool.dto';
import { McpToolEvent } from './events/mcp-event';
import { parseJson } from '../shared/utils/json.utils';

@Controller('mcp')
export class McpController {
  constructor(private readonly mcpService: McpService) {}

  @Get('server-info')
  getServerInfo() {
    return {
      version: '2024-08-15',
      server: 'nest-mcp-server',
      capabilities: {
        tools: true,
        'resources-read': false,
      },
    };
  }

  @Get('tools')
  listTools() {
    return this.mcpService.listTools();
  }

  @Post('tool/call')
  async callTool(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    let body: CallToolDto;

    try {
      body = await parseJson(req);
    } catch (err) {
      this.sendEvent(res, { type: 'error', message: 'Invalid JSON' });
      res.end();
      return;
    }

    if (!body?.tool) {
      this.sendEvent(res, { type: 'error', message: 'Missing "tool"' });
      res.end();
      return;
    }

    const observable = this.mcpService.callToolStream(
      body.tool,
      body.arguments || {},
    );

    observable.subscribe({
      next: (event) => this.sendEvent(res, event),
      error: (err) => {
        this.sendEvent(res, {
          type: 'error',
          message: err.message || String(err),
        });
        res.end();
      },
      complete: () => {
        res.end();
      },
    });

    req.on('close', () => {
      // Optionally cancel tasks
    });
  }

  private sendEvent(res: Response, event: McpToolEvent) {
    const data = JSON.stringify(event);
    res.write(` ${data}\n\n`);
  }
}
