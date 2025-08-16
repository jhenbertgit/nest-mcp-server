import { Module, DynamicModule, Type } from '@nestjs/common';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';
import * as fs from 'fs';
import * as path from 'path';
import { McpTool } from './interfaces/mcp-tool.interface';

@Module({})
export class McpModule {
  static register(): DynamicModule {
    const toolModules: Type<any>[] = [];
    const toolServices: Type<McpTool>[] = [];

    const toolsDir = path.join(__dirname, '../tools');
    const toolNames = fs.readdirSync(toolsDir);

    for (const toolName of toolNames) {
      const toolModulePath = path.join(toolsDir, toolName, `${toolName}.module.ts`);
      const toolServicePath = path.join(toolsDir, toolName, `${toolName}.service.ts`);

      if (fs.existsSync(toolModulePath) && fs.existsSync(toolServicePath)) {
        const toolModule = require(path.join(toolsDir, toolName, `${toolName}.module`));
        const toolService = require(path.join(toolsDir, toolName, `${toolName}.service`));

        const moduleName = Object.keys(toolModule)[0];
        const serviceName = Object.keys(toolService)[0];

        toolModules.push(toolModule[moduleName]);
        toolServices.push(toolService[serviceName]);
      }
    }

    return {
      module: McpModule,
      imports: toolModules,
      controllers: [McpController],
      providers: [
        McpService,
        {
          provide: 'MCP_TOOLS',
          useFactory: (...tools: McpTool[]) => tools,
          inject: toolServices,
        },
      ],
    };
  }
}
