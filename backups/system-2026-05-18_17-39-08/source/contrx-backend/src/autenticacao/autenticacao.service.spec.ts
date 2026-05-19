import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AutenticacaoService } from './autenticacao.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AutenticacaoService', () => {
  let service: AutenticacaoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutenticacaoService,
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: JwtService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<AutenticacaoService>(AutenticacaoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
