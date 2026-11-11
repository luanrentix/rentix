import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../autenticacao/decorators/usuario-atual.decorator';
import { RequireToolPermission } from '../autenticacao/decorators/tool-permission.decorator';
import { JwtGuardAutenticacao } from '../autenticacao/guards/jwt-autenticacao.guard';
import { ToolPermissionGuard } from '../autenticacao/guards/tool-permission.guard';
import type { UsuarioAutenticado } from '../autenticacao/types/usuario-autenticado.type';
import { ManagementReportQuery } from './management-report.dto';
import { ManagementReportService } from './management-report.service';

@Controller('relatorios-gerenciais')
@RequireToolPermission('sales')
@UseGuards(JwtGuardAutenticacao, ToolPermissionGuard)
export class ManagementReportController {
  constructor(private readonly reports: ManagementReportService) {}
  @Get() async catalog(@CurrentUser() user: UsuarioAutenticado) {
    await this.reports.assertRetail(user.companyId);
    return this.reports.catalog(user);
  }
  @Get(':kind') generate(
    @Param('kind') kind: string,
    @Query() query: ManagementReportQuery,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.reports.generate(user, kind, query);
  }
}
