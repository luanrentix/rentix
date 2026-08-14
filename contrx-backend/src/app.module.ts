import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
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
import { AdminModule } from './admin/admin.module';
import { BancosModule } from './bancos/bancos.module';
import { ChamadosModule } from './chamados/chamados.module';
import { FilesModule } from './files/files.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

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
    AdminModule,
    BancosModule,
    ChamadosModule,
    FilesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
