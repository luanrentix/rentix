import { Test, TestingModule } from '@nestjs/testing';
import { ImoveisController } from './imoveis.controller';
import { ImoveisService } from './imoveis.service';

describe('ImoveisController', () => {
  let controller: ImoveisController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImoveisController],
      providers: [
        {
          provide: ImoveisService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<ImoveisController>(ImoveisController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
