import { Module } from '@nestjs/common';
import { FileSearchService } from './file-search.service.js';

@Module({
  providers: [FileSearchService],
  exports: [FileSearchService],
})
export class FileSearchModule {}
