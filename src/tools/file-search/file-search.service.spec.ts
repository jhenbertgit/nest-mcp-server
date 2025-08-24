import { Test, TestingModule } from '@nestjs/testing';
import { FileSearchService } from './file-search.service';
import { McpToolEvent } from '../../mcp/events/mcp-event';
import * as path from 'path';
import * as fs from 'fs';

describe('FileSearchService', () => {
  let service: FileSearchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FileSearchService],
    }).compile();

    service = module.get<FileSearchService>(FileSearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('call', () => {
    it('should find files matching the pattern', async () => {
      const result = await service.call({ pattern: 'src/**/*.ts' });
      expect(result.error).toBeUndefined();
      expect(result.result).toBeDefined();
      expect(result.result!.count).toBeGreaterThan(0);
    });
  });

  describe('callStream', () => {
    it('should stream files matching the pattern', (done) => {
      const observable = service.callStream({ pattern: 'src/**/*.ts' });
      let eventCount = 0;
      observable.subscribe({
        next: (event: McpToolEvent) => {
          if (event.type === 'log' && event.level === 'info') {
            eventCount++;
          }
        },
        complete: () => {
          expect(eventCount).toBeGreaterThan(0);
          done();
        },
      });
    });
  });
});