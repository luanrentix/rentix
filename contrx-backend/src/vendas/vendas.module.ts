import { CaixaController } from './caixa.controller';
import { ManagementReportController } from './management-report.controller';
import { ManagementReportService } from './management-report.service';
import { CaixaService } from './caixa.service';
import {
  SalesCreditsController,
  SalesCreditsService,
} from './creditos.controller';
import { SalesCardsController, SalesCardsService } from './cartoes.controller';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { VendasController } from './vendas.controller';
import { VendasService } from './vendas.service';
import { ConfectionsDashboardService } from './confections-dashboard.service';
import { ConfectionsDashboardController } from './confections-dashboard.controller';

@Module({
  imports: [PrismaModule],
  controllers: [
    ManagementReportController,
    VendasController,
    CaixaController,
    SalesCardsController,
    SalesCreditsController,
    ConfectionsDashboardController,
  ],
  providers: [
    ManagementReportService,
    VendasService,
    CaixaService,
    SalesCardsService,
    SalesCreditsService,
    ConfectionsDashboardService,
  ],
})
export class VendasModule {}
