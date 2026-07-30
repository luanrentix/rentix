import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ContasReceberController } from './contas-receber.controller';
import { RelatoriosReceberPublicosController } from './relatorios-receber-publicos.controller';
import { ContasReceberService } from './contas-receber.service';

@Module({
  imports: [PrismaModule],
  controllers: [ContasReceberController, RelatoriosReceberPublicosController],
  providers: [ContasReceberService],
})
export class ContasReceberModule {}
