import { Module } from '@nestjs/common';
import { FileReaderService } from './filereader.service.js';

@Module({
  providers: [FileReaderService],
  exports: [FileReaderService], // ✅ Must export the service
})
export class FileReaderModule {}
