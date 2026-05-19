import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ImoveisController } from './imoveis.controller';
import { ImoveisService } from './imoveis.service';

@Module({
  imports: [PrismaModule],
  controllers: [ImoveisController],
  providers: [ImoveisService],
})
export class ImoveisModule {}
