import { Module, DynamicModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { McpModule } from './mcp/mcp.module.js';
import configuration from './config/configuration.js';

@Module({})
export class AppModule {
  static async register(): Promise<DynamicModule> {
    const mcpModule = await McpModule.register();

    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot({
          load: [configuration],
        }),
        mcpModule,
      ],
    };
  }
}
