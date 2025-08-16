import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';

export async function startHttpServer() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  // app.setGlobalPrefix('mcp');
  return app;
}

