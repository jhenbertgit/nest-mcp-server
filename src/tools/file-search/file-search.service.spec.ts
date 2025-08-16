import { Test, TestingModule } from '@nestjs/testing';
import { FileSearchService } from './file-search.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import { spawn } from 'child_process';

jest.mock('child_process', () => ({
  ...jest.requireActual('child_process'),
  spawn: jest.fn(),
}));

describe('FileSearchService', () => {
  let service: FileSearchService;
  const testDir = path.join(__dirname, 'test-dir');
  const testFilePath = path.join(testDir, 'test-file.txt');
  const mockSpawn = spawn as jest.Mock;

  beforeAll(async () => {
    await fs.mkdir(testDir);
    await fs.writeFile(testFilePath, 'This is a test file.');
  });

  afterAll(async () => {
    await fs.unlink(testFilePath);
    await fs.rmdir(testDir);
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FileSearchService],
    }).compile();

    service = module.get<FileSearchService>(FileSearchService);
    mockSpawn.mockClear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getToolDefinition', () => {
    it('should return the correct tool definition', () => {
      const definition = service.getToolDefinition();
      expect(definition.name).toEqual('file_search');
      expect(definition.description).toEqual(
        'Search for files matching pattern with live results',
      );
    });
  });

  describe('call', () => {
    it('should find the test file and return it as a ToolResult', async () => {
      const mockProcess = {
        stdout: { on: jest.fn((event, cb) => cb(testFilePath)) },
        stderr: { on: jest.fn() },
        on: jest.fn((event, cb) => {
          if (event === 'close') cb(0);
        }),
        kill: jest.fn(),
      };
      mockSpawn.mockReturnValue(mockProcess);

      const result = await service.call({
        pattern: '*.txt',
        directory: testDir,
      });
      expect(result.result.files[0]).toContain('test-file.txt');
    });

    it('should return an error if the directory does not exist', async () => {
      const result = await service.call({
        pattern: '*.txt',
        directory: 'non-existent-dir',
      });
      expect(result.error).toBeDefined();
    });
  });
});