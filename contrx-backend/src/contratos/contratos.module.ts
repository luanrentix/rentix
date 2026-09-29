import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ContratosController } from './contratos.controller';
import { ContratosPublicosController } from './contratos-publicos.controller';
import { ContratosService } from './contratos.service';

@Module({
  imports: [PrismaModule],
  controllers: [ContratosController, ContratosPublicosController],
  providers: [ContratosService],
  exports: [ContratosService],
})
export class ContratosModule {}
