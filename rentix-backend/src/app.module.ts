import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { EmpresasModule } from './empresas/empresas.module';
import { AutenticacaoModule } from './autenticacao/autenticacao.module';
import { PessoasModule } from './pessoas/pessoas.module';
import { ImoveisModule } from './imoveis/imoveis.module';
import { ContratosModule } from './contratos/contratos.module';
import { ContasReceberModule } from './contas-receber/contas-receber.module';
import { ContasPagarModule } from './contas-pagar/contas-pagar.module';
import { FinanceiroModule } from './financeiro/financeiro.module';
import { SettingsModule } from './settings/settings.module';
import { AgendaModule } from './agenda/agenda.module';
import { PropertyMovementsModule } from './property-movements/property-movements.module';

@Module({
  imports: [
    PrismaModule,
    EmpresasModule,
    AutenticacaoModule,
    PessoasModule,
    ImoveisModule,
    ContratosModule,
    ContasReceberModule,
    ContasPagarModule,
    FinanceiroModule,
    SettingsModule,
    AgendaModule,
    PropertyMovementsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
