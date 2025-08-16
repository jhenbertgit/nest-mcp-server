import { Module } from '@nestjs/common';
import { FileSearchService } from './file-search.service';

@Module({
  providers: [FileSearchService],
  exports: [FileSearchService],
})
export class FileSearchModule {}
