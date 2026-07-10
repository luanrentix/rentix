import { Module } from '@nestjs/common';
import { ChamadosController } from './chamados.controller';
import { ChamadosService } from './chamados.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ChamadosController],
  providers: [ChamadosService],
  exports: [ChamadosService],
})
export class ChamadosModule {}
