import { Module, DynamicModule, Type } from '@nestjs/common';
import { McpService } from './mcp.service.js';
import * as fs from 'fs';
import * as path from 'path';
import { McpTool } from './interfaces/mcp-tool.interface.js';
import { fileURLToPath, pathToFileURL } from 'url';

@Module({})
export class McpModule {
  static async register(): Promise<DynamicModule> {
    const toolModules: Type<any>[] = [];
    const toolServices: Type<McpTool>[] = [];

    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const toolsDir = path.join(__dirname, '../tools');
    const toolNames = fs.readdirSync(toolsDir);

    for (const toolName of toolNames) {
      // Check for .ts files (development) or .js files (production)
      const moduleExt = fs.existsSync(path.join(toolsDir, toolName, `${toolName}.module.ts`)) ? 'ts' : 'js';
      const serviceExt = fs.existsSync(path.join(toolsDir, toolName, `${toolName}.service.ts`)) ? 'ts' : 'js';

      const toolModulePath = path.join(
        toolsDir,
        toolName,
        `${toolName}.module.${moduleExt}`,
      );
      const toolServicePath = path.join(
        toolsDir,
        toolName,
        `${toolName}.service.${serviceExt}`,
      );

      if (fs.existsSync(toolModulePath) && fs.existsSync(toolServicePath)) {
        type ToolModuleExport = { [key: string]: Type<any> };
        type ToolServiceExport = { [key: string]: Type<McpTool> };

        // Always use .js extension for imports (ts-node/tsc will resolve correctly)
        const toolModule = (await import(
          pathToFileURL(path.join(toolsDir, toolName, `${toolName}.module.js`)).href
        )) as ToolModuleExport;
        const toolService = (await import(
          pathToFileURL(path.join(toolsDir, toolName, `${toolName}.service.js`)).href
        )) as ToolServiceExport;

        const moduleName = Object.keys(toolModule)[0];
        const serviceName = Object.keys(toolService)[0];

        toolModules.push(toolModule[moduleName]);
        toolServices.push(toolService[serviceName]);
      }
    }

    return {
      module: McpModule,
      imports: toolModules,
      controllers: [],
      providers: [
        McpService,
        {
          provide: 'MCP_TOOLS',
          useFactory: (...tools: McpTool[]) => tools,
          inject: toolServices,
        },
      ],
      exports: [McpService],
    };
  }
}
