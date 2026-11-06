import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtGuardAutenticacao } from '../autenticacao/guards/jwt-autenticacao.guard';
import { ToolPermissionGuard } from '../autenticacao/guards/tool-permission.guard';
import {
  RequireToolAction,
  RequireToolPermission,
} from '../autenticacao/decorators/tool-permission.decorator';
import { CurrentUser } from '../autenticacao/decorators/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../autenticacao/types/usuario-autenticado.type';
import { ConfectionsDashboardService } from './confections-dashboard.service';

@Controller('vendas/inicio')
@UseGuards(JwtGuardAutenticacao, ToolPermissionGuard)
@RequireToolPermission('sales')
export class ConfectionsDashboardController {
  constructor(private readonly service: ConfectionsDashboardService) {}
  @Get('resumo')
  @RequireToolAction('view')
  overview(
    @CurrentUser() user: UsuarioAutenticado,
    @Query('cityId') cityId?: string,
    @Query('timeZone') timeZone?: string,
  ) {
    return this.service.overview(user.companyId, cityId, timeZone);
  }
  @Get('cidades')
  @RequireToolAction('view')
  cities(@Query('q') query: string) {
    return this.service.searchCities(query);
  }
  @Get('clima')
  @RequireToolAction('view')
  weather(@Query('cityId') cityId: string) {
    return this.service.weather(cityId);
  }
}
