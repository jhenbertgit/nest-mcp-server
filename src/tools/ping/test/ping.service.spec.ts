import { Test, TestingModule } from '@nestjs/testing';
import { PingService } from '../ping.service';

describe('PingService', () => {
  let service: PingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PingService],
    }).compile();

    service = module.get<PingService>(PingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getToolDefinition', () => {
    it('should return the correct tool definition', () => {
      const definition = service.getToolDefinition();
      expect(definition.name).toEqual('ping');
      expect(definition.description).toEqual('Responds with pong');
    });
  });

  describe('call', () => {
    it('should return a ToolResult with the result "pong"', async () => {
      const result = await service.call();
      expect(result.result).toEqual('pong');
    });
  });
});
