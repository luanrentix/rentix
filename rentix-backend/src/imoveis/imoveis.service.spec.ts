import { Test, TestingModule } from '@nestjs/testing';
import { ImoveisService } from './imoveis.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ImoveisService', () => {
  let service: ImoveisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImoveisService,
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<ImoveisService>(ImoveisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
