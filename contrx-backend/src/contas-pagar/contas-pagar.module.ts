import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ContasPagarController } from './contas-pagar.controller';
import { ContasPagarService } from './contas-pagar.service';

@Module({
  imports: [PrismaModule],
  controllers: [ContasPagarController],
  providers: [ContasPagarService],
})
export class ContasPagarModule {}
