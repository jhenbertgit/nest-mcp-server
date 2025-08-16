import { Test, TestingModule } from '@nestjs/testing';
import { FileReaderService } from './filereader.service';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('FileReaderService', () => {
  let service: FileReaderService;
  const testFilePath = path.join(__dirname, 'test-file.txt');
  const testFileContent = 'This is a test file.';

  beforeAll(async () => {
    await fs.writeFile(testFilePath, testFileContent);
  });

  afterAll(async () => {
    await fs.unlink(testFilePath);
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FileReaderService],
    }).compile();

    service = module.get<FileReaderService>(FileReaderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getToolDefinition', () => {
    it('should return the correct tool definition', () => {
      const definition = service.getToolDefinition();
      expect(definition.name).toEqual('read_file');
      expect(definition.description).toEqual('Reads content of a file');
    });
  });

  describe('call', () => {
    it('should read the content of a file and return it as a ToolResult', async () => {
      const result = await service.call({ path: testFilePath });
      expect(result.result).toEqual(testFileContent);
    });

    it('should return an error if the file does not exist', async () => {
      const result = await service.call({ path: 'non-existent-file.txt' });
      expect(result.error).toBeDefined();
    });
  });
});