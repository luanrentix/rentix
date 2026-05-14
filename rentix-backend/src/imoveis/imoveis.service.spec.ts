import { Test, TestingModule } from '@nestjs/testing';
import { ImoveisService } from './imoveis.service';

describe('ImoveisService', () => {
  let service: ImoveisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ImoveisService],
    }).compile();

    service = module.get<ImoveisService>(ImoveisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
