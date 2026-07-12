import { Module } from '@nestjs/common';
import { BancosService } from './bancos.service';
import { BancosController } from './bancos.controller';
import { ExtratosPublicosController } from './extratos-publicos.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BancosController, ExtratosPublicosController],
  providers: [BancosService],
  exports: [BancosService],
})
export class BancosModule {}
