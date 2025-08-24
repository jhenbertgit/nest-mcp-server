import { Module } from '@nestjs/common';
import { PingService } from './ping.service.js';

@Module({
  providers: [PingService],
  exports: [PingService], // ✅ Must export the service
})
export class PingModule {}
