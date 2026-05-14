import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ContratosController } from './contratos.controller';
import { ContratosService } from './contratos.service';

@Module({
  imports: [PrismaModule],
  controllers: [ContratosController],
  providers: [ContratosService],
})
export class ContratosModule {}
