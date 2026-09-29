import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ImoveisService } from './imoveis.service';
import { PrismaService } from '../prisma/prisma.service';
import { CriarImovelDto } from './dto/criar-imovel.dto';

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

  it('should map street and neighborhood to address and district when creating property', async () => {
    const prismaMock = {
      company: {
        findUnique: jest.fn().mockResolvedValue({ id: 'company-1' }),
      },
      property: {
        create: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: 'prop-1', ...data }),
          ),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImoveisService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    const imoveisService = module.get<ImoveisService>(ImoveisService);

    const result = await imoveisService.create(
      {
        title: 'Escavadeira CAT',
        street: 'Rua das Flores',
        neighborhood: 'Centro',
      },
      'company-1',
    );

    expect(prismaMock.property.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'ESCAVADEIRA CAT',
          address: 'RUA DAS FLORES',
          district: 'CENTRO',
        }),
      }),
    );
    expect(result).toBeDefined();
  });

  it('should pass ValidationPipe with street and neighborhood without non-whitelisted errors', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });

    const payload = {
      title: 'Escavadeira CAT',
      street: 'Rua das Flores',
      neighborhood: 'Centro',
      code: '321',
      purpose: 'LOCAÇÃO',
      assetCategory: 'MACHINE',
    };

    const validated = await pipe.transform(payload, {
      type: 'body',
      metatype: CriarImovelDto,
    });

    expect(validated.title).toBe('Escavadeira CAT');
    expect(validated.street).toBe('Rua das Flores');
    expect(validated.neighborhood).toBe('Centro');
  });
});
