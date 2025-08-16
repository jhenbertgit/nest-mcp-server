import { Module } from '@nestjs/common';
import { FileReaderService } from './filereader.service';

@Module({
  providers: [FileReaderService],
  exports: [FileReaderService], // ✅ Must export the service
})
export class FileReaderModule {}
