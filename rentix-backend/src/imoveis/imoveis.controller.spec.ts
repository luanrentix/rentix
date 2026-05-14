import { Test, TestingModule } from '@nestjs/testing';
import { ImoveisController } from './imoveis.controller';

describe('ImoveisController', () => {
  let controller: ImoveisController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImoveisController],
    }).compile();

    controller = module.get<ImoveisController>(ImoveisController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
