#!/usr/bin/env node

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { startStdioServer } from './stdio/main';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';
import { McpService } from './mcp/mcp.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const mcpService = app.get(McpService);

  app.useGlobalFilters(new GlobalExceptionFilter());

  // Parse CLI args
  const args = process.argv.slice(2);
  const transportArg = args.find((arg) => arg.startsWith('--transport='));
  const transportMode = transportArg?.split('=')[1] || configService.get('transport');

  // Auto-detect if no explicit flag
  const isPiped = !process.stdin.isTTY;
  const shouldUseStdio =
    transportMode === 'stdio' || (transportMode == null && isPiped);
  const shouldUseHttp =
    transportMode === 'http' || (transportMode == null && !isPiped);

  if (shouldUseStdio) {
    console.error('🚀 Starting MCP Server over stdio...');
    startStdioServer(mcpService);
  } else if (shouldUseHttp) {
    console.error('🚀 Starting MCP Server over HTTP...');
    const port = configService.get('port');
    await app.listen(port);
    console.log(`🌐 MCP HTTP Server listening on http://localhost:${port}/mcp`);
  } else {
    console.error('❌ No valid transport mode detected');
    console.error('Use: --transport=http or --transport=stdio, or pipe input');
    process.exit(1);
  }
}

bootstrap();
